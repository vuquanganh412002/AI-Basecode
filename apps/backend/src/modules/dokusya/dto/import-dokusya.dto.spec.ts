// Screen: ACSMS-SCR-016 — 購読者Excelデータ取込画面
//
// DTO validation contract for ImportDokusyaDto / ImportDokusyaRowDto
// (POST /api/v1/dokusya/import — ACSMS-API-016-002 §リクエストパラメータ).
//
// Covers the TOP-LEVEL DTO shape (import_mode enum, selected_columns +
// rows array bounds) and a sample of per-row field max-length checks.
// Row-level BUSINESS validation (3:併読 reject, 電子版×クレカ, FK lookups,
// mode-conditional required) lives in the SERVICE — exercised in
// dokusya.service.spec.ts §ACSMS-SCR-016, not here.

import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  ImportDokusyaDto,
  ImportDokusyaRowDto,
} from '@/modules/dokusya/dto/import-dokusya.dto';
import {
  buildImportBody,
  buildImportRequiredColumns,
  buildImportRow,
} from '@test/fixtures/dokusya.factory';

/** Resolve the top-level DTO instance + run class-validator. */
async function validateBody(raw: Record<string, unknown>) {
  const dto = plainToInstance(ImportDokusyaDto, raw);
  return validate(dto as object, { whitelist: true });
}

/** Resolve a single row DTO instance + run class-validator. */
async function validateRow(raw: Record<string, unknown>) {
  const dto = plainToInstance(ImportDokusyaRowDto, raw);
  return validate(dto as object, { whitelist: true });
}

describe('ImportDokusyaDto (ACSMS-API-016-002 §リクエストパラメータ)', () => {
  describe('import_mode (#1, required, enum)', () => {
    it('should pass when import_mode is NEW and the body is otherwise valid', async () => {
      const errors = await validateBody(buildImportBody({ import_mode: 'NEW' }));
      const modeErr = errors.find((e) => e.property === 'import_mode');
      expect(modeErr).toBeUndefined();
    });

    it('should pass when import_mode is UPDATE', async () => {
      const errors = await validateBody(
        buildImportBody({ import_mode: 'UPDATE' }),
      );
      expect(errors.find((e) => e.property === 'import_mode')).toBeUndefined();
    });

    it('should fail when import_mode is UPDATE_ALL (廃止・顧客要件 2026-07)', async () => {
      const errors = await validateBody(
        buildImportBody({ import_mode: 'UPDATE_ALL' as never }),
      );
      expect(errors.some((e) => e.property === 'import_mode')).toBe(true);
    });

    it('should fail when import_mode is UPDATE_PARTIAL (UPDATE に統合)', async () => {
      const errors = await validateBody(
        buildImportBody({ import_mode: 'UPDATE_PARTIAL' as never }),
      );
      expect(errors.some((e) => e.property === 'import_mode')).toBe(true);
    });

    it('should fail when import_mode is missing', async () => {
      const body = buildImportBody();
      delete body.import_mode;
      const errors = await validateBody(body);
      expect(errors.some((e) => e.property === 'import_mode')).toBe(true);
    });

    it('should fail when import_mode is an unknown value', async () => {
      const errors = await validateBody(
        buildImportBody({ import_mode: 'DELETE_ALL' }),
      );
      expect(errors.some((e) => e.property === 'import_mode')).toBe(true);
    });
  });

  describe('dokusya_shubetsu (top-level, required, 1|2 — 顧客要件 2026-07)', () => {
    // 購読種別は画面ラジオで一括指定する単一ソース（Excel 列ではない）。
    // 紙版(1) / 電子版(2) のみ許可。3:併読 は取込不可。
    it('should pass when dokusya_shubetsu is 1 (紙版)', async () => {
      const errors = await validateBody(buildImportBody({ dokusya_shubetsu: 1 }));
      expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(false);
    });

    it('should pass when dokusya_shubetsu is 2 (電子版)', async () => {
      const errors = await validateBody(buildImportBody({ dokusya_shubetsu: 2 }));
      expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(false);
    });

    it('should fail when dokusya_shubetsu is 3 (併読 — 取込不可)', async () => {
      const errors = await validateBody(buildImportBody({ dokusya_shubetsu: 3 }));
      expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(true);
    });

    it('should fail when dokusya_shubetsu is missing', async () => {
      const body = buildImportBody();
      delete body.dokusya_shubetsu;
      const errors = await validateBody(body);
      expect(errors.some((e) => e.property === 'dokusya_shubetsu')).toBe(true);
    });
  });

  describe('selected_columns (#2, required, array 1..49)', () => {
    it('should pass when selected_columns has the 13 required NEW columns', async () => {
      const errors = await validateBody(buildImportBody());
      expect(
        errors.find((e) => e.property === 'selected_columns'),
      ).toBeUndefined();
    });

    it('should fail when selected_columns is missing', async () => {
      const body = buildImportBody();
      delete body.selected_columns;
      const errors = await validateBody(body);
      expect(errors.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should fail when selected_columns is an empty array (ArrayMinSize 1)', async () => {
      const errors = await validateBody(buildImportBody({ selected_columns: [] }));
      expect(errors.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should fail when selected_columns exceeds 50 entries (ArrayMaxSize 50)', async () => {
      const tooMany = Array.from({ length: 51 }, (_, i) => `col_${i}`);
      const errors = await validateBody(
        buildImportBody({ selected_columns: tooMany }),
      );
      expect(errors.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should fail when selected_columns is not an array', async () => {
      const errors = await validateBody(
        buildImportBody({ selected_columns: 'dokusya_shubetsu' }),
      );
      expect(errors.some((e) => e.property === 'selected_columns')).toBe(true);
    });

    it('should accept exactly 50 selected_columns when the upper bound is hit', async () => {
      const max = Array.from({ length: 50 }, (_, i) => `col_${i}`);
      const errors = await validateBody(
        buildImportBody({ selected_columns: max }),
      );
      expect(
        errors.find((e) => e.property === 'selected_columns'),
      ).toBeUndefined();
    });
  });

  describe('rows (#3, required, array 1..5000)', () => {
    it('should pass when rows has exactly one valid row', async () => {
      const errors = await validateBody(buildImportBody());
      expect(errors.find((e) => e.property === 'rows')).toBeUndefined();
    });

    it('should fail when rows is missing', async () => {
      const body = buildImportBody();
      delete body.rows;
      const errors = await validateBody(body);
      expect(errors.some((e) => e.property === 'rows')).toBe(true);
    });

    it('should fail when rows is an empty array (ArrayMinSize 1)', async () => {
      const errors = await validateBody(buildImportBody({ rows: [] }));
      expect(errors.some((e) => e.property === 'rows')).toBe(true);
    });

    it('should fail when rows exceeds 5000 entries (ArrayMaxSize 5000)', async () => {
      const tooMany = Array.from({ length: 5001 }, () => buildImportRow());
      const errors = await validateBody(buildImportBody({ rows: tooMany }));
      expect(errors.some((e) => e.property === 'rows')).toBe(true);
    });

    it('should fail when rows is not an array', async () => {
      const errors = await validateBody(
        buildImportBody({ rows: buildImportRow() }),
      );
      expect(errors.some((e) => e.property === 'rows')).toBe(true);
    });
  });

  // バグ報告2026-08: 一括中止（ID のみ selected_columns）で、Excel シートに
  // 残っていた無関係セル（email/生年 等）の値が selected_columns 対象外
  // にも関わらず @IsEmail/@IsNumber へ届いて 400 になっていた。
  // stripUnselectedColumns が selected_columns 対象外のキーを
  // class-validator が見る前に剥がすことを確認する（NEW/UPDATE 両モード
  // 対象 — 不具合修正 2026-08 で新規登録にも拡張）。
  describe('rows — selected_columns 対象外の列を剥がす（不具合修正2026-08）', () => {
    it('should NOT validate unselected columns when import_mode=UPDATE and selected_columns=[dokusya_id] only (一括中止)', async () => {
      const errors = await validateBody(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id'],
          dokusya_chushi_date: '2027-01-06',
          joho_henko_tekiyo_date: undefined,
          rows: [
            buildImportRow({
              dokusya_id: 215,
              email: 'not-an-email',
              mail_magazine_flg: 'abc',
              birth_year: 'abc',
            }),
          ],
        }),
      );
      expect(errors.find((e) => e.property === 'rows')).toBeUndefined();
    });

    it('should still validate a column when it IS in selected_columns for UPDATE', async () => {
      const errors = await validateBody(
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id', 'email'],
          rows: [
            buildImportRow({ dokusya_id: 215, email: 'not-an-email' }),
          ],
        }),
      );
      expect(errors.find((e) => e.property === 'rows')).toBeDefined();
    });

    it('should NOT validate an unselected optional column for import_mode=NEW (unchecked = skip validate, insert as null/empty)', async () => {
      const errors = await validateBody(
        buildImportBody({
          import_mode: 'NEW',
          // デフォルトの必須列一覧に email は含まれない → 未選択列として扱われる。
          rows: [buildImportRow({ email: 'not-an-email' })],
        }),
      );
      expect(errors.find((e) => e.property === 'rows')).toBeUndefined();
    });

    it('should still validate a column when it IS in selected_columns for NEW', async () => {
      const errors = await validateBody(
        buildImportBody({
          import_mode: 'NEW',
          selected_columns: [...buildImportRequiredColumns(), 'email'],
          rows: [buildImportRow({ email: 'not-an-email' })],
        }),
      );
      expect(errors.find((e) => e.property === 'rows')).toBeDefined();
    });

    it('should still validate required columns for NEW even though they are always selected', async () => {
      // 必須列（例: dokusya_busu）は selected_columns に常に含まれる前提だが、
      // 念のため「剥がされて素通りしない」ことを確認する。
      const errors = await validateBody(
        buildImportBody({
          import_mode: 'NEW',
          rows: [buildImportRow({ dokusya_busu: 'abc' })], // 数値でない
        }),
      );
      expect(errors.find((e) => e.property === 'rows')).toBeDefined();
    });

    it('should keep dokusya_id on the transformed row even when it is (incorrectly) omitted from selected_columns', () => {
      const dto = plainToInstance(
        ImportDokusyaDto,
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['email'],
          rows: [
            buildImportRow({ dokusya_id: 215, email: 'ok@example.com' }),
          ],
        }),
      );
      expect(dto.rows[0].dokusya_id).toBe(215);
    });

    // 回帰ガード（不具合修正2026-08）: kumiaiin_code は dokusya_id が無いときの
    // 突合フォールバックキー（resolveImportTargetId/classifyImportRow）。
    // 一括中止は selected_columns が dokusya_id のみに縮退するため、これを
    // stripUnselectedColumns が dokusya_id 同様に残さないと「ID未指定・
    // 組合員コードのみでの一括中止」が常に「指定された購読者が見つかりません」
    // で失敗する（stripUnselectedColumns 導入時に一度この回帰を作り込んだ）。
    it('should keep kumiaiin_code on the transformed row for UPDATE even when it is not in selected_columns (fallback match key)', () => {
      const dto = plainToInstance(
        ImportDokusyaDto,
        buildImportBody({
          import_mode: 'UPDATE',
          selected_columns: ['dokusya_id'], // 一括中止の実際の送信形（IDのみ選択）
          dokusya_chushi_date: '2099-05-31',
          joho_henko_tekiyo_date: undefined,
          rows: [
            buildImportRow({ dokusya_id: undefined, kumiaiin_code: 'K9999' }),
          ],
        }),
      );
      expect(dto.rows[0].kumiaiin_code).toBe('K9999');
    });

    it('should NOT keep kumiaiin_code for NEW mode when it is not in selected_columns (NEW has no fallback-match concept)', () => {
      const dto = plainToInstance(
        ImportDokusyaDto,
        buildImportBody({
          import_mode: 'NEW',
          // buildImportBody の既定は kumiaiin_code を含むため、ここでは
          // 明示的に外して「未選択」の状態を再現する。
          selected_columns: buildImportRequiredColumns(),
          rows: [buildImportRow({ kumiaiin_code: 'K9999' })],
        }),
      );
      expect(dto.rows[0].kumiaiin_code).toBeUndefined();
    });
  });
});

describe('ImportDokusyaRowDto (ACSMS-API-016-002 §リクエストパラメータ rows 4-52)', () => {
  it('should pass when a fully-valid NEW row is supplied', async () => {
    const errors = await validateRow(buildImportRow());
    expect(errors).toHaveLength(0);
  });

  it('should pass when all optional fields are blank (row-level required is service-side)', async () => {
    // Per the task: every per-row field is optional at the DTO shape
    // level; mode-conditional required is enforced in the service layer.
    const errors = await validateRow({});
    expect(errors).toHaveLength(0);
  });

  // 不具合修正2026-08: 20→10文字へ変更（UI(DokusyaFormView.vue の
  // :maxlength="10") / screen-design.md(ACSMS-SCR-011) と揃える）。
  describe('string max-length (#9 kumiaiin_code max 10・不具合修正2026-08)', () => {
    it('should fail when kumiaiin_code exceeds 10 characters', async () => {
      const errors = await validateRow(
        buildImportRow({ kumiaiin_code: 'X'.repeat(11) }),
      );
      expect(errors.some((e) => e.property === 'kumiaiin_code')).toBe(true);
    });

    it('should pass when kumiaiin_code is exactly 10 characters', async () => {
      const errors = await validateRow(
        buildImportRow({ kumiaiin_code: 'X'.repeat(10) }),
      );
      expect(errors.find((e) => e.property === 'kumiaiin_code')).toBeUndefined();
    });
  });

  describe('string max-length (#15 tanka_code max 10)', () => {
    it('should fail when tanka_code exceeds 10 characters', async () => {
      const errors = await validateRow(
        buildImportRow({ tanka_code: 'T'.repeat(11) }),
      );
      expect(errors.some((e) => e.property === 'tanka_code')).toBe(true);
    });
  });

  describe('string max-length (#16 email max 100)', () => {
    it('should fail when email exceeds 100 characters', async () => {
      const errors = await validateRow(
        buildImportRow({ email: `${'a'.repeat(95)}@e.jp` }),
      );
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });
  });

  // 顧客要件 2026-08: 氏名（漢字）4項目は最大50文字（既存仕様の確認 — 変更なし）。
  describe('氏名（漢字）4項目 max 50文字', () => {
    it.each([
      ['shimei_sei', '氏名（姓）'],
      ['shimei_mei', '氏名（名）'],
      ['haitatsu_shimei_sei', '配達先氏名（姓）'],
      ['haitatsu_shimei_mei', '配達先氏名（名）'],
    ])('should fail when %s exceeds 50 characters', async (field) => {
      const errors = await validateRow(
        buildImportRow({ [field]: '山'.repeat(51) }),
      );
      expect(errors.some((e) => e.property === field)).toBe(true);
    });

    it.each([
      ['shimei_sei', '氏名（姓）'],
      ['shimei_mei', '氏名（名）'],
      ['haitatsu_shimei_sei', '配達先氏名（姓）'],
      ['haitatsu_shimei_mei', '配達先氏名（名）'],
    ])('should pass when %s is exactly 50 characters', async (field) => {
      const errors = await validateRow(
        buildImportRow({ [field]: '山'.repeat(50) }),
      );
      expect(errors.find((e) => e.property === field)).toBeUndefined();
    });
  });

  // 不具合修正 2026-08: 氏名（漢字）4項目は UI(DokusyaFormView.vue の KANJI_RE)
  // と同じく漢字・ひらがな・カタカナ・アルファベット・数字を許容し、記号は
  // 拒否する（従来は max-length のみで書式チェックが無かった）。
  describe('氏名（漢字）4項目 — KANJI_NAME_RE 書式チェック（不具合修正2026-08）', () => {
    const KANJI_FIELDS: Array<[string, string]> = [
      ['shimei_sei', '氏名（姓）'],
      ['shimei_mei', '氏名（名）'],
      ['haitatsu_shimei_sei', '配達先氏名（姓）'],
      ['haitatsu_shimei_mei', '配達先氏名（名）'],
    ];

    it.each(KANJI_FIELDS)(
      'should fail when %s contains a symbol',
      async (field) => {
        const errors = await validateRow(
          buildImportRow({ [field]: '太郎！' }),
        );
        expect(errors.some((e) => e.property === field)).toBe(true);
      },
    );

    it.each(KANJI_FIELDS)('should pass when %s is kanji', async (field) => {
      const errors = await validateRow(buildImportRow({ [field]: '山田' }));
      expect(errors.find((e) => e.property === field)).toBeUndefined();
    });

    it.each(KANJI_FIELDS)(
      'should pass when %s is full-width katakana',
      async (field) => {
        const errors = await validateRow(
          buildImportRow({ [field]: 'ヤマダ' }),
        );
        expect(errors.find((e) => e.property === field)).toBeUndefined();
      },
    );

    it.each(KANJI_FIELDS)(
      'should pass when %s is half-width alphabet',
      async (field) => {
        const errors = await validateRow(
          buildImportRow({ [field]: 'Yamada' }),
        );
        expect(errors.find((e) => e.property === field)).toBeUndefined();
      },
    );
  });

  // 不具合修正 2026-08: 氏名かな4項目は全角ひらがなのみ許容し、半角文字・
  // カタカナ・英数字は拒否する（FE の HIRAGANA_RE と同一文字集合）。
  // 最大文字数は既存の100文字のまま変更なし。
  describe('氏名かな4項目 — 全角ひらがなのみ許容・max 100文字（不具合修正2026-08）', () => {
    const KANA_FIELDS: Array<[string, string]> = [
      ['shimei_kana_sei', '氏名かな（姓）'],
      ['shimei_kana_mei', '氏名かな（名）'],
      ['haitatsu_shimei_kana_sei', '配達先氏名かな（姓）'],
      ['haitatsu_shimei_kana_mei', '配達先氏名かな（名）'],
    ];

    it.each(KANA_FIELDS)(
      'should fail when %s contains half-width katakana (半角カナ)',
      async (field) => {
        const errors = await validateRow(
          buildImportRow({ [field]: 'ﾔﾏﾀﾞ' }),
        );
        expect(errors.some((e) => e.property === field)).toBe(true);
      },
    );

    it.each(KANA_FIELDS)(
      'should fail when %s contains full-width katakana (カタカナ)',
      async (field) => {
        const errors = await validateRow(
          buildImportRow({ [field]: 'ヤマダ' }),
        );
        expect(errors.some((e) => e.property === field)).toBe(true);
      },
    );

    it.each(KANA_FIELDS)(
      'should fail when %s contains kanji',
      async (field) => {
        const errors = await validateRow(
          buildImportRow({ [field]: '山田' }),
        );
        expect(errors.some((e) => e.property === field)).toBe(true);
      },
    );

    it.each(KANA_FIELDS)(
      'should pass when %s is valid full-width hiragana',
      async (field) => {
        const errors = await validateRow(
          buildImportRow({ [field]: 'やまだ' }),
        );
        expect(errors.find((e) => e.property === field)).toBeUndefined();
      },
    );

    it.each(KANA_FIELDS)(
      'should fail when %s exceeds 100 characters',
      async (field) => {
        const errors = await validateRow(
          buildImportRow({ [field]: 'あ'.repeat(101) }),
        );
        expect(errors.some((e) => e.property === field)).toBe(true);
      },
    );

    it.each(KANA_FIELDS)(
      'should pass when %s is exactly 100 characters',
      async (field) => {
        const errors = await validateRow(
          buildImportRow({ [field]: 'あ'.repeat(100) }),
        );
        expect(errors.find((e) => e.property === field)).toBeUndefined();
      },
    );
  });

  describe('string max-length (#38 hanbaiten_code max 10)', () => {
    it('should fail when hanbaiten_code exceeds 10 characters', async () => {
      const errors = await validateRow(
        buildImportRow({ hanbaiten_code: 'H'.repeat(11) }),
      );
      expect(errors.some((e) => e.property === 'hanbaiten_code')).toBe(true);
    });
  });

  // ─── Excel numeric cells in VARCHAR columns (blankToUndef stringifies) ──
  // Excel stores numeric-looking values (郵便番号, 組合員コード, 引落口座番号)
  // as JS numbers; blankToUndef coerces number → string so @IsString does not
  // reject the row (which would collapse to one generic nested error).
  describe('Excel numeric cells coerced to string', () => {
    it('should accept a numeric yubin_no / kumiaiin_code / hikiotoshi_koza_no (Excel number cells)', async () => {
      const errors = await validateRow(
        buildImportRow({
          yubin_no: 1000012,
          kumiaiin_code: 12345,
          hikiotoshi_koza_no: 1234567,
        }),
      );
      const props = errors.map((e) => e.property);
      expect(props).not.toContain('yubin_no');
      expect(props).not.toContain('kumiaiin_code');
      expect(props).not.toContain('hikiotoshi_koza_no');
    });

    it('should still reject a numeric yubin_no whose length exceeds 7 after coercion', async () => {
      const errors = await validateRow(buildImportRow({ yubin_no: 12345678 }));
      expect(errors.some((e) => e.property === 'yubin_no')).toBe(true);
    });

    it('should coerce a numeric-string dokusya_busu to a number (blankOrNumber) and pass @IsNumber', async () => {
      const errors = await validateRow(buildImportRow({ dokusya_busu: '2' }));
      expect(errors.some((e) => e.property === 'dokusya_busu')).toBe(false);
    });

    it('should accept a numeric dokusya_busu cell (Excel number)', async () => {
      const errors = await validateRow(buildImportRow({ dokusya_busu: 3 }));
      expect(errors.some((e) => e.property === 'dokusya_busu')).toBe(false);
    });
  });
});
