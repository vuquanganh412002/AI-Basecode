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

/**
 * `recomputeMaster` の結果。バッチ（dokusya-apply-due 第2段）が
 * 「業務値が実際に動いた購読者だけ」監査ログ(t_log)を書くために使う。
 *
 * `changedFields` が空でも書き込みが起きたケースはある（ポインタ2列だけの前進）。
 * それは業務変更ではないので監査対象外 — updated_at を動かさないのと同じ理屈。
 */
export interface RecomputeResult {
  /** 業務値として変わった master 列名。空 = 業務変更なし。 */
  changedFields: string[];
  /** 再計算前の master（履歴なし・master 未作成なら null）。 */
  before: DokusyaSnapshot | null;
  /** master へ書き込んだ値。 */
  after: Record<string, unknown>;
}

/**
 * `insertKaiyaku` の結果。解約行を実際に追加したときだけ返る（冪等スキップ時は null）。
 * バッチはこれを見て「本当に解約が確定した購読者」だけ監査ログを書く。
 */
export interface KaiyakuResult {
  /** 追加した解約行の rireki_no。 */
  rirekiNo: number;
  /**
   * 解約反映による master の前/後。監査ログの before/after はこれを使う
   * （target_table = `t_dokusya`）。UI 経由の applyChange も master スナップショットを
   * 記録しているので、t_log 上で「誰が解約したか（UI/バッチ）」以外は同じ形になる。
   */
  master: RecomputeResult;
}

/**
 * `loadCurrentLifecycleEffectiveRow` の結果。
 *
 * `startRirekiNo`（現ライフサイクル起点＝最新の新規行の rireki_no）を一緒に返すのは、
 * 直後に呼ばれる `loadScheduledChushiDate` が同じ値を必要とするため。返さないと
 * 向こうが副問い合わせで同じ探索をやり直し、同一トランザクション内で全く同じ結果を
 * 2度引くことになる。
 */
export interface LifecycleEffective {
  /** 現LCの有効行。`joho <= asOf` が無ければ最新の新規行へフォールバック。履歴なしは null。 */
  row: DokusyaRireki | null;
  /** 現LC起点の rireki_no。`row` が null のときのみ null。 */
  startRirekiNo: number | null;
}
