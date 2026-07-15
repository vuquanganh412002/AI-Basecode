import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FileDownload } from '@/database/entities/file-download.entity';
import { Ja } from '@/database/entities/ja.entity';
import { StorageService } from '@/modules/storage/storage.service';
import type { SessionPayload } from '@/modules/auth/session.service';
import { compactTimestampJst, todayIsoJst } from '@/common/utils/datetime';

/** ja_id から ja_code を解決できないときの S3 パス用フォールバック。 */
const JA_CODE_FALLBACK = 'unknown';
/** 帳票アーカイブの保管年数（scheduled_delete_date = 今日 + 5年）。 */
const RETENTION_YEARS = 5;

export interface FileArchiveParams {
  /** 生成済みファイルのバイト列（Excel/PDF など）。 */
  buffer: Buffer;
  /** タイムスタンプ・拡張子を除いたファイル名の基底（例: `販売店別購読者名簿_2026年01月`）。 */
  baseName: string;
  /**
   * DB `t_file_download.file_name`（＝ダウンロード時の表示名）に用いる、拡張子を
   * 除いた基底名。省略時は `baseName` と同じ（＝S3キーと同じくタイムスタンプ付き）。
   * 指定時のみ「S3キーは baseName＋タイムスタンプで一意」「DB/DL表示名は displayName
   * でタイムスタンプ無し」に分離する（顧客要件2026-07・SCR-029: 増減通知の表示名を
   * `増減通知_JA名_JAコード_適用日.pdf` に統一しつつ、S3上書きを避ける）。
   */
  displayName?: string;
  /** S3 パスの帳票カテゴリ区分（例: `meibo`）。 */
  category: string;
  /**
   * S3 パスの先頭プレフィックス（既定 `reports`）。空文字を渡すと先頭に
   * `reports/` を付けない（例: SCR-021 は `haitatsuryo/{ja_code}/{year}/`）。
   */
  rootPrefix?: string;
  /**
   * S3 パスのサブフォルダ（例: report_type `hanbaiten` / `kanri_shiten`）。
   * 省略・空文字のときはサブフォルダ区切りを付けない
   * （`reports/{category}/{ja_code}/{year}/`）。
   */
  subFolder?: string;
  /** S3 パスの年セグメント（適用日の年 `YYYY`）。 */
  year: string;
  /** 出力者の所属 JA（NICHINO_* は null）。 */
  jaId: number | null;
  /**
   * S3 パスに用いる ja_code。指定時は内部の jaId→ja_code 解決を省略する
   * （呼び出し側で既に解決済みのとき重複クエリを避ける）。
   */
  jaCode?: string;
  /** 出力者セッション（account_id をアップロード者として記録）。 */
  session: SessionPayload;
  /** 出力件数（明細行数）。 */
  recordCount?: number;
  /** S3 アップロード時の Content-Type（Excel/PDF 等）。 */
  contentType: string;
  /** ファイル名の拡張子（先頭ドット込み。既定 `.xlsx`）。 */
  extension?: string;
  /** ダウンロード種別（m_code DOWNLOAD_TYPE。画面ごとに固定）。 */
  downloadType: number;
  /**
   * 日農ダウンロード許可フラグ（既定 false）。日農担当者(role1/2)がこの
   * ファイルをダウンロードできるか。画面ごとに固定 or 画面で選択。
   */
  nichinoDownloadAllowedFlg?: boolean;
  /** 対象年月（YYYYMM）。無ければ null。 */
  targetMonth?: string | null;
}

/**
 * 帳票出力結果を S3 にアーカイブし、`t_file_upload`（FileUpload）へ登録する
 * 共通サービス。SCR-026 購読者名簿だけでなく、他の帳票出力画面からも再利用できる
 * よう汎用化している（メール送信は行わない）。
 *
 * S3 キー: `reports/{category}/{ja_code}/{subFolder}/{year}/{filename}`
 * （subFolder 省略時は `reports/{category}/{ja_code}/{year}/{filename}`）。
 * ファイル名: `{baseName}_{yyyyMMddHHmmss}{extension}`（タイムスタンプは JST 14桁）。
 *
 * ※ controller へ返すダウンロード用ファイル名（タイムスタンプ無し）とは別物で、
 * 本サービスは S3 保管用にタイムスタンプを付与する。
 */
@Injectable()
export class FileArchiveService {
  private readonly logger = new Logger(FileArchiveService.name);

  constructor(
    @InjectRepository(FileDownload)
    private readonly fileDownloadRepo: Repository<FileDownload>,
    @InjectRepository(Ja)
    private readonly jaRepo: Repository<Ja>,
    private readonly storage: StorageService,
  ) {}

  /**
   * 帳票バッファを S3 へ保存し、`t_file_download` に登録する。ダウンロード画面
   * (SCR-022) はこのレコードを一覧・DL 対象とする。
   * @returns 保存した S3 キーと付与したファイル名。
   */
  async archive(
    params: FileArchiveParams,
  ): Promise<{ key: string; filename: string; fileDownloadId: number }> {
    const now = new Date();
    const extension = params.extension ?? '.xlsx';
    // S3 キー用ファイル名は必ずタイムスタンプ付きで一意にする（同条件の再出力で
    // 既存オブジェクトを上書きしない）。
    const storageFilename = `${params.baseName}_${compactTimestampJst(now)}${extension}`;
    // DB / ダウンロード表示名。displayName 指定時はタイムスタンプ無しの表示名、
    // 省略時は従来どおり S3 と同じタイムスタンプ付き名。
    const displayFilename =
      params.displayName != null
        ? `${params.displayName}${extension}`
        : storageFilename;

    const jaCode = params.jaCode ?? (await this.resolveJa(params.jaId)).code;
    // subFolder 未指定時はサブフォルダ区切りを付けない。
    const subSeg = params.subFolder ? `${params.subFolder}/` : '';
    // rootPrefix 未指定時は `reports`、空文字指定時はプレフィックスなし。
    const root = params.rootPrefix ?? 'reports';
    const rootSeg = root ? `${root}/` : '';
    const key = `${rootSeg}${params.category}/${jaCode}/${subSeg}${params.year}/${storageFilename}`;

    // S3 保存（外部 I/O）を先に完了させてから DB 登録する。
    await this.storage.upload(key, params.buffer, params.contentType);

    const saved = await this.fileDownloadRepo.save(
      this.fileDownloadRepo.create({
        jaId: params.jaId,
        downloadDatetime: now,
        downloadType: params.downloadType,
        scheduledDeleteDate: this.scheduledDeleteDate(),
        nichinoDownloadAllowedFlg: params.nichinoDownloadAllowedFlg ?? false,
        fileName: displayFilename,
        filePath: key,
        fileSize: params.buffer.length,
        recordCount: params.recordCount ?? 0,
        targetMonth: params.targetMonth ?? null,
        createdBy: String(params.session.account_id),
      }),
    );

    this.logger.log({
      event: 'report.archive.completed',
      key,
      fileSize: params.buffer.length,
      recordCount: params.recordCount ?? null,
      downloadType: params.downloadType,
      nichinoDownloadAllowedFlg: params.nichinoDownloadAllowedFlg ?? false,
    });

    // `filename` は表示名（displayName 指定時はタイムスタンプ無し）を返す。
    // メール本文・監査ログ・レスポンスはこの表示名を使う。
    return { key, filename: displayFilename, fileDownloadId: saved.fileDownloadId };
  }

  /**
   * ja_id → ja_code + ja_name を解決する。
   * - jaId が null（NICHINO_*）→ `{ code: 'unknown', name: '' }`
   * - 行が見つからない → `{ code: String(jaId), name: '' }`
   */
  async resolveJa(jaId: number | null): Promise<{ code: string; name: string }> {
    if (jaId == null) return { code: JA_CODE_FALLBACK, name: '' };
    const ja = await this.jaRepo.findOne({
      where: { jaId },
      select: ['jaCode', 'jaName'],
    });
    if (!ja) return { code: String(jaId), name: '' };
    return { code: ja.jaCode, name: ja.jaName ?? '' };
  }

  /**
   * scheduled_delete_date = 今日(JST) + 5年（date-only `YYYY-MM-DD`）。
   * `todayIsoJst()` の JST 当日を UTC 正午基準で年加算し、TZ ずれを避ける。
   */
  private scheduledDeleteDate(): string {
    const d = new Date(`${todayIsoJst()}T00:00:00Z`);
    d.setUTCFullYear(d.getUTCFullYear() + RETENTION_YEARS);
    return d.toISOString().slice(0, 10);
  }
}
