import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

/**
 * Narrow a raw `getRawMany()` column (always scalar at runtime) to a
 * primitive so String() can't hit the `[object Object]` path. The
 * assertion is required — the `string | number` receiver does not accept
 * `unknown` without it.
 */
function asScalar(value: unknown): string | number {
  return value as string | number;
}

/**
 * 増減報告・前回値 (zenkai_*) 判定に必要な最小フィールド集合。Dokusya / DokusyaRireki
 * の両方が構造的に満たすため、UI 更新フロー（before/after = Dokusya）と
 * 取込フロー（before = DokusyaRireki, after = Dokusya）で同じ判定ロジックを共有できる。
 */
interface ZougenComparable {
  haitatsuSameFlg: boolean;
  yubinNo: string | null;
  todofukenCode: string | null;
  shikuchoson: string | null;
  chomeBanchi: string | null;
  tatemonoMei: string | null;
  haitatsuYubinNo: string | null;
  haitatsuTodofukenCode: string | null;
  haitatsuShikuchoson: string | null;
  haitatsuChomeBanchi: string | null;
  haitatsuTatemonoMei: string | null;
  dokusyaBusu: number;
  hanbaitenId: number;
}

/**
 * 履歴(t_dokusya_rireki)書込みの共有プリミティブを集約したリーフサービス。
 *
 * UI 登録/更新フロー（DokusyaService）と Excel取込フロー（DokusyaImportService）の
 * 両方が同一の履歴生成ロジックを使う必要があるため、ここに切り出して両サービスへ
 * inject する（step C 分割）。これにより step B で導入した facade↔取込の
 * `forwardRef` 循環依存を解消する。
 *
 * 本サービスは constructor 注入を持たない — 全メソッドは呼び出し側から渡される
 * `manager: EntityManager` 経由でリポジトリを操作する純粋ロジックのため。
 */
@Injectable()
export class DokusyaRirekiService {
  /**
   * Acquire a `FOR UPDATE` row lock on the master `t_dokusya` row inside
   * the open transaction. Serializes concurrent UPDATE / approve / reject
   * of the SAME 購読者 so two callers can't both read `MAX(rireki_no)` and
   * INSERT the same history `rireki_no` (which would hit the
   * `(dokusya_id, rireki_no)` unique constraint and surface as a 500).
   * The locked row itself isn't read back — only its lock matters.
   */
  /**
   * 取込（DokusyaImportService.writeRirekiSnapshot）と UI 更新フローで共有する
   * ため public。purposeは UI と同一の行ロック直列化。
   */
  async lockDokusyaRow(
    manager: EntityManager,
    dokusyaId: number,
  ): Promise<void> {
    await manager.findOne(Dokusya, {
      where: { dokusyaId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /**
   * Compute the next `rireki_no` inside the open transaction so two
   * concurrent UPDATEs can't end up with the same number. pg-mem +
   * the integration spec build a single QB and read `new_rireki_no`.
   */
  async nextRirekiNo(
    manager: EntityManager,
    dokusyaId: number,
  ): Promise<number> {
    // Use the `createQueryBuilder(entity, alias)` overload (skips the
    // chained `.from()` call) so the unit-test mock for
    // `txManager.createQueryBuilder` — a single `getRawOne` returning
    // `{ new_rireki_no: 2 }` — receives the call without needing a
    // `.from()` method on the qb shape.
    const row = await manager
      .createQueryBuilder(DokusyaRireki, 'r')
      .select('COALESCE(MAX(rireki_no), 0) + 1', 'new_rireki_no')
      .where('r.dokusya_id = :dokusya_id', { dokusya_id: dokusyaId })
      .getRawOne<{ new_rireki_no: number | string }>();
    return Number(row?.new_rireki_no ?? 1);
  }

  /**
   * Copy every column from the just-saved master row into a new
   * `t_dokusya_rireki` row, then layer the history-only metadata
   * (rireki_no, flags, henko_riyu) on top. Keeps the history a faithful
   * snapshot without burning a roundtrip on a second SELECT.
   *
   * NOTE: the bulk `replaceHanbaiten` flow builds the SAME rireki snapshot
   * via a raw `INSERT ... SELECT` (it processes many rows at once and can't
   * pass one entity here). When `t_dokusya_rireki` gains/loses a column,
   * update BOTH this mapper AND that INSERT column list — keep them in sync.
   */
  buildHistoryFromEntity(
    saved: Dokusya,
    metadata: {
      rirekiNo: number;
      henkoRiyu: string;
      saishinDataFlg: boolean;
      shinkiFlg: boolean;
      kaiyakuFlg: boolean;
      /**
       * 増減報告フラグ（正準仕様: docs/requirement/change_notification_concept.md
       *「購読者登録のレコードの考え方」の例示テーブル）。UPDATE 時は
       * dokusya_busu / hanbaiten_id / 住所5項目 (haitatsu_same_flg で
       * 購読者住所⇔配達先住所を切替) のいずれかが変わったときのみ true。
       * 口座情報のみ等それ以外の変更は false（同ドキュメント 口座情報変更例=0）。
       * CREATE / 承認 / 一括置換は true。呼び出し側で算出して渡す。
       */
      zougenHokokuFlg: boolean;
      createdBy: string;
    },
  ): Partial<DokusyaRireki> {
    return {
      dokusyaId: Number(saved.dokusyaId),
      rirekiNo: metadata.rirekiNo,
      jaId: Number(saved.jaId),
      kanriShitenId: Number(saved.kanriShitenId),
      shitenId: Number(saved.shitenId),
      kumiaiinCode: saved.kumiaiinCode ?? '',
      dokusyaShubetsu: Number(saved.dokusyaShubetsu),
      tetsuzukiShurui: Number(saved.tetsuzukiShurui),
      denshiDokusyaShubetsu: saved.denshiDokusyaShubetsu ?? null,
      shimeiSei: saved.shimeiSei,
      shimeiMei: saved.shimeiMei,
      shimeiKanaSei: saved.shimeiKanaSei,
      shimeiKanaMei: saved.shimeiKanaMei,
      dokusyaBusu: Number(saved.dokusyaBusu),
      yubinNo: saved.yubinNo,
      todofukenCode: saved.todofukenCode,
      shikuchoson: saved.shikuchoson,
      chomeBanchi: saved.chomeBanchi,
      tatemonoMei: saved.tatemonoMei ?? '',
      renrakusaki1: saved.renrakusaki1,
      renrakusaki2: saved.renrakusaki2 ?? '',
      email: saved.email ?? '',
      mailMagazineFlg: Number(saved.mailMagazineFlg ?? 0),
      birthYear: saved.birthYear ?? null,
      gender: saved.gender ?? null,
      haitatsuSameFlg: Boolean(saved.haitatsuSameFlg),
      haitatsuYubinNo: saved.haitatsuYubinNo ?? '',
      haitatsuTodofukenCode: saved.haitatsuTodofukenCode ?? '',
      haitatsuShikuchoson: saved.haitatsuShikuchoson ?? '',
      haitatsuChomeBanchi: saved.haitatsuChomeBanchi ?? '',
      haitatsuTatemonoMei: saved.haitatsuTatemonoMei ?? '',
      haitatsuRenrakusaki1: saved.haitatsuRenrakusaki1 ?? '',
      haitatsuRenrakusaki2: saved.haitatsuRenrakusaki2 ?? '',
      haitatsuShimeiSei: saved.haitatsuShimeiSei ?? '',
      haitatsuShimeiMei: saved.haitatsuShimeiMei ?? '',
      haitatsuShimeiKanaSei: saved.haitatsuShimeiKanaSei ?? '',
      haitatsuShimeiKanaMei: saved.haitatsuShimeiKanaMei ?? '',
      hanbaitenId: Number(saved.hanbaitenId),
      tankaId: Number(saved.tankaId),
      yubinKubun: saved.yubinKubun ?? '0',
      shiharaiHoho: Number(saved.shiharaiHoho),
      dokusyaryoShiharaiCycle: saved.dokusyaryoShiharaiCycle ?? null,
      bankBranchCode: saved.bankBranchCode ?? '',
      bankBranchName: saved.bankBranchName ?? '',
      hikiotoshiYokinShubetsu: saved.hikiotoshiYokinShubetsu ?? null,
      hikiotoshiKozaNo: saved.hikiotoshiKozaNo ?? '',
      hikiotoshiKozaMeigi: saved.hikiotoshiKozaMeigi ?? '',
      dokusyasoBunrui: saved.dokusyasoBunrui ?? '',
      nogyosyaBunrui: saved.nogyosyaBunrui ?? '',
      shokiDokusyaKaishiDate: saved.shokiDokusyaKaishiDate ?? '',
      dokusyaKaishiDate: saved.dokusyaKaishiDate,
      dokusyaChushiDate: saved.dokusyaChushiDate ?? null,
      johoHenkoTekiyoDate: saved.johoHenkoTekiyoDate ?? null,
      seikyuKaishiMonth: saved.seikyuKaishiMonth ?? '',
      biko: saved.biko ?? '',
      henkoRiyu: metadata.henkoRiyu,
      saishinDataFlg: metadata.saishinDataFlg,
      shinkiFlg: metadata.shinkiFlg,
      kaiyakuFlg: metadata.kaiyakuFlg,
      zougenHokokuFlg: metadata.zougenHokokuFlg,
      denshiShoninStatus: saved.denshiShoninStatus ?? null,
      createdBy: metadata.createdBy,
    };
  }

  /**
   * 住所5項目の [zenkai 列, 前回値(old), 新値(new)] ペアを返す。
   * `haitatsu_same_flg` で 購読者住所 / 配達先住所 を切替える。
   *   true  → 購読者住所 (yubin_no / todofuken_code / shikuchoson /
   *           chome_banchi / tatemono_mei)
   *   false → 配達先住所 (haitatsu_yubin_no / … / haitatsu_tatemono_mei)
   */
  private addressZenkaiPairs(
    before: ZougenComparable,
    after: ZougenComparable,
  ): Array<[keyof DokusyaRireki, string, string]> {
    const str = (v: unknown): string => (v == null ? '' : String(asScalar(v)));
    // 切替は after（保存後）の haitatsu_same_flg を基準にする。UI は after を
    // before + dto から合成するため dto.haitatsu_same_flg と一致する。
    return after.haitatsuSameFlg
      ? [
          ['zenkaiYubinNo', str(before.yubinNo), str(after.yubinNo)],
          ['zenkaiTodofukenCode', str(before.todofukenCode), str(after.todofukenCode)],
          ['zenkaiShikuchoson', str(before.shikuchoson), str(after.shikuchoson)],
          ['zenkaiChomeBanchi', str(before.chomeBanchi), str(after.chomeBanchi)],
          ['zenkaiTatemonoMei', str(before.tatemonoMei), str(after.tatemonoMei)],
        ]
      : [
          ['zenkaiYubinNo', str(before.haitatsuYubinNo), str(after.haitatsuYubinNo)],
          ['zenkaiTodofukenCode', str(before.haitatsuTodofukenCode), str(after.haitatsuTodofukenCode)],
          ['zenkaiShikuchoson', str(before.haitatsuShikuchoson), str(after.haitatsuShikuchoson)],
          ['zenkaiChomeBanchi', str(before.haitatsuChomeBanchi), str(after.haitatsuChomeBanchi)],
          ['zenkaiTatemonoMei', str(before.haitatsuTatemonoMei), str(after.haitatsuTatemonoMei)],
        ];
  }

  /**
   * 増減報告フラグ判定 — 購読部数 / 販売店 / 住所5項目（same_flg 別）の
   * いずれかが実際に変わったときのみ true（正準仕様:
   * docs/requirement/change_notification_concept.md）。zenkai_* の保存有無
   * とは独立に「変更が起きたか」だけを見る（同 flg=true で住所無変更でも
   * zenkai_* は退避するが、その場合 増減報告は立てない）。
   * 購読部数・販売店は 解約強制0 等の補正後の実保存値 (after) で比較する。
   */
  private hasZougenReportableChange(
    before: ZougenComparable,
    after: ZougenComparable,
  ): boolean {
    const addressChanged = this.addressZenkaiPairs(before, after).some(
      ([, oldVal, newVal]) => oldVal !== newVal,
    );
    const busuChanged = Number(after.dokusyaBusu) !== Number(before.dokusyaBusu);
    const hanbaitenChanged =
      Number(after.hanbaitenId) !== Number(before.hanbaitenId);
    return addressChanged || busuChanged || hanbaitenChanged;
  }

  /**
   * 前回値スナップショット (UPDATE 時) — 新しい rireki 行(rg)の zenkai_* に、
   * 更新前の t_dokusya レコード(rd = before)の値を **変更有無に関わらず常に**
   * 退避する（顧客要件）。
   *
   *   rg.zenkai_dokusya_busu = rd.dokusya_busu
   *   rg.zenkai_hanbaiten_id = rd.hanbaiten_id
   *   rg.zenkai_yubin_no       = rd.haitatsu_same_flg ? rd.yubin_no       : rd.haitatsu_yubin_no
   *   rg.zenkai_todofuken_code = rd.haitatsu_same_flg ? rd.todofuken_code : rd.haitatsu_todofuken_code
   *   rg.zenkai_shikuchoson    = rd.haitatsu_same_flg ? rd.shikuchoson    : rd.haitatsu_shikuchoson
   *   rg.zenkai_chome_banchi   = rd.haitatsu_same_flg ? rd.chome_banchi   : rd.haitatsu_chome_banchi
   *   rg.zenkai_tatemono_mei   = rd.haitatsu_same_flg ? rd.tatemono_mei   : rd.haitatsu_tatemono_mei
   *
   * 住所5項目の退避元グループは **rd（更新前レコード）の haitatsu_same_flg** で
   * 選択する（after ではない）。増減報告フラグは {@link hasZougenReportableChange}
   * で別途判定する（zenkai の退避とは独立）。
   */
  private buildZenkaiSnapshot(before: ZougenComparable): Partial<DokusyaRireki> {
    const str = (v: unknown): string => (v == null ? '' : String(asScalar(v)));
    // 退避先住所は更新前レコード(rd)の haitatsu_same_flg で選択する。
    const useSubscriberAddr = Boolean(before.haitatsuSameFlg);
    return {
      zenkaiDokusyaBusu: Number(before.dokusyaBusu),
      zenkaiHanbaitenId: Number(before.hanbaitenId),
      zenkaiYubinNo: useSubscriberAddr
        ? str(before.yubinNo)
        : str(before.haitatsuYubinNo),
      zenkaiTodofukenCode: useSubscriberAddr
        ? str(before.todofukenCode)
        : str(before.haitatsuTodofukenCode),
      zenkaiShikuchoson: useSubscriberAddr
        ? str(before.shikuchoson)
        : str(before.haitatsuShikuchoson),
      zenkaiChomeBanchi: useSubscriberAddr
        ? str(before.chomeBanchi)
        : str(before.haitatsuChomeBanchi),
      zenkaiTatemonoMei: useSubscriberAddr
        ? str(before.tatemonoMei)
        : str(before.haitatsuTatemonoMei),
    };
  }

  /**
   * 履歴(t_dokusya_rireki) 1行ぶんのカラム値を組み立てる共通ビルダー。
   * 登録(create) / 更新・取込(writeRirekiSplit) / 販売店一括置換(replace) の
   * 3経路すべてがこのビルダーで行を生成し、列の作り方を一元化する
   * （顧客要件 2026-06: rireki の作り方を完全に同期させ、経路ごとの乖離を防ぐ）。
   *
   * - 列値は {@link buildHistoryFromEntity}（curState から）。
   * - `prevState` があれば {@link buildZenkaiSnapshot} の zenkai_* を上乗せ。
   * - `extra` で各経路固有の上書き（イベント別の適用日、一括置換の
   *   zenkai_hanbaiten_id 等）。**undefined のキーは展開しない**ので、
   *   呼び出し側が明示した列だけが上書きされ、未指定の列は entity 由来値を保つ。
   *
   * 経路ごとの差異（create は kaiyaku_flg を立てうる／取込・更新は立てない、
   * replace は henko_riyu='販売店一括置換'・zenkai_hanbaiten_id を上乗せ 等）は
   * 全て引数で表現する。挙動は従来の各インライン構築と byte-identical。
   */
  buildRirekiRow(
    curState: Dokusya,
    prevState: Dokusya | null,
    metadata: {
      rirekiNo: number;
      henkoRiyu: string;
      saishinDataFlg: boolean;
      shinkiFlg: boolean;
      kaiyakuFlg: boolean;
      zougenHokokuFlg: boolean;
      createdBy: string;
    },
    extra: {
      hanbaitenTekiyoDate?: string | null;
      johoHenkoTekiyoDate?: string | null;
      zenkaiHanbaitenId?: number;
    } = {},
  ): Partial<DokusyaRireki> {
    return {
      ...this.buildHistoryFromEntity(curState, metadata),
      ...(prevState ? this.buildZenkaiSnapshot(prevState) : {}),
      ...(extra.zenkaiHanbaitenId === undefined
        ? {}
        : { zenkaiHanbaitenId: extra.zenkaiHanbaitenId }),
      ...(extra.hanbaitenTekiyoDate === undefined
        ? {}
        : { hanbaitenTekiyoDate: extra.hanbaitenTekiyoDate }),
      ...(extra.johoHenkoTekiyoDate === undefined
        ? {}
        : { johoHenkoTekiyoDate: extra.johoHenkoTekiyoDate }),
    };
  }

  /**
   * 履歴(t_dokusya_rireki)を「変更イベント」単位で書き込む共通ヘルパー（顧客要件
   * 2026-06）。UI 編集(update) と Excel取込(UPDATE_ALL/UPDATE_PARTIAL) の両方から
   * 呼び、履歴の作り方を完全に同期させる。
   *
   * - `before=null`（NEW 取込）: 1件。販売店適用日なし、joho_henko=情報変更日。
   * - 情報のみ変更        : 1件。hanbaiten_tekiyo=NULL, joho_henko=情報変更日。
   * - 販売店のみ変更      : 1件。hanbaiten_tekiyo=joho_henko=販売店適用日。
   * - 情報＋販売店 同時変更: **2件に分割**。適用日が早いイベントを先（rireki_no 小）、
   *   遅い方を後＋saishin_data_flg=true。同日は 情報→販売店 の順。各レコードの
   *   zenkai_* / 増減報告フラグは直前状態との差分で算出する。
   *
   * 戻り値 = 使用した最大 rireki_no（呼び出し側が master.rireki_no 同期に使う）。
   */
  async writeRirekiSplit(
    manager: EntityManager,
    before: Dokusya | null,
    after: Dokusya,
    startRirekiNo: number,
    opts: {
      createdBy: string;
      henkoRiyu: string;
      shinkiFlg: boolean;
      hanbaitenDate: string | null;
      johoDate: string | null;
      forceZougenHokoku?: boolean;
    },
  ): Promise<number> {
    const saveOne = async (
      prevState: Dokusya | null,
      curState: Dokusya,
      rirekiNo: number,
      saishin: boolean,
      hanbaitenTekiyoDate: string | null,
      johoHenkoTekiyoDate: string | null,
      shinkiFlg: boolean,
    ): Promise<void> => {
      const zougenHokokuFlg = prevState
        ? this.hasZougenReportableChange(prevState, curState) ||
          Boolean(opts.forceZougenHokoku)
        : true;
      await manager.save(
        DokusyaRireki,
        manager.create(
          DokusyaRireki,
          this.buildRirekiRow(
            curState,
            prevState,
            {
              rirekiNo,
              henkoRiyu: opts.henkoRiyu,
              saishinDataFlg: saishin,
              shinkiFlg,
              // 解約ステータスは取込/更新では立てない（顧客要件 2026-06。バッチ処理）。
              kaiyakuFlg: false,
              zougenHokokuFlg,
              createdBy: opts.createdBy,
            },
            { hanbaitenTekiyoDate, johoHenkoTekiyoDate },
          ),
        ),
      );
    };

    // NEW（before 無し）— 1件。販売店イベントは無く、情報変更日のみ記録。
    if (!before) {
      await saveOne(
        null,
        after,
        startRirekiNo,
        true,
        null,
        opts.johoDate,
        opts.shinkiFlg,
      );
      return startRirekiNo;
    }

    const storeChanged =
      Number(after.hanbaitenId) !== Number(before.hanbaitenId);
    const addressChanged = this.addressZenkaiPairs(before, after).some(
      ([, oldVal, newVal]) => oldVal !== newVal,
    );
    const busuChanged =
      Number(after.dokusyaBusu) !== Number(before.dokusyaBusu);
    const infoChanged = addressChanged || busuChanged;

    if (storeChanged && infoChanged) {
      const afterInfoOnly: Dokusya = {
        ...after,
        hanbaitenId: Number(before.hanbaitenId),
      };
      const afterStoreOnly: Dokusya = {
        ...before,
        hanbaitenId: Number(after.hanbaitenId),
      };
      const storeFirst =
        opts.hanbaitenDate != null &&
        opts.johoDate != null &&
        opts.hanbaitenDate < opts.johoDate;
      if (storeFirst) {
        // 販売店適用日 < 情報変更日: 販売店イベント → 情報イベント
        await saveOne(
          before,
          afterStoreOnly,
          startRirekiNo,
          false,
          opts.hanbaitenDate,
          opts.hanbaitenDate,
          false,
        );
        await saveOne(
          afterStoreOnly,
          after,
          startRirekiNo + 1,
          true,
          null,
          opts.johoDate,
          false,
        );
      } else {
        // 情報変更日 <= 販売店適用日（同日含む）: 情報イベント → 販売店イベント
        await saveOne(
          before,
          afterInfoOnly,
          startRirekiNo,
          false,
          null,
          opts.johoDate,
          false,
        );
        await saveOne(
          afterInfoOnly,
          after,
          startRirekiNo + 1,
          true,
          opts.hanbaitenDate,
          opts.hanbaitenDate,
          false,
        );
      }
      return startRirekiNo + 1;
    }

    if (storeChanged) {
      // 販売店のみ変更: hanbaiten_tekiyo = joho_henko = 販売店適用日。
      await saveOne(
        before,
        after,
        startRirekiNo,
        true,
        opts.hanbaitenDate,
        opts.hanbaitenDate,
        false,
      );
      return startRirekiNo;
    }

    // 情報のみ変更（口座等のみ含む）: hanbaiten_tekiyo=NULL, joho_henko=情報変更日。
    await saveOne(before, after, startRirekiNo, true, null, opts.johoDate, false);
    return startRirekiNo;
  }
}
