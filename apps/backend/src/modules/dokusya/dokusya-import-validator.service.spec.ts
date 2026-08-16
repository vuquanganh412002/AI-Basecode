// Regression (backend review finding #9): DokusyaImportValidator's per-row
// checks never validated gender / mail_magazine_flg / hikiotoshi_yokin_shubetsu
// / yubin_kubun / shiharai_hoho against the customer-editable m_code
// allow-list. An out-of-range code (e.g. gender: 99) was silently accepted
// via Excel import even though the same value is rejected by
// DokusyaService.assertCodeMasterValues() on the manual create/update form —
// so the same "invalid m_code value" bug had two different outcomes
// depending only on which entry point the user came through.

import { DokusyaImportValidator } from './dokusya-import-validator.service';
import type { ImportDokusyaDto, ImportDokusyaRowDto } from './dto/import-dokusya.dto';
import type { SessionPayload } from '@/modules/auth/session.service';
import { futureDate } from '@test/fixtures/dokusya.factory';

type ImportRowError = { row: number; field: string; message: string };

/** Mirrors the real m_code seed values used by this class's categories. */
const VALID_CODES: Record<string, Array<number | string>> = {
  GENDER: [1, 2, 9],
  MAIL_MAGAZINE_FLG: [0, 1],
  YOKIN_SHUBETSU: [1, 2],
  YUBIN_KUBUN: [0, 1],
  SHIHARAI_HOHO: [1, 2, 6],
};

function buildLookups(): Record<string, unknown> {
  return {
    existingById: new Map(),
    existingByKumiaiin: new Map(),
    kumiaiinCounts: new Map(),
    tankaCodeSet: new Set(),
    hanbaitenCodeSet: new Set(),
    hanbaitenIdByCode: new Map(),
    kanriShitenCodeSet: new Set(),
    shitenCodeSet: new Set(),
    existingDigitalEmailToIds: new Map(),
    hasCode: (category: string, value: number | string) =>
      (VALID_CODES[category] ?? []).includes(value),
  };
}

const NICHINO_ADMIN_SESSION: SessionPayload = {
  account_id: 1,
  login_id: 'admin01',
  role_id: 1,
  role_code: 'NICHINO_ADMIN',
  ja_id: null,
  kanri_shiten_id: null,
  shiten_id: null,
  todofuken_code: null,
} as unknown as SessionPayload;

describe('DokusyaImportValidator — m_code allow-list validation (finding #9)', () => {
  let validator: DokusyaImportValidator;
  let lookups: ReturnType<typeof buildLookups>;
  let errors: ImportRowError[];

  beforeEach(() => {
    validator = new DokusyaImportValidator();
    lookups = buildLookups();
    errors = [];
  });

  /** Direct call to the private per-field checker — exhaustive per-field coverage. */
  function runCodeMaster(row: Partial<ImportDokusyaRowDto>): void {
    (validator as unknown as {
      validateImportRowCodeMaster: (
        row: Partial<ImportDokusyaRowDto>,
        rowNo: number,
        lookups: unknown,
        errors: ImportRowError[],
      ) => void;
    }).validateImportRowCodeMaster(row, 1, lookups, errors);
  }

  it('should accept values present in the pre-loaded m_code sets', () => {
    runCodeMaster({
      gender: 1,
      mail_magazine_flg: 0,
      hikiotoshi_yokin_shubetsu: 2,
      yubin_kubun: '1',
      shiharai_hoho: 1,
    });
    expect(errors).toEqual([]);
  });

  it('should skip blank/undefined values (required-ness is validateImportRowRequired\'s job)', () => {
    runCodeMaster({});
    expect(errors).toEqual([]);
  });

  it('should accept a numeric-string value that normalizes to a cached numeric code', () => {
    runCodeMaster({ gender: '1' });
    expect(errors).toEqual([]);
  });

  it('should reject an out-of-range gender code', () => {
    runCodeMaster({ gender: 99 });
    expect(errors).toContainEqual({
      row: 1,
      field: 'gender',
      message: '性別の値が不正です。',
    });
  });

  it('should reject an out-of-range mail_magazine_flg code', () => {
    runCodeMaster({ mail_magazine_flg: 9 });
    expect(errors).toContainEqual({
      row: 1,
      field: 'mail_magazine_flg',
      message: 'メールマガジン配信フラグの値が不正です。',
    });
  });

  it('should reject an out-of-range hikiotoshi_yokin_shubetsu code', () => {
    runCodeMaster({ hikiotoshi_yokin_shubetsu: 99 });
    expect(errors).toContainEqual({
      row: 1,
      field: 'hikiotoshi_yokin_shubetsu',
      message: '引落預金種別の値が不正です。',
    });
  });

  it('should reject an out-of-range yubin_kubun code', () => {
    runCodeMaster({ yubin_kubun: '9' });
    expect(errors).toContainEqual({
      row: 1,
      field: 'yubin_kubun',
      message: '郵送区分の値が不正です。',
    });
  });

  it('should reject an out-of-range shiharai_hoho code', () => {
    runCodeMaster({ shiharai_hoho: 99 });
    expect(errors).toContainEqual({
      row: 1,
      field: 'shiharai_hoho',
      message: '支払方法の値が不正です。',
    });
  });

  it('should accumulate multiple field errors on the same row without short-circuiting', () => {
    runCodeMaster({ gender: 99, shiharai_hoho: 99 });
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.field).sort()).toEqual(['gender', 'shiharai_hoho']);
  });

  it('wiring: should surface the gender m_code error via the public validateImportRows entry point', () => {
    // All IMPORT_NEW_REQUIRED_COLUMNS filled + refs present in lookups so the
    // required-field / ref-not-found checks stay quiet and don't fill the
    // 10-error-per-row cap (pushImportError) before validateImportRowCodeMaster runs.
    (lookups.kanriShitenCodeSet as Set<string>).add('KS001');
    (lookups.hanbaitenCodeSet as Set<string>).add('H001');
    (lookups.tankaCodeSet as Set<string>).add('T001');

    const dto = {
      import_mode: 'NEW',
      dokusya_shubetsu: 1,
      selected_columns: [],
      rows: [
        {
          kanri_shiten_code: 'KS001',
          dokusya_busu: 1,
          tanka_code: 'T001',
          yubin_no: '1000001',
          todofuken_code: '13',
          shikuchoson: '千代田区',
          chome_banchi: '1-1',
          renrakusaki_1: '03-1234-5678',
          hanbaiten_code: 'H001',
          shiharai_hoho: 1,
          dokusya_kaishi_date: futureDate(30),
          gender: 99,
        } as unknown as ImportDokusyaRowDto,
      ],
    } as unknown as ImportDokusyaDto;

    validator.validateImportRows(
      dto,
      lookups as never,
      NICHINO_ADMIN_SESSION,
      errors,
    );

    expect(errors).toContainEqual({
      row: 1,
      field: 'gender',
      message: '性別の値が不正です。',
    });
  });
});
