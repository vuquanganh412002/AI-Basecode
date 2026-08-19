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
import { SHUBETSU_MSG } from './dokusya-shubetsu.rules';
import { todayIsoJst, nextMonthFirstIsoJst, addDaysIso } from '@/common/utils/datetime';

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
    tankaExpiredCodeSet: new Set(),
    hanbaitenCodeSet: new Set(),
    hanbaitenIdByCode: new Map(),
    hanbaitenClosedCodeSet: new Set(),
    kanriShitenCodeSet: new Set(),
    shitenCodeSet: new Set(),
    existingDigitalEmailToIds: new Map(),
    sameDateActiveDokusyaIds: new Set(),
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

// 電子版は実在の販売店へ配達しないため、部数・販売店コードとも常に単一の
// 固定値しか取り得ない（顧客要件 2026-08）。importExcel が行ごと
// dokusya_busu=1 / hanbaiten_code=ダミー販売店(9999999999) へ強制するのに
// 対応する2つの検証: 必須列チェックからの除外、ダミー販売店未整備の事前検出。
describe('DokusyaImportValidator — 電子版の部数/販売店コード固定 (顧客要件 2026-08)', () => {
  let validator: DokusyaImportValidator;

  beforeEach(() => {
    validator = new DokusyaImportValidator();
  });

  describe('assertNewModeRequiredColumns', () => {
    it('should NOT require dokusya_busu/hanbaiten_code in selected_columns when digital', () => {
      const dto = {
        import_mode: 'NEW',
        dokusya_shubetsu: 2, // 電子版
        selected_columns: [
          'kanri_shiten_code',
          'tanka_code',
          'yubin_no',
          'todofuken_code',
          'shikuchoson',
          'chome_banchi',
          'renrakusaki_1',
          'shiharai_hoho',
          'dokusya_kaishi_date',
          // dokusya_busu / hanbaiten_code は意図的に含めない。
        ],
      } as unknown as ImportDokusyaDto;

      expect(() => validator.assertNewModeRequiredColumns(dto)).not.toThrow();
    });

    it('should still require dokusya_busu/hanbaiten_code for 紙版 (unchanged behavior)', () => {
      const dto = {
        import_mode: 'NEW',
        dokusya_shubetsu: 1, // 紙版
        selected_columns: [
          'kanri_shiten_code',
          'tanka_code',
          'yubin_no',
          'todofuken_code',
          'shikuchoson',
          'chome_banchi',
          'renrakusaki_1',
          'shiharai_hoho',
          'dokusya_kaishi_date',
        ],
      } as unknown as ImportDokusyaDto;

      expect(() => validator.assertNewModeRequiredColumns(dto)).toThrow();
    });
  });

  describe('assertDigitalDummyHanbaitenAvailable', () => {
    it('should pass silently for 紙版 regardless of the hanbaiten map', () => {
      const dto = { dokusya_shubetsu: 1 } as unknown as ImportDokusyaDto;
      expect(() =>
        validator.assertDigitalDummyHanbaitenAvailable(dto, new Map()),
      ).not.toThrow();
    });

    it('should pass silently when the JA has provisioned the dummy hanbaiten', () => {
      const dto = { dokusya_shubetsu: 2 } as unknown as ImportDokusyaDto;
      const hanbaitenIdByCode = new Map([['9999999999', 42]]);
      expect(() =>
        validator.assertDigitalDummyHanbaitenAvailable(dto, hanbaitenIdByCode),
      ).not.toThrow();
    });

    it('should throw a clear VALIDATION_ERROR when the JA has no dummy hanbaiten provisioned', () => {
      const dto = { dokusya_shubetsu: 2 } as unknown as ImportDokusyaDto;
      try {
        validator.assertDigitalDummyHanbaitenAvailable(dto, new Map());
        fail('should have thrown');
      } catch (err) {
        const exc = err as {
          code: string;
          errors?: Array<{ field: string; message: string }>;
        };
        expect(exc.code).toBe('VALIDATION_ERROR');
        expect(exc.errors).toContainEqual({
          field: 'hanbaiten_code',
          message: expect.stringContaining('9999999999'),
        });
      }
    });
  });
});

// バグ修正回帰ガード：電子版NEWモードの購読開始日が「本日」で拒否されていた不具合。
// ACSMS-SCR-011登録画面はラジオボタンで今日/翌月1日の2択に絞るが、SCR-016取込には
// 日付ピッカーが無くExcelセルの値をそのまま受け取るため、BE側だけで2値制約を守る
// 必要がある（顧客要件2026-08）。紙版は従来どおり「未来日のみ」で変更なし。
describe('DokusyaImportValidator — 電子版NEWの購読開始日は本日/翌月1日のみ (顧客要件2026-08)', () => {
  let validator: DokusyaImportValidator;
  let lookups: ReturnType<typeof buildLookups>;
  let errors: ImportRowError[];

  const TODAY = todayIsoJst();
  const NEXT_MONTH_FIRST = nextMonthFirstIsoJst();
  // 「明日」が偶然「翌月1日」と一致する月末日には +2日にずらし、意図した
  // 「翌月1日でも当日でもない未来日」ケースを安定して再現する。
  const TOMORROW_NOT_NEXT_MONTH_FIRST =
    addDaysIso(TODAY, 1) === NEXT_MONTH_FIRST ? addDaysIso(TODAY, 2) : addDaysIso(TODAY, 1);

  beforeEach(() => {
    validator = new DokusyaImportValidator();
    lookups = buildLookups();
    errors = [];
    (lookups.kanriShitenCodeSet as Set<string>).add('KS001');
    (lookups.hanbaitenCodeSet as Set<string>).add('H001');
    (lookups.tankaCodeSet as Set<string>).add('T001');
  });

  function runNewModeRow(shubetsu: number, kaishiDate: string): void {
    const dto = {
      import_mode: 'NEW',
      dokusya_shubetsu: shubetsu,
      selected_columns: [],
      rows: [
        {
          dokusya_shubetsu: shubetsu,
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
          email: 'a@example.com',
          dokusyaso_bunrui: '0',
          dokusya_kaishi_date: kaishiDate,
        } as unknown as ImportDokusyaRowDto,
      ],
    } as unknown as ImportDokusyaDto;

    validator.validateImportRows(dto, lookups as never, NICHINO_ADMIN_SESSION, errors);
  }

  it('電子版・購読開始日=本日 → エラーなし（このバグの回帰ガード）', () => {
    runNewModeRow(2, TODAY);
    expect(errors.filter((e) => e.field === 'dokusya_kaishi_date')).toHaveLength(0);
  });

  it('電子版・購読開始日=翌月1日 → エラーなし', () => {
    runNewModeRow(2, NEXT_MONTH_FIRST);
    expect(errors.filter((e) => e.field === 'dokusya_kaishi_date')).toHaveLength(0);
  });

  it('電子版・購読開始日=本日でも翌月1日でもない未来日 → エラー', () => {
    runNewModeRow(2, TOMORROW_NOT_NEXT_MONTH_FIRST);
    expect(errors).toContainEqual({
      row: 1,
      field: 'dokusya_kaishi_date',
      message: SHUBETSU_MSG.DIGITAL_KAISHI_DATE_INVALID,
    });
  });

  it('電子版・購読開始日=過去日 → エラー', () => {
    runNewModeRow(2, addDaysIso(TODAY, -1));
    expect(errors).toContainEqual({
      row: 1,
      field: 'dokusya_kaishi_date',
      message: SHUBETSU_MSG.DIGITAL_KAISHI_DATE_INVALID,
    });
  });

  it('紙版・購読開始日=本日 → 従来どおりエラー（regression guard：紙版の挙動は不変）', () => {
    runNewModeRow(1, TODAY);
    expect(errors).toContainEqual({
      row: 1,
      field: 'dokusya_kaishi_date',
      message: '購読開始日は本日より後の日付を入力してください。',
    });
  });

  it('紙版・購読開始日=明日 → 従来どおりエラーなし', () => {
    runNewModeRow(1, addDaysIso(TODAY, 1));
    expect(errors.filter((e) => e.field === 'dokusya_kaishi_date')).toHaveLength(0);
  });
});

// 紙版の予約変更（未来日）は同一適用日への変更を1回までに制限する（顧客要件2026-08）。
// buildImportLookups が sameDateActiveDokusyaIds を一括算出し、
// validateImportRowTekiyoDates がそれを見て行エラーを積む。
describe('DokusyaImportValidator — 予約変更の同一適用日1回まで制限 (顧客要件2026-08)', () => {
  let validator: DokusyaImportValidator;

  beforeEach(() => {
    validator = new DokusyaImportValidator();
  });

  function buildUpdateRow(overrides: Partial<ImportDokusyaRowDto> = {}) {
    return {
      dokusya_id: 100,
      kanri_shiten_code: 'KS001',
      dokusya_busu: 1,
      tanka_code: 'T001',
      yubin_no: '1000001',
      todofuken_code: '13',
      shikuchoson: '千代田区',
      chome_banchi: '1-1',
      hanbaiten_code: 'H001',
      shiharai_hoho: 1,
      ...overrides,
    } as unknown as ImportDokusyaRowDto;
  }

  function buildExistingRow(overrides: Record<string, unknown> = {}) {
    return {
      dokusya_id: 100,
      ja_id: 1,
      dokusya_shubetsu: 1,
      dokusya_kaishi_date: '2020-01-01',
      dokusya_chushi_date: null,
      ...overrides,
    };
  }

  it('should push a row error when the target dokusya_id already has an active row at this joho date', () => {
    const lookups = buildLookups() as any;
    lookups.existingById.set(100, buildExistingRow());
    lookups.hanbaitenCodeSet.add('H001');
    lookups.tankaCodeSet.add('T001');
    lookups.kanriShitenCodeSet.add('KS001');
    lookups.sameDateActiveDokusyaIds.add(100);

    const dto = {
      import_mode: 'UPDATE',
      dokusya_shubetsu: 1,
      joho_henko_tekiyo_date: futureDate(20),
      selected_columns: [],
      rows: [buildUpdateRow()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(errors).toContainEqual({
      row: 1,
      field: 'joho_henko_tekiyo_date',
      message: SHUBETSU_MSG.RESERVE_DATE_ALREADY_USED,
    });
  });

  it('should NOT push a row error when the target dokusya_id has no active row at this joho date', () => {
    const lookups = buildLookups() as any;
    lookups.existingById.set(100, buildExistingRow());
    lookups.hanbaitenCodeSet.add('H001');
    lookups.tankaCodeSet.add('T001');
    lookups.kanriShitenCodeSet.add('KS001');
    // sameDateActiveDokusyaIds は空のまま（衝突なし）。

    const dto = {
      import_mode: 'UPDATE',
      dokusya_shubetsu: 1,
      joho_henko_tekiyo_date: futureDate(20),
      selected_columns: [],
      rows: [buildUpdateRow()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(
      errors.some((e) => e.message === SHUBETSU_MSG.RESERVE_DATE_ALREADY_USED),
    ).toBe(false);
  });
});

// バグ報告 2026-08: 電子版は読者情報変更適用日の省略を許す
// （assertUpdateModeDates）が、書込み側（dokusya-import.service.ts の
// updateJoho）は省略時に当日を補う。この相対チェック（JOHO_BEFORE_KAISHI）が
// 未補完の null で走ると、購読開始日が未到来（翌月1日など）の電子版読者を
// 適用日省略のまま UPDATE 取込すると検証をすり抜け、共通ライタ applyChange の
// findBefore(joho=当日) が直前行なしと誤判定して不完全な履歴行を作ってしまう。
describe('DokusyaImportValidator — 電子版の適用日省略時も購読開始日との整合を検証する (バグ報告2026-08)', () => {
  let validator: DokusyaImportValidator;

  beforeEach(() => {
    validator = new DokusyaImportValidator();
  });

  function buildUpdateRow(overrides: Partial<ImportDokusyaRowDto> = {}) {
    return {
      dokusya_id: 100,
      kanri_shiten_code: 'KS001',
      dokusya_busu: 1,
      hanbaiten_code: 'H001',
      shiharai_hoho: 1,
      ...overrides,
    } as unknown as ImportDokusyaRowDto;
  }

  it('should push a JOHO_BEFORE_KAISHI error when a digital row omits joho_henko_tekiyo_date and the subscriber has not started yet', () => {
    const lookups = buildLookups() as any;
    lookups.existingById.set(100, {
      dokusya_id: 100,
      ja_id: 1,
      dokusya_shubetsu: 2, // 電子版
      dokusya_kaishi_date: nextMonthFirstIsoJst(), // 未到来（翌月1日）
      dokusya_chushi_date: null,
    });
    lookups.hanbaitenCodeSet.add('H001');
    lookups.kanriShitenCodeSet.add('KS001');

    const dto = {
      import_mode: 'UPDATE',
      dokusya_shubetsu: 2, // 電子版
      // joho_henko_tekiyo_date は省略（電子版は当日固定・画面も disable）。
      selected_columns: [],
      rows: [buildUpdateRow()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(errors).toContainEqual(
      expect.objectContaining({
        row: 1,
        field: 'joho_henko_tekiyo_date',
        message: expect.stringContaining('購読開始日'),
      }),
    );
  });

  it('should NOT push a JOHO_BEFORE_KAISHI error when a digital row omits joho_henko_tekiyo_date but the subscriber has already started', () => {
    const lookups = buildLookups() as any;
    lookups.existingById.set(100, {
      dokusya_id: 100,
      ja_id: 1,
      dokusya_shubetsu: 2, // 電子版
      dokusya_kaishi_date: '2020-01-01', // 既に開始済み
      dokusya_chushi_date: null,
    });
    lookups.hanbaitenCodeSet.add('H001');
    lookups.kanriShitenCodeSet.add('KS001');

    const dto = {
      import_mode: 'UPDATE',
      dokusya_shubetsu: 2, // 電子版
      selected_columns: [],
      rows: [buildUpdateRow()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(
      errors.some((e) => e.field === 'joho_henko_tekiyo_date'),
    ).toBe(false);
  });
});

// バグ報告2026-08: 廃店(haiten_flg=true)の販売店・失効(active_flg=false)の単価を
// 取込で選択できてしまい、取込自体は成功するが購読者詳細画面には廃店/失効の旨が
// 表示されないため運用が気付けなかった。UI(SCR-011)にも既存の相当チェックが無い
// 新設ルールなので、取込側は「存在するがコードの状態が廃店/失効」を専用集合
// （hanbaitenClosedCodeSet/tankaExpiredCodeSet）で判定しIMPORT_VALIDATION_ERRORで弾く。
describe('DokusyaImportValidator — 廃店の販売店・失効の単価を取込で選択できないようにする (バグ報告2026-08)', () => {
  let validator: DokusyaImportValidator;

  beforeEach(() => {
    validator = new DokusyaImportValidator();
  });

  function buildNewRow(overrides: Partial<ImportDokusyaRowDto> = {}) {
    return {
      kanri_shiten_code: 'KS001',
      dokusya_busu: 1,
      tanka_code: 'T001',
      yubin_no: '1000001',
      todofuken_code: '13',
      shikuchoson: '千代田区',
      chome_banchi: '1-1',
      renrakusaki_1: '0312345678',
      hanbaiten_code: 'H001',
      shiharai_hoho: 1,
      dokusya_kaishi_date: futureDate(2),
      ...overrides,
    } as unknown as ImportDokusyaRowDto;
  }

  it('should push an IMPORT_VALIDATION_ERROR when the row selects a closed (haiten_flg=true) hanbaiten_code', () => {
    const lookups = buildLookups() as any;
    (lookups.hanbaitenCodeSet as Set<string>).add('H001');
    (lookups.hanbaitenClosedCodeSet as Set<string>).add('H001');
    (lookups.tankaCodeSet as Set<string>).add('T001');
    (lookups.kanriShitenCodeSet as Set<string>).add('KS001');

    const dto = {
      import_mode: 'NEW',
      dokusya_shubetsu: 1,
      selected_columns: [],
      rows: [buildNewRow()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(errors).toContainEqual({
      row: 1,
      field: 'hanbaiten_code',
      message: '指定された販売店コードは廃店のため選択できません。',
    });
  });

  it('should push an IMPORT_VALIDATION_ERROR when the row selects an expired (active_flg=false) tanka_code', () => {
    const lookups = buildLookups() as any;
    (lookups.hanbaitenCodeSet as Set<string>).add('H001');
    (lookups.tankaCodeSet as Set<string>).add('T001');
    (lookups.tankaExpiredCodeSet as Set<string>).add('T001');
    (lookups.kanriShitenCodeSet as Set<string>).add('KS001');

    const dto = {
      import_mode: 'NEW',
      dokusya_shubetsu: 1,
      selected_columns: [],
      rows: [buildNewRow()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(errors).toContainEqual({
      row: 1,
      field: 'tanka_code',
      message: '指定された新聞単価コードは失効しています。',
    });
  });

  it('should NOT push an error for a hanbaiten_code/tanka_code that exists and is active/open', () => {
    const lookups = buildLookups() as any;
    (lookups.hanbaitenCodeSet as Set<string>).add('H001');
    (lookups.tankaCodeSet as Set<string>).add('T001');
    (lookups.kanriShitenCodeSet as Set<string>).add('KS001');
    // hanbaitenClosedCodeSet / tankaExpiredCodeSet は空のまま。

    const dto = {
      import_mode: 'NEW',
      dokusya_shubetsu: 1,
      selected_columns: [],
      rows: [buildNewRow()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(errors.some((e) => e.field === 'hanbaiten_code')).toBe(false);
    expect(errors.some((e) => e.field === 'tanka_code')).toBe(false);
  });

  it('should report "not found" (not "closed") when the code does not exist at all, even if it happens to be in the closed set', () => {
    const lookups = buildLookups() as any;
    // hanbaitenCodeSet に無い＝JA配下に存在しない（あり得ないが防御的に確認）。
    (lookups.hanbaitenClosedCodeSet as Set<string>).add('H001');
    (lookups.tankaCodeSet as Set<string>).add('T001');
    (lookups.kanriShitenCodeSet as Set<string>).add('KS001');

    const dto = {
      import_mode: 'NEW',
      dokusya_shubetsu: 1,
      selected_columns: [],
      rows: [buildNewRow()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(errors).toContainEqual({
      row: 1,
      field: 'hanbaiten_code',
      message: '指定された販売店コードが見つかりません。',
    });
    expect(
      errors.some((e) => e.message === '指定された販売店コードは廃店のため選択できません。'),
    ).toBe(false);
  });
});

// 組合員コードは重複可（DB に UNIQUE 制約なし・screen-design.md「更新モードで
// IDが空のときの代替キー」）。dokusya_id 無しで kumiaiin_code だけを頼りに
// UPDATE/一括中止すると、同一コードの読者が複数いた場合 LIMIT 1 で誤った
// 読者を更新しかねない。classifyImportRow の isAmbiguousKumiaiinKey ガードが
// これを行エラーで弾くことを確認する — 通常更新・一括中止(dokusya_chushi_date
// 指定)の両方で同じ import_mode='UPDATE' を通るため、両方をカバーする。
describe('DokusyaImportValidator — 組合員コード重複時はID指定を要求する（誤更新防止）', () => {
  let validator: DokusyaImportValidator;

  beforeEach(() => {
    validator = new DokusyaImportValidator();
  });

  function buildAmbiguousLookups() {
    const lookups = buildLookups() as any;
    // JA内に同じ kumiaiin_code を持つ既存読者が2人いる状態を再現。
    lookups.kumiaiinCounts.set('K0001', 2);
    lookups.hanbaitenCodeSet.add('H001');
    lookups.tankaCodeSet.add('T001');
    lookups.kanriShitenCodeSet.add('KS001');
    return lookups;
  }

  function buildRowWithoutId(overrides: Partial<ImportDokusyaRowDto> = {}) {
    return {
      kumiaiin_code: 'K0001',
      kanri_shiten_code: 'KS001',
      dokusya_busu: 1,
      tanka_code: 'T001',
      yubin_no: '1000001',
      todofuken_code: '13',
      shikuchoson: '千代田区',
      chome_banchi: '1-1',
      hanbaiten_code: 'H001',
      shiharai_hoho: 1,
      ...overrides,
    } as unknown as ImportDokusyaRowDto;
  }

  it('should reject a normal UPDATE row with an ambiguous kumiaiin_code (no dokusya_id)', () => {
    const lookups = buildAmbiguousLookups();
    const dto = {
      import_mode: 'UPDATE',
      dokusya_shubetsu: 1,
      joho_henko_tekiyo_date: futureDate(20),
      selected_columns: [],
      rows: [buildRowWithoutId()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    const { updatedCount } = validator.validateImportRows(
      dto,
      lookups,
      NICHINO_ADMIN_SESSION,
      errors,
    );

    expect(errors).toContainEqual({
      row: 1,
      field: 'kumiaiin_code',
      message: '組合員コードが重複しているため、IDを指定してください。',
    });
    expect(updatedCount).toBe(0);
  });

  it('should reject a 一括中止 (bulk-stop) row with an ambiguous kumiaiin_code the same way (dokusya_chushi_date set)', () => {
    // 一括中止も import_mode='UPDATE' のまま（joho の代わりに dokusya_chushi_date
    // を指定するだけ）— classifyImportRow のガードは import_mode しか見ないため、
    // 通常更新と同じ経路で守られることを確認する（ユーザー要望: HUYケースにも適用）。
    const lookups = buildAmbiguousLookups();
    const dto = {
      import_mode: 'UPDATE',
      dokusya_shubetsu: 1,
      dokusya_chushi_date: futureDate(5),
      selected_columns: [],
      rows: [buildRowWithoutId()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(errors).toContainEqual({
      row: 1,
      field: 'kumiaiin_code',
      message: '組合員コードが重複しているため、IDを指定してください。',
    });
  });

  it('should NOT reject when dokusya_id is provided even if kumiaiin_code is ambiguous (ID always disambiguates)', () => {
    const lookups = buildAmbiguousLookups();
    lookups.existingById.set(100, {
      dokusya_id: 100,
      ja_id: 1,
      dokusya_shubetsu: 1,
      dokusya_kaishi_date: '2020-01-01',
      dokusya_chushi_date: null,
    });
    const dto = {
      import_mode: 'UPDATE',
      dokusya_shubetsu: 1,
      joho_henko_tekiyo_date: futureDate(20),
      selected_columns: [],
      rows: [buildRowWithoutId({ dokusya_id: 100 })],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(
      errors.some((e) => e.field === 'kumiaiin_code' && e.message.includes('重複')),
    ).toBe(false);
  });

  it('should NOT reject an unambiguous kumiaiin_code (count=1)', () => {
    const lookups = buildLookups() as any;
    lookups.kumiaiinCounts.set('K0001', 1);
    lookups.existingByKumiaiin.set('K0001', {
      dokusya_id: 100,
      ja_id: 1,
      dokusya_shubetsu: 1,
      dokusya_kaishi_date: '2020-01-01',
      dokusya_chushi_date: null,
    });
    lookups.hanbaitenCodeSet.add('H001');
    lookups.tankaCodeSet.add('T001');
    lookups.kanriShitenCodeSet.add('KS001');
    const dto = {
      import_mode: 'UPDATE',
      dokusya_shubetsu: 1,
      joho_henko_tekiyo_date: futureDate(20),
      selected_columns: [],
      rows: [buildRowWithoutId()],
    } as unknown as ImportDokusyaDto;

    const errors: ImportRowError[] = [];
    validator.validateImportRows(dto, lookups, NICHINO_ADMIN_SESSION, errors);

    expect(
      errors.some((e) => e.field === 'kumiaiin_code' && e.message.includes('重複')),
    ).toBe(false);
  });
});
