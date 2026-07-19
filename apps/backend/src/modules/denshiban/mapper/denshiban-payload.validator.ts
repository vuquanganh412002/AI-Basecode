import {
  type DenshibanPayload,
  DenshibanMappingError,
} from './denshiban-payload.builder';

/**
 * Validates the plaintext payload **on the cloud side** right before sending.
 *
 * The contract is the "Validation" column of §B in
 * `docs/design-vi/Denshiban-mapper/outbound-field-matrix.md` — i.e. exactly the
 * conditions under which denshiban returns `V01`..`V35`. Without rejecting here,
 * we'd only learn about the error after the job is already queued — long after the
 * user left the screen. **Don't let denshiban be the judge; reject in cloud first.**
 *
 * `timestamp` is not checked here (it doesn't exist yet at this point — `send()`
 * stamps it right before sending).
 */

/** A per-field check. When `test` returns false, reject with `message`. */
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

/** denshiban field name → check (the Validation column of matrix §B). */
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
    // denshiban wants "half-width alphanumerics and symbols, up to 255 chars". The
    // format itself is already guaranteed by cloud's DTO (`@IsEmail`), so this only
    // checks length and full-width contamination.
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

/** The cloud-side column name (which form field the error belongs to). */
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

/** Required fields per mode (the ◎ marks in matrix §A). */
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
 * Validates the payload. A single violation throws a {@link DenshibanMappingError}
 * (it doesn't stop at the first one — it reports all of them, to cut down on
 * resubmission round trips).
 *
 * What it checks:
 *   1. That each mode's required fields exist and are non-empty.
 *   2. That each field satisfies §B's Validation.
 *   3. Inter-field conditions (`products` only when `profession=0`, etc.).
 *
 * @throws {DenshibanMappingError} on any violation. `field` is the cloud-side column.
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
    if (value === '') continue; // Already caught by the required check.
    const rule = RULES[key];
    if (!rule) {
      // Insurance against someone adding a key that isn't in the matrix.
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

/** Inter-field conditions (violating one makes denshiban return that field's `V**`). */
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
