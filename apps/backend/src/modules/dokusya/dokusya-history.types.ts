import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

/**
 * bitemporal 履歴ライタ(dokusya-history.*) の共有型。
 * docs/dokusya-rireki-common-functions.md §2。
 */

/**
 * JST wall-clock として解釈する日付文字列 `'YYYY-MM-DD'`。DATE 列
 * joho_henko_tekiyo_date / dokusya_chushi_date に対応（string alias は意図的・S6564 suppressed）。
 */
export type DateOnly = string;

/** 現 master 行(t_dokusya) のスナップショット。 */
export type DokusyaSnapshot = Dokusya;

/**
 * create/update の対象業務列値（DokusyaRireki プロパティ camelCase キー）。caller が
 * 設定する列のみ present — 取込 UPDATE では Excel 行にある選択列のみ。
 */
export type DokusyaFields = Partial<Record<keyof DokusyaRireki, unknown>>;

/** 変更の発生元（監査ラベル/理由を決める）。 */
export type ApplyChangeSource = 'UI' | 'IMPORT' | 'REPLACE_HANBAITEN' | 'BATCH';

/** create/update/import/replace の単一入口ペイロード。 */
export interface ApplyChangeInput {
  /** `undefined` => CREATE（新 dokusya を INSERT）。 */
  dokusyaId?: number;
  mode: 'CREATE' | 'UPDATE';
  values: DokusyaFields;
  /**
   * 唯一の適用日（読者情報変更適用日）。販売店・支払方法含む全変更に適用され 1更新1レコードで
   * 記録（顧客要件2026-07: 販売店適用日を廃止）。`>= today`。
   */
  johoDate: DateOnly;
  source: ApplyChangeSource;
  /** `created_by`。 */
  actor: string;
  /**
   * {@link ZOUGEN_TRIGGER_FIELDS} 列の変更有無に関わらず全挿入行に zougen_hokoku_flg=true を
   * 強制。Excel 取込で行が配達先データを持つとき使う — 配達先列は標準の増減トリガでないが
   * 顧客はそうした行も報告したい。既定 false。
   */
  forceZougen?: boolean;
}

/**
 * `applyChange` の結果。caller は before/after で監査ログを書き（同一 tx 内）、denshiSync で
 * 電子版システムを commit 後(tx 外)に同期する。
 */
export interface ApplyChangeResult {
  dokusyaId: number;
  insertedRirekiIds: number[];
  /** 変更前の master 状態（CREATE は null）。 */
  before: DokusyaSnapshot | null;
  /** 変更後の master 状態。 */
  after: DokusyaSnapshot;
  /** true => caller は commit 後に電子版システムを同期する。 */
  denshiSync: boolean;
}

/**
 * 適用日付きの分割 event 1件。単一 applyChange が情報 event と/または販売店 event を
 * 生成しうる（適用日昇順・同日は情報→販売店）。
 */
export interface ChangeEvent {
  joho: DateOnly;
  values: DokusyaFields;
}
