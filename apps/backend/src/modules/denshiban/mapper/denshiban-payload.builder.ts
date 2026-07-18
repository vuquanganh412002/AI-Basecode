import { DokusyaShubetsu } from '@/common/enums';
import type { Dokusya } from '@/database/entities/dokusya.entity';

/**
 * 電子版 共通API `updateUserInfo` へ送るリクエスト平文（props）を組み立てる
 * 純関数群。DI なし・repo なし・HTTP なし・**時計なし** → オフラインで
 * 100% ユニットテストできる（TDD Pha 1）。
 *
 * 時計に依存する唯一の変換（`payment_start` = 絶対月 → 当月/翌月の2値）は
 * {@link ./denshiban-payment-start} に隔離してある。呼び出し側が
 * `toPaymentStart()` で解決し、{@link BuildCtx.paymentStart} として渡す。
 *
 * 契約は `docs/design-vi/Denshiban-mapper/outbound-field-matrix.md`：
 *   §A   フィールド × モードの行列
 *   §A-2 command 系3モード（cancel / approve / unapprove）の確定シグネチャ
 *   §B   フィールド毎の変換規則
 *   §C   共通4原則
 * **この行列に無いことを推測して足さないこと。**
 *
 * 共通4原則（§C）:
 *   1. 値は全て `String`（数値も）。
 *   2. null / undefined / '' は **キーごと落とす**（'' 送信は「値を消す」と
 *      解釈される恐れがあるため）。必須フィールドだけは空でも載せ、
 *      {@link assertPayload} で落とす。
 *   3. UPDATE は **変わったフィールドだけ**送る（必須フィールドは常に送る）。
 *   4. フィールド間の条件（products は profession=0 のときだけ、等）を破ると
 *      電子版側が該当フィールドの `V**` を返す。
 *
 * `timestamp` はここでは生成しない — キュー滞留で 300 秒を超えると `E05` に
 * なるため、送信直前（`DenshibanApiService.send()`）に打つ。
 */

/** 処理区分（action_kbn）。 */
export type DenshibanMode =
  | 'create'
  | 'update'
  | 'reread'
  | 'cancel'
  | 'approve'
  | 'unapprove';

/** command 系3モード — プロフィールを持たない「指示」だけのモード。 */
export type DenshibanCommandMode = Extract<
  DenshibanMode,
  'cancel' | 'approve' | 'unapprove'
>;

/**
 * `updateUserInfo` の平文ボディ（`timestamp` を除く）。仕様上フィールドは全て
 * String。送らないフィールドは **キーごと存在しない**。
 */
export interface DenshibanPayload {
  action_kbn: DenshibanMode;
  jacd_execute: string;
  [key: string]: string;
}

/**
 * builder が DB を引かずに済むよう、呼び出し側が事前に解決して渡す文脈。
 */
export interface BuildCtx {
  /** 実行JA — 操作者（ログインユーザー）の `m_kanri_shiten.kanri_shiten_code`（10桁）。 */
  jacdExecute: string;
  /** 所属JA — レコード側の `kanri_shiten_code`。update / reread の `jacd` 用。 */
  jacd?: string;
  /** 会員への通知フラグ。update / reread / cancel で必須。既定 '0'（通知しない）。 */
  notifyFlg?: '0' | '1';
  /** 解約月 `YYYYMM` — cancel 専用。過去月は電子版が `P05` を返す。 */
  cancelYm?: string;
  /**
   * 購読開始（0: 当日 / 1: 翌月1日）。create / approve / unapprove で必須。
   * `t_dokusya.dokusya_kaishi_date`（絶対日付）からの変換は時計に依存するため
   * builder では行わない — 呼び出し側が
   * {@link ./denshiban-payment-start#toPaymentStart} で解決して渡す。
   */
  paymentStart?: '0' | '1';
}

/**
 * マッピング不能を表す例外。**握り潰さないこと** — 送れないデータを黙って
 * 落とすと、電子版と cloud が静かに乖離する。呼び出し側（Pha 2 の trigger）が
 * `t_log(ERROR)` に落として運用者に見せる。
 */
export class DenshibanMappingError extends Error {
  constructor(
    /** 原因となった cloud 側の列名（`t_dokusya`）。 */
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'DenshibanMappingError';
  }
}

// ─── コード変換表 ──────────────────────────────────────────────────────────
// cloud は日本語ラベルの CSV を保存し（SCR-011 のチェックボックス）、電子版は
// 数値コードを受け取る。ラベル集合は画面定義 (`DokusyaFormView.vue`
// dokusyaSoBunruiOptions / nogyosyaBunruiOptions) が唯一の出所。

/** 読者属性ラベル → 電子版 `profession`。 */
const PROFESSION_BY_LABEL: Record<string, string> = {
  農業者: '0',
  JAグループ役職員: '1',
  '企業・団体': '2',
  学生: '3',
  その他: '999',
};

/**
 * 主な生産物ラベル → 電子版 `products`。
 *
 * 電子版には `5:酪農` があるが cloud の画面には該当チェックボックスが無い
 * （＝ cloud から 5 は出得ない）。逆写像が要る受信側（将来の Pha）で扱う。
 */
const PRODUCTS_BY_LABEL: Record<string, string> = {
  米: '0',
  野菜: '1',
  果実: '2',
  花: '3',
  畜産: '4',
  その他: '999',
};

/**
 * 性別 cloud(`GENDER`) → 電子版 `sex`。**コードが逆**（cloud 女=2 / 電子版 女=0）。
 * `GENDER` は m_code Group B（TS enum を持たない）ため、変換はこの表に閉じ込める。
 * 未設定・未対応値は '9'（無回答）へ寄せる。
 */
const SEX_BY_GENDER: Record<number, string> = {
  1: '1', // 男
  2: '0', // 女
  9: '9', // 無回答
};
/** 電子版 `sex` の既定値（無回答）。cloud 側が NULL / 未対応値のとき使う。 */
const SEX_UNKNOWN = '9';

/** `profession = 999`（その他）のとき電子版へ送る固定値（仕様書 §2 / QnA 7）。 */
const OTHERS_PROFESSION_VALUE = '会社員';
/** `products` に 999 を含むとき電子版へ送る固定値（仕様書 §2 / QnA 8）。 */
const OTHERS_PRODUCTS_VALUE = 'その他の農畜産物';

/**
 * 職業グループ — 互いに条件で縛られているフィールド群（§B 条件表）。update の
 * 差分でも「1つ変わったら全部送る」= 常に整合したセットで送るために使う。
 */
const PROFESSION_GROUP = [
  'profession',
  'others_profession',
  'products',
  'others_products',
] as const;

/** 備考は remarks1..4 に1行ずつ、5行目以降は remarks5 にまとめる（§B）。 */
const REMARKS_SLOTS = 5;
/** 各 remarks の最大長（仕様: 255文字）。 */
const REMARKS_MAX = 255;

// ─── 単位変換（それぞれ独立にテストする） ─────────────────────────────────

/**
 * 購読者種別 → `subscribe_flg`（紙版の購読有無）。併読 → '1'、電子版のみ → '0'。
 * 種別コードは m_code `DOKUSYA_SHUBETSU`（Group A）の {@link DokusyaShubetsu}。
 */
export function toSubscribeFlg(dokusyaShubetsu: number): string {
  return dokusyaShubetsu === DokusyaShubetsu.BOTH ? '1' : '0';
}

/**
 * 性別 → `sex`。**cloud と電子版でコードが逆**（cloud 女=2 / 電子版 女=0）。
 * 変換は {@link SEX_BY_GENDER} に閉じ込め、未設定・未対応値は {@link SEX_UNKNOWN}。
 */
export function toSex(gender: number | null | undefined): string {
  if (gender === null || gender === undefined) return SEX_UNKNOWN;
  return SEX_BY_GENDER[gender] ?? SEX_UNKNOWN;
}

/** 連絡先1 → `tel`。ハイフンを除去した数字のみ。 */
export function toTel(renrakusaki1: string): string {
  return (renrakusaki1 ?? '').replace(/-/g, '');
}

/**
 * 備考 → `remarks1`〜`remarks5`。1〜4行目は各スロットへ、**5行目以降は改行込みで
 * remarks5 にまとめる**（行が消えないように）。各スロット 255 文字で切る。
 * 空行・空文字のスロットはキーごと落とす。
 */
export function toRemarks(biko: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!biko) return out;

  const lines = biko.split('\n');
  const head = lines.slice(0, REMARKS_SLOTS - 1);
  const tail = lines.slice(REMARKS_SLOTS - 1).join('\n');

  head.forEach((line, i) => {
    if (line !== '') out[`remarks${i + 1}`] = line.slice(0, REMARKS_MAX);
  });
  if (tail !== '') out[`remarks${REMARKS_SLOTS}`] = tail.slice(0, REMARKS_MAX);
  return out;
}

/**
 * 読者属性 CSV → `profession`（+ その他なら `others_profession`）。
 *
 * ⚠️ **カーディナリティ不整合**（行列 §D-1）: cloud は複数選択可、電子版は
 * 単一値。2つ以上選ばれていたら **投げる** — 先頭だけ送ると残りが黙って
 * 消える。UI 側で電子版読者は1つだけ選ばせる想定（§D の案 (a)）。
 */
export function toProfession(dokusyasoBunrui: string): Record<string, string> {
  const labels = splitCsv(dokusyasoBunrui);

  if (labels.length === 0) {
    throw new DenshibanMappingError(
      'dokusyaso_bunrui',
      '読者属性が未選択です。電子版の profession は必須のため同期できません。',
    );
  }
  if (labels.length > 1) {
    throw new DenshibanMappingError(
      'dokusyaso_bunrui',
      `読者属性が複数選択されています（${labels.join('・')}）。電子版の profession は単一値のみ受け付けます。`,
    );
  }

  const label = labels[0];
  const code = PROFESSION_BY_LABEL[label];
  if (code === undefined) {
    throw new DenshibanMappingError(
      'dokusyaso_bunrui',
      `読者属性「${label}」は電子版の profession に対応しません。`,
    );
  }

  const out: Record<string, string> = { profession: code };
  if (code === '999') out.others_profession = OTHERS_PROFESSION_VALUE;
  return out;
}

/**
 * 主な生産物 CSV → `products`（+ その他なら `others_products`）。
 *
 * `products` は電子版でも **複数値可**（カンマ区切り）— profession と違い
 * カーディナリティ問題は無い。`profession = 0`（農業者）以外では送れないので
 * 呼び出し側が判定する（この関数は変換だけ）。
 */
export function toProducts(nogyosyaBunrui: string): Record<string, string> {
  const labels = splitCsv(nogyosyaBunrui);
  if (labels.length === 0) return {};

  const codes = labels.map((label) => {
    const code = PRODUCTS_BY_LABEL[label];
    if (code === undefined) {
      throw new DenshibanMappingError(
        'nogyosya_bunrui',
        `主な生産物「${label}」は電子版の products に対応しません。`,
      );
    }
    return code;
  });

  const out: Record<string, string> = { products: codes.join(',') };
  if (codes.includes('999')) out.others_products = OTHERS_PRODUCTS_VALUE;
  return out;
}

/** CSV を trim + 空要素除去して配列に。 */
function splitCsv(csv: string): string[] {
  return (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

// ─── プロフィール（create / update 共通） ─────────────────────────────────

/**
 * 購読者1件から、プロフィール系フィールドを全て組み立てる（キー欠落ルール適用済み）。
 * create はこれをそのまま、update は before と差分を取ってから使う。
 */
function buildProfileFields(d: Dokusya): Record<string, string> {
  const out: Record<string, string> = {};

  // 必須系 — 空でも載せて assertPayload で落とす（黙って欠落させない）。
  out.first_name = d.shimeiSei ?? '';
  out.last_name = d.shimeiMei ?? '';
  // カナは変換しない（仕様書どおり素通し）。
  out.first_kana = d.shimeiKanaSei ?? '';
  out.last_kana = d.shimeiKanaMei ?? '';
  out.zip = d.yubinNo ?? '';
  // 都道府県コードは '01' のまま送る（0 落としをしない）— 往復で値が変わらない。
  out.pref_id = d.todofukenCode ?? '';
  // 名前がねじれている: addr ← 市町村郡 / city ← 丁目番地。
  out.addr = d.shikuchoson ?? '';
  out.city = d.chomeBanchi ?? '';
  out.tel = toTel(d.renrakusaki1);
  out.email = d.email ?? '';
  out.subscribe_flg = toSubscribeFlg(d.dokusyaShubetsu);
  out.melmaga = String(d.mailMagazineFlg ?? 0);

  // 任意系 — 空はキーごと落とす。
  put(out, 'building', d.tatemonoMei);
  put(out, 'birthyear', d.birthYear === null ? '' : String(d.birthYear ?? ''));
  put(out, 'sex', toSex(d.gender));
  Object.assign(out, toRemarks(d.biko ?? ''));

  // `branch` は cloud 側に出所が無い（電子版読者の shiten_id は NULL）。任意
  // フィールドなので送らない（行列 §D-2 / QnA 9 待ち）。
  // `profession_and_ja` / `profession_and_agri` も cloud に対応列が無いため
  // 送らない（§D-3 / QnA 10 待ち）。

  const profession = toProfession(d.dokusyasoBunrui ?? '');
  Object.assign(out, profession);

  // products は profession = 0（農業者）のときだけ送れる（§B 条件表）。
  if (profession.profession === '0') {
    Object.assign(out, toProducts(d.nogyosyaBunrui ?? ''));
  }

  return out;
}

/** null / undefined / '' はキーごと落とす（§C-2）。 */
function put(
  target: Record<string, string>,
  key: string,
  value: string | null | undefined,
): void {
  if (value === null || value === undefined || value === '') return;
  target[key] = value;
}

// ─── モード別ビルダー ─────────────────────────────────────────────────────

/**
 * create — 全プロフィール + `payment_start`。`id` / `jacd` / `notify_flg` は **無い**。
 *
 * @throws {DenshibanMappingError} 読者属性の未選択・複数選択など、電子版で
 *   表現できない値のとき。`ctx.paymentStart` 未指定のときも投げる。
 */
export function buildCreatePayload(d: Dokusya, ctx: BuildCtx): DenshibanPayload {
  return {
    action_kbn: 'create',
    jacd_execute: ctx.jacdExecute,
    ...buildProfileFields(d),
    payment_start: requirePaymentStart(ctx, 'create'),
  };
}

/**
 * update / reread — **変わったフィールドだけ** + 必須フィールド
 * （`action_kbn` / `jacd_execute` / `id` / `notify_flg`）。`payment_start` は
 * update 系には無い。
 *
 * 差分は「組み立て後の電子版フィールド」で取る（cloud 列で取らない）。備考の
 * ように 1 列 → 複数フィールドへ展開されるものがあり、列単位では対応が付かない。
 *
 * ⚠️ 既知の制約: 任意フィールドを **空にした**変更（例: 建物名を消した）は
 * §C-2（'' はキーごと落とす）により送れない。'' が電子版で「値の削除」と解釈
 * されるか未確認のため、行列の規則に従って送らない。QnA 待ち。
 */
export function buildUpdatePayload(
  before: Dokusya,
  after: Dokusya,
  ctx: BuildCtx,
  mode: 'update' | 'reread',
): DenshibanPayload {
  const beforeFields = buildProfileFields(before);
  const afterFields = buildProfileFields(after);

  const changed: Record<string, string> = {};
  for (const [key, value] of Object.entries(afterFields)) {
    if (beforeFields[key] !== value) changed[key] = value;
  }

  // 職業グループは **まとめて送る**。`products` は `profession=0` のときしか
  // 送れない（§B 条件表）ので、生産物だけ変わって profession が差分から落ちると
  // 「profession 無しの products」= 条件違反のペイロードになってしまう。
  if (PROFESSION_GROUP.some((key) => key in changed)) {
    for (const key of PROFESSION_GROUP) {
      if (afterFields[key] !== undefined) changed[key] = afterFields[key];
    }
  }

  const payload: DenshibanPayload = {
    action_kbn: mode,
    jacd_execute: ctx.jacdExecute,
    id: requireKaiinId(after),
    notify_flg: ctx.notifyFlg ?? '0',
    ...changed,
  };
  // 所属JA（レコード側）— JA 間の移管時に使う。任意フィールド。
  put(payload, 'jacd', ctx.jacd);
  return payload;
}

/**
 * cancel / approve / unapprove — プロフィールを持たない「指示」モード。
 * 確定シグネチャは行列 §A-2（全フィールド必須）:
 *
 * | mode      | フィールド                                                    |
 * |-----------|---------------------------------------------------------------|
 * | cancel    | action_kbn, jacd_execute, id, cancel_ym, notify_flg            |
 * | approve   | action_kbn, jacd_execute, id, payment_start                    |
 * | unapprove | action_kbn, jacd_execute, id, payment_start                    |
 *
 * 3モードで **フィールド集合が違う**（cancel に payment_start は無く、
 * approve / unapprove に notify_flg は無い）ので mode で分岐して丸ごと返す。
 * `unapprove` にも payment_start が要るのは API 側の仕様（業務的には不自然だが
 * 省くと `V**` になる）。
 */
export function buildCommandPayload(
  d: Dokusya,
  ctx: BuildCtx,
  mode: DenshibanCommandMode,
): DenshibanPayload {
  const base = {
    action_kbn: mode,
    jacd_execute: ctx.jacdExecute,
    id: requireKaiinId(d),
  };

  if (mode === 'cancel') {
    if (!ctx.cancelYm) {
      throw new DenshibanMappingError(
        'cancel_ym',
        '解約月 (cancel_ym) が指定されていません。cancel モードでは必須です。',
      );
    }
    return { ...base, cancel_ym: ctx.cancelYm, notify_flg: ctx.notifyFlg ?? '0' };
  }

  // approve / unapprove — 両方とも payment_start が必須。
  return { ...base, payment_start: requirePaymentStart(ctx, mode) };
}

/**
 * `ctx.paymentStart` を返す。未指定なら投げる。
 *
 * 絶対月 → 2値の変換は時計依存なので builder では行わない（`toPaymentStart()`
 * を呼び出し側で使う）。ここは「渡し忘れ」を静かに落とさないためのガード。
 */
function requirePaymentStart(ctx: BuildCtx, mode: DenshibanMode): '0' | '1' {
  if (ctx.paymentStart === undefined) {
    throw new DenshibanMappingError(
      'dokusya_kaishi_date',
      `payment_start が未指定です。${mode} モードでは必須です（toPaymentStart() で解決して BuildCtx に渡してください）。`,
    );
  }
  return ctx.paymentStart;
}

/** 電子版会員ID を文字列で返す。未同期（NULL）なら投げる。 */
function requireKaiinId(d: Dokusya): string {
  if (d.denshiKaiinId === null || d.denshiKaiinId === undefined) {
    throw new DenshibanMappingError(
      'denshi_kaiin_id',
      '電子版会員IDが未設定です（未同期）。先に create で会員IDを採番してください。',
    );
  }
  return String(d.denshiKaiinId);
}
