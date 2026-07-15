import {
  type DenshibanPayload,
  DenshibanMappingError,
} from './denshiban-payload.builder';

/**
 * 送信直前の平文ペイロードを **cloud 側で** 検証する。
 *
 * 契約は `docs/design-vi/Denshiban-mapper/outbound-field-matrix.md` §B の
 * 「Validation」列 = 電子版が `V01`〜`V35` を返す条件そのもの。ここで落として
 * おかないと、エラーに気付くのはジョブがキューに入った後 — 利用者はとっくに
 * 画面を離れている。**電子版に判定させず、cloud で先に落とす。**
 *
 * `timestamp` はここでは見ない（送信直前に `send()` が打つため、この時点では
 * まだ存在しない）。
 */

/** 各フィールドの検査規則。`test` が false を返したら `message` で落とす。 */
interface FieldRule {
  test: (value: string) => boolean;
  message: string;
}

const digits = (max: number): FieldRule => ({
  test: (v) => new RegExp(`^\\d{1,${max}}$`).test(v),
  message: `半角数字${max}桁以内で入力してください。`,
});

const exactDigits = (n: number): FieldRule => ({
  test: (v) => new RegExp(`^\\d{${n}}$`).test(v),
  message: `半角数字${n}桁で入力してください。`,
});

const maxLength = (n: number): FieldRule => ({
  test: (v) => [...v].length <= n,
  message: `${n}文字以内で入力してください。`,
});

const oneOf = (...allowed: string[]): FieldRule => ({
  test: (v) => allowed.includes(v),
  message: `${allowed.join(' / ')} のいずれかで入力してください。`,
});

/** 電子版フィールド名 → 検査規則（行列 §B の Validation 列）。 */
const RULES: Record<string, FieldRule> = {
  action_kbn: oneOf(
    'create',
    'update',
    'reread',
    'cancel',
    'approve',
    'unapprove',
  ),
  jacd_execute: exactDigits(10),
  jacd: exactDigits(10),
  id: { test: (v) => /^\d+$/.test(v), message: '半角数字で入力してください。' },
  notify_flg: oneOf('0', '1'),
  payment_start: oneOf('0', '1'),
  cancel_ym: {
    test: (v) => /^\d{4}(0[1-9]|1[0-2])$/.test(v),
    message: 'YYYYMM 形式で入力してください。',
  },
  first_name: maxLength(255),
  last_name: maxLength(255),
  first_kana: maxLength(255),
  last_kana: maxLength(255),
  zip: digits(7),
  pref_id: digits(2),
  addr: maxLength(255),
  city: maxLength(255),
  building: maxLength(255),
  tel: digits(13),
  email: {
    // 電子版は「半角英数記号・255文字以内」。形式そのものは cloud の DTO
    // (`@IsEmail`) が既に担保しているので、ここは長さと全角混入だけ見る。
    test: (v) => [...v].length <= 255 && /^[\x21-\x7E]+$/.test(v),
    message: '半角文字・255文字以内で入力してください。',
  },
  subscribe_flg: oneOf('0', '1'),
  branch: maxLength(40),
  remarks1: maxLength(255),
  remarks2: maxLength(255),
  remarks3: maxLength(255),
  remarks4: maxLength(255),
  remarks5: maxLength(255),
  melmaga: oneOf('0', '1'),
  profession: oneOf('0', '1', '2', '3', '999'),
  profession_and_ja: oneOf('0', '1'),
  profession_and_agri: oneOf('0', '1'),
  others_profession: maxLength(255),
  products: {
    test: (v) =>
      v.split(',').every((c) => ['0', '1', '2', '3', '4', '5', '999'].includes(c)),
    message: '0〜5 / 999 をカンマ区切りで入力してください。',
  },
  others_products: maxLength(255),
  birthyear: exactDigits(4),
  sex: oneOf('0', '1', '9'),
};

/** cloud 側の列名（エラーを画面のどの項目に出すか）。 */
const CLOUD_FIELD: Record<string, string> = {
  jacd_execute: 'kanri_shiten_code',
  jacd: 'kanri_shiten_code',
  id: 'denshi_kaiin_id',
  first_name: 'shimei_sei',
  last_name: 'shimei_mei',
  first_kana: 'shimei_kana_sei',
  last_kana: 'shimei_kana_mei',
  zip: 'yubin_no',
  pref_id: 'todofuken_code',
  addr: 'shikuchoson',
  city: 'chome_banchi',
  building: 'tatemono_mei',
  tel: 'renrakusaki_1',
  email: 'email',
  melmaga: 'mail_magazine_flg',
  profession: 'dokusyaso_bunrui',
  others_profession: 'dokusyaso_bunrui',
  products: 'nogyosya_bunrui',
  others_products: 'nogyosya_bunrui',
  birthyear: 'birth_year',
  sex: 'gender',
  payment_start: 'dokusya_kaishi_date',
  remarks1: 'biko',
  remarks2: 'biko',
  remarks3: 'biko',
  remarks4: 'biko',
  remarks5: 'biko',
};

/** モード毎の必須フィールド（行列 §A の ◎）。 */
const REQUIRED_BY_MODE: Record<string, string[]> = {
  create: [
    'action_kbn',
    'jacd_execute',
    'first_name',
    'last_name',
    'first_kana',
    'last_kana',
    'zip',
    'pref_id',
    'addr',
    'city',
    'tel',
    'email',
    'subscribe_flg',
    'melmaga',
    'profession',
    'payment_start',
  ],
  update: ['action_kbn', 'jacd_execute', 'id', 'notify_flg'],
  reread: ['action_kbn', 'jacd_execute', 'id', 'notify_flg'],
  cancel: ['action_kbn', 'jacd_execute', 'id', 'cancel_ym', 'notify_flg'],
  approve: ['action_kbn', 'jacd_execute', 'id', 'payment_start'],
  unapprove: ['action_kbn', 'jacd_execute', 'id', 'payment_start'],
};

/**
 * ペイロードを検証する。1件でも違反があれば {@link DenshibanMappingError} を
 * 投げる（最初の1件で止めず、全件をまとめて出す — 送り直しの往復を減らす）。
 *
 * 見るもの:
 *   1. モード毎の必須フィールドが存在し、空でないこと。
 *   2. 各フィールドが §B の Validation を満たすこと。
 *   3. フィールド間の条件（`products` は `profession=0` のときだけ、等）。
 *
 * @throws {DenshibanMappingError} 違反があるとき。`field` は cloud 側の列名。
 */
export function assertPayload(payload: DenshibanPayload): void {
  const violations: { field: string; message: string }[] = [];

  const required = REQUIRED_BY_MODE[payload.action_kbn] ?? [];
  for (const key of required) {
    if (payload[key] === undefined || payload[key] === '') {
      violations.push({
        field: CLOUD_FIELD[key] ?? key,
        message: `${key} は ${payload.action_kbn} で必須です。`,
      });
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (value === '') continue; // 必須チェックで既に拾っている。
    const rule = RULES[key];
    if (!rule) {
      // 行列に無いキーを勝手に足していないかの保険。
      violations.push({
        field: key,
        message: `${key} は電子版の仕様に存在しないフィールドです。`,
      });
      continue;
    }
    if (!rule.test(value)) {
      violations.push({
        field: CLOUD_FIELD[key] ?? key,
        message: `${key}: ${rule.message}`,
      });
    }
  }

  violations.push(...checkCrossFieldRules(payload));

  if (violations.length > 0) {
    throw new DenshibanMappingError(
      violations[0].field,
      violations.map((v) => v.message).join(' / '),
    );
  }
}

/** フィールド間の条件（違反すると電子版が該当フィールドの `V**` を返す）。 */
function checkCrossFieldRules(
  payload: DenshibanPayload,
): { field: string; message: string }[] {
  const out: { field: string; message: string }[] = [];
  const profession = payload.profession;

  if (payload.profession_and_ja !== undefined && profession !== '0') {
    out.push({
      field: 'dokusyaso_bunrui',
      message: 'profession_and_ja は profession=0（農業者）のときのみ送れます。',
    });
  }
  if (payload.profession_and_agri !== undefined && profession !== '2') {
    out.push({
      field: 'dokusyaso_bunrui',
      message:
        'profession_and_agri は profession=2（企業・団体）のときのみ送れます。',
    });
  }
  if (payload.others_profession !== undefined && profession !== '999') {
    out.push({
      field: 'dokusyaso_bunrui',
      message: 'others_profession は profession=999（その他）のときのみ送れます。',
    });
  }
  if (payload.products !== undefined && profession !== '0') {
    out.push({
      field: 'nogyosya_bunrui',
      message: 'products は profession=0（農業者）のときのみ送れます。',
    });
  }
  if (
    payload.others_products !== undefined &&
    !(payload.products ?? '').split(',').includes('999')
  ) {
    out.push({
      field: 'nogyosya_bunrui',
      message: 'others_products は products に 999 を含むときのみ送れます。',
    });
  }

  return out;
}
