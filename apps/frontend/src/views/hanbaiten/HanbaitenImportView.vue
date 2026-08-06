<script setup lang="ts">
// ACSMS-SCR-019 — 販売店Excelデータ取込画面。
//
// 単一ページフォーム: Excel選択 → xlsx でクライアント parse → プレビュー →
// 取込列トグル → BE import エンドポイントへ送信。
//
// Spec 契約: src/views/hanbaiten/__tests__/HanbaitenImportView.spec.ts
//   - data-test セレクタが特定 DOM ノード（preview-section, import-submit-btn,
//     template-download-btn, select-all-checkbox, import-mode）を指すため変更不可。
//   - native `<select>`（<a-select> 不使用）で screen-design のモックに合わせ、
//     vitest の setValue が a-select 内部を経由せず動くようにする。
//   - native `<input type="checkbox" name="col" value="...">` で spec の
//     name+value セレクタが動く。antd `<a-checkbox>` でラップすると setValue が
//     wrapper を辿る必要が出る。

import { computed, reactive, ref, watch } from 'vue';
import { message, Modal } from 'ant-design-vue';
import * as XLSX from 'xlsx';

import { useAuthStore } from '@/stores/auth.store';
import {
  downloadHanbaitenImportTemplate,
  importHanbaitenExcel,
  type ImportMode,
  type ImportHanbaitenRow,
} from '@/api/hanbaiten/hanbaiten';
import { downloadBlob } from '@/utils/download';

/**
 * 23列の物理名リスト — 順序は api.md §テンプレートファイル仕様に厳密準拠。
 * この配列の index N が下の JP ヘッダ index N と checkbox `value` に対応する。
 */
const PHYSICAL_COLUMNS = [
  'hanbaiten_code',
  'hanbaiten_name',
  'hanbaiten_name_kana',
  'torihikisaki_no',
  'yubin_no',
  'address',
  'tel',
  'fax',
  'shocho_name',
  'itaku_kubun',
  'haitatsuryo_tanka_code',
  'bank_code',
  'bank_name',
  'haitatsuryo_shiharai_cycle',
  'bank_branch_code',
  'bank_branch_name',
  'yokin_shubetsu',
  'koza_no',
  'koza_meigi',
  'furikomi_tesuryo_futan_kubun',
  'furikomi_tesuryo',
  'biko',
  'haiten_flg',
] as const;
type PhysicalColumn = (typeof PHYSICAL_COLUMNS)[number];

/** 表示用 JP ヘッダ — BE の getImportTemplateColumns() と一致必須。 */
const JP_HEADERS: Record<PhysicalColumn, string> = {
  hanbaiten_code: '販売店コード',
  hanbaiten_name: '販売店名称',
  hanbaiten_name_kana: '販売店名称（カナ）',
  torihikisaki_no: 'インボイス番号',
  yubin_no: '郵便番号',
  address: '住所',
  tel: '電話番号',
  fax: 'FAX番号',
  shocho_name: '所長名',
  itaku_kubun: '委託区分',
  haitatsuryo_tanka_code: '配達手数料単価',
  bank_code: '金融機関コード',
  bank_name: '金融機関名',
  haitatsuryo_shiharai_cycle: '配達手数料支払サイクル',
  bank_branch_code: '口座支店コード',
  bank_branch_name: '口座支店名',
  yokin_shubetsu: '口座種別',
  koza_no: '口座番号',
  koza_meigi: '口座名義',
  furikomi_tesuryo_futan_kubun: '振込手数料負担区分',
  furikomi_tesuryo: '振込手数料',
  biko: '備考',
  haiten_flg: '廃店フラグ',
};

/**
 * Excel 列見出し → 物理列のマッピング。BE 配布テンプレートはこの JP 文字列を使う。
 * v1.0 以前の顧客ファイル互換のため半角 `販売店名称(カナ)` も受理する。
 */
const HEADER_TO_PHYSICAL: Record<string, PhysicalColumn> = (() => {
  const out: Record<string, PhysicalColumn> = {};
  for (const col of PHYSICAL_COLUMNS) {
    out[JP_HEADERS[col]] = col;
  }
  // [legacy-kana-header] 半角括弧も受理
  out['販売店名称(カナ)'] = 'hanbaiten_name_kana';
  out['販売店名称カナ'] = 'hanbaiten_name_kana';
  return out;
})();

const MAX_ROWS = 500;

// FE 表示値 → BE wire 値。短い ID は screen-design のモック・radio v-model に合わせ、
// submit 時に wire コードへ変換する。
// 取込モードは 新規登録 / 更新 の2択（顧客要件 2026-07：全項目更新を廃止）。
// 更新は選択列のみ更新。全列更新は「すべて選択」でチェックする。
const MODE_TO_BE: Record<string, ImportMode> = {
  new: 'NEW',
  update: 'UPDATE',
};

const IMPORT_MODE_OPTIONS: ReadonlyArray<{
  value: keyof typeof MODE_TO_BE;
  label: string;
}> = [
  { value: 'new', label: '新規登録' },
  { value: 'update', label: '更新' },
];

const authStore = useAuthStore();
const canImport = computed(() => authStore.hasPermission('hanbaiten.import'));

// ─── フォーム状態 ─────────────────────────────────────────────────────

/** モード select の FE 表示値（`new` / `update`）。 */
const importModeFe = ref<keyof typeof MODE_TO_BE>('new');

/** 選択列セット — 全物理列がチェック済みで開始。 */
const selected = reactive<Record<PhysicalColumn, boolean>>(
  PHYSICAL_COLUMNS.reduce(
    (acc, col) => {
      acc[col] = true;
      return acc;
    },
    {} as Record<PhysicalColumn, boolean>,
  ),
);

/**
 * モード別に強制チェック + disabled にする列（「取込列」ロックセット）。
 * ロック列はチェック外し不可。モード切替でそのセットを再チェックする。
 *
 *   new    (新規登録) — hanbaiten_code + hanbaiten_name + itaku_kubun +
 *                     furikomi_tesuryo_futan_kubun: 販売店コード/名称は NOT NULL、
 *                     委託区分/振込手数料負担区分は必須（顧客要件）なので新規行は
 *                     必ず取り込む → ロック。
 *   update (更新)     — hanbaiten_code のみ（アンカーキー）。他列は自由に選択可
 *                     （選択列のみ書込み、他は既存 DB 値を維持）。委託区分/
 *                     振込手数料負担区分は未選択なら既存値維持のためロック不要。
 *                     全列更新は「すべて選択」でチェックする。
 *
 * （銀行系の条件付き必須 — itaku_kubun=1 のとき必須 — は行単位で BE 検証、
 *   列ロックではない。）
 */
const REQUIRED_BY_MODE: Record<
  keyof typeof MODE_TO_BE,
  readonly PhysicalColumn[]
> = {
  new: [
    'hanbaiten_code',
    'hanbaiten_name',
    'itaku_kubun',
    'furikomi_tesuryo_futan_kubun',
  ],
  update: ['hanbaiten_code'],
};

/** 現モードでロック（checked + disabled）される列の集合。 */
const lockedCols = computed<Set<PhysicalColumn>>(
  () => new Set(REQUIRED_BY_MODE[importModeFe.value]),
);

function isLocked(col: PhysicalColumn): boolean {
  return lockedCols.value.has(col);
}

// モード切替（＋マウント immediate）で各列の初期チェック状態を設定する:
//   - locked 列  → チェック（新規: code+name / 更新: code）
//   - それ以外   → 新規登録は既定チェック / **更新は既定で未チェック**（顧客要件
//                  2026-07：更新は既定で列を選択しない。全列更新は「すべて選択」で
//                  チェックする）。
watch(
  importModeFe,
  () => {
    for (const col of PHYSICAL_COLUMNS) {
      selected[col] = isLocked(col) || importModeFe.value === 'new';
    }
  },
  { immediate: true },
);

/** parse 済み Excel 行。ファイル変更成功後に格納。 */
const parsedRows = ref<Array<Record<PhysicalColumn, unknown>>>([]);

const fileName = ref<string>('');
const submitting = ref(false);

/** 取込列パネルの開閉（dokusya import と同じ折りたたみ挙動）。 */
const panelCollapsed = ref(false);
function onPanelToggle(): void {
  panelCollapsed.value = !panelCollapsed.value;
}

/**
 * 直近取込の行単位/項目単位のサーバエラー。フォーム下の常設パネルに描画
 * （トーストではない）。`message.error` は '\n' を潰し複数行がスクロール不能な
 * 1行になるため、行 + 項目 + メッセージをスクロール可能な表で表示する。
 */
const importErrors = ref<ImportError[]>([]);

/**
 * 直近成功時の取込件数 — フォーム下の緑バナーに表示（dokusya 取込結果と同様）。
 * hanbaiten に 解約 / 履歴 概念はないため 登録 / 更新 / スキップ / 合計 のみ。
 */
const importResult = ref<{
  created_count: number;
  updated_count: number;
  skipped_count: number;
  total_rows: number;
} | null>(null);

/**
 * 構造化されたサーバ側取込エラーの型。各要素は 1始まりの Excel `row`
 * （ヘッダ = 行1）と `field`（物理列名 or `rows` / `selected_columns` 等の
 * トップレベル配列名）を持ちうる。
 */
type ImportError = { row?: number; field?: string; message: string };

/** トップレベル（非列）エラー項目の表示ラベル。 */
const TOP_LEVEL_FIELD_LABELS: Record<string, string> = {
  rows: '取込データ',
  selected_columns: '取込列',
};

/** エラーの `field`（列ヘッダ or トップレベル名）の日本語ラベル。 */
function errorFieldLabel(e: ImportError): string {
  if (!e.field) return '';
  return (
    JP_HEADERS[e.field as PhysicalColumn] ??
    TOP_LEVEL_FIELD_LABELS[e.field] ??
    e.field
  );
}

// ─── 派生 ─────────────────────────────────────────────────────────────

const hasFile = computed(() => parsedRows.value.length > 0);

const previewVisible = computed(() => hasFile.value);

/** プレビュー表が描画する列 — チェック済み。 */
const previewColumns = computed<PhysicalColumn[]>(() =>
  PHYSICAL_COLUMNS.filter((col) => selected[col]),
);

/** 'すべて選択' checkbox にバインド。 */
const allChecked = computed<boolean>({
  get: () => PHYSICAL_COLUMNS.every((col) => selected[col]),
  set: (value: boolean) => {
    for (const col of PHYSICAL_COLUMNS) {
      // [locked-column-pin] ロック列（モード依存、最低でも hanbaiten_code）は
      // 全解除時もチェック維持。
      selected[col] = isLocked(col) ? true : value;
    }
  },
});

// ─── ファイル変更 → xlsx parse → プレビュー ─────────────────────────

/** ACSMS-MSG-007-001 — ファイル形式エラー（screen-design.md §メッセージ情報）。 */
const FILE_FORMAT_ERROR_MSG =
  'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。';

/** Excel 拡張子チェック（.xlsx / .xls、大文字小文字無視）。 */
function isExcelFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xls');
}

/** ファイル形式エラー時：トースト表示 + プレビュー/入力をリセット。 */
function rejectInvalidFile(): void {
  message.error(FILE_FORMAT_ERROR_MSG);
  parsedRows.value = [];
  fileName.value = '';
  importErrors.value = [];
  resetFileInput();
}

async function onFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  // 新規ファイルは前回のエラーパネル + 結果バナーを無効化する。
  importErrors.value = [];
  importResult.value = null;

  // [format-guard] 拡張子チェックを parse の前に実施する。
  // `accept=".xlsx,.xls"` は file picker のフィルタ（advisory）でしかなく、
  // ドラッグ&ドロップや Safari ではバイパス可能。さらに XLSX.read は
  // CSV/TXT/HTML 等も例外を投げずにパースしてしまうため、catch だけでは
  // Excel 以外のファイルを検出できない（報告バグ）。
  if (!isExcelFileName(file.name)) {
    rejectInvalidFile();
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) throw new Error('empty workbook');
    const sheet = wb.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });
    // [header-mapping] sheet_to_json は行1のセル文字列をキーにする。
    // HEADER_TO_PHYSICAL で写像し未知列を落とす。spec の buildImportRow()
    // snake_case payload（fixture は物理名キーを直接渡す）にも対応。
    parsedRows.value = rawRows.map((r) => {
      const out: Record<PhysicalColumn, unknown> = {} as Record<
        PhysicalColumn,
        unknown
      >;
      for (const [key, value] of Object.entries(r)) {
        // JP ヘッダ or 物理名のどちらのキーも受理。
        const physical =
          (HEADER_TO_PHYSICAL[key] as PhysicalColumn | undefined) ??
          ((PHYSICAL_COLUMNS as readonly string[]).includes(key)
            ? (key as PhysicalColumn)
            : undefined);
        if (physical) out[physical] = value;
      }
      return out;
    });
  } catch {
    rejectInvalidFile();
  }
}

// ─── テンプレートダウンロード ─────────────────────────────────────────

async function onTemplateDownload(): Promise<void> {
  try {
    const blob = await downloadHanbaitenImportTemplate();
    downloadBlob(blob, '販売店Excelデータ取込_テンプレート.xlsx');
  } catch {
    // axios interceptor が既にトースト済み — ここでは黙って握る。
  }
}

// ─── submit ─────────────────────────────────────────────────────────

function onSubmit(): void {
  // 機能 7.1 — 確認モーダルを開く前のクライアント側ガード。
  if (!hasFile.value) {
    message.warning('Excelファイルを選択してください。');
    return;
  }
  if (parsedRows.value.length > MAX_ROWS) {
    message.error(`取込データ行数の上限（${MAX_ROWS}行）を超えています。`);
    return;
  }
  if (submitting.value) return;

  // ACSMS-MSG-007-002 — 確認ダイアログ文言。
  Modal.confirm({
    title: '取込処理',
    content: '取込処理を開始します。よろしいですか？',
    okText: 'はい',
    cancelText: 'いいえ',
    onOk: async () => {
      await runImport();
    },
  });
}

async function runImport(): Promise<void> {
  submitting.value = true;
  // パネルが現在の実行のみ反映するよう前回のエラー/件数をクリア。
  importErrors.value = [];
  importResult.value = null;
  try {
    // selected_columns — チェック済みの全列。checkbox が `disabled checked` の
    // ため hanbaiten_code は常に含まれる。
    const selectedCols = PHYSICAL_COLUMNS.filter((c) => selected[c]);
    // BE へ送る各行 — BE が受理する値のみを ImportHanbaitenRow の形で保持。
    // 物理列に一致する parse 済みキーを pass-through。
    const rows: ImportHanbaitenRow[] = parsedRows.value.map((r) => {
      const out: Record<string, unknown> = {};
      for (const col of PHYSICAL_COLUMNS) {
        if (r[col] !== undefined && r[col] !== '') {
          out[col] = r[col];
        }
      }
      // hanbaiten_code はセル空でも常に必須 — 空コードは BE が
      // IMPORT_VALIDATION_ERROR を返す（spec が行2/行3のインライン表示を担保）。
      if (out.hanbaiten_code === undefined) out.hanbaiten_code = '';
      return out as unknown as ImportHanbaitenRow;
    });

    const body = {
      import_mode: MODE_TO_BE[importModeFe.value],
      selected_columns: selectedCols,
      rows,
    };
    const res = await importHanbaitenExcel(body);
    // ACSMS-MSG-007-004 文言 — BE レスポンスをそのまま流す。
    message.success(res.message || '取り込みました。');
    // 取込件数を緑のバナーで表示（dokusya と同様）。
    importResult.value = {
      created_count: res.data?.created_count ?? 0,
      updated_count: res.data?.updated_count ?? 0,
      skipped_count: res.data?.skipped_count ?? 0,
      total_rows: res.data?.total_rows ?? 0,
    };
    // 機能 7.4 — 次回アップロードに向けて状態リセット。
    parsedRows.value = [];
    fileName.value = '';
    importErrors.value = [];
    resetFileInput();
  } catch (err) {
    const data = (
      err as {
        response?: {
          data?: {
            error_code?: string;
            message?: string;
            errors?: ImportError[];
          };
        };
      }
    )?.response?.data;
    const code = data?.error_code;
    const detail = Array.isArray(data?.errors) ? data.errors : [];

    if (
      (code === 'VALIDATION_ERROR' || code === 'IMPORT_VALIDATION_ERROR') &&
      detail.length > 0
    ) {
      // 行/項目単位の詳細はフォーム下の常設パネルに描画 — 1トーストに詰めない
      // （antd は '\n' を潰しスクロール不能な1行になる）。interceptor は両コードで
      // 沈黙（VALIDATION_ERROR は useApiForm 用でこの非フォーム画面は使わない、
      // IMPORT_VALIDATION_ERROR は VIEW_HANDLED_CODES）ので view が表示を持つ。
      // 短い要約トーストでパネルへ誘導する。
      importErrors.value = detail;
      message.error(`取込に失敗しました。${detail.length}件のエラーがあります。`);
    } else if (code === 'VALIDATION_ERROR') {
      // errors[] 配列なしの VALIDATION_ERROR — interceptor は沈黙のため
      // body message にフォールバック。
      message.error(data?.message || '入力値が不正です。');
    }
    // その他のコード（FILE_FORMAT_ERROR / ROW_LIMIT_EXCEEDED / CONFLICT /
    // DATA_SCOPE_VIOLATION / INTERNAL_SERVER_ERROR）は interceptor が
    // 既にトースト済み — ここで再トーストしない。
  } finally {
    submitting.value = false;
  }
}

/** native file input の template ref。`resetFileInput()` が value をクリアするのは:
 *  - 取込成功 / parse エラー後（表示ファイル名を parse 状態に合わせる。さもないと
 *    `parsedRows` が空なのに旧名が残り「Excelファイルを選択してください。」と誤解を招く）;
 *  - input の @click で OS picker が開く前（Excel 編集後の同一ファイル名再選択でも
 *    `change` が発火し再 parse される。value 不変だとブラウザは `change` を抑制する）。 */
const fileInputEl = ref<HTMLInputElement | null>(null);

function resetFileInput(): void {
  if (fileInputEl.value) fileInputEl.value.value = '';
}

function onColumnToggle(col: PhysicalColumn, el: HTMLInputElement): void {
  // [locked-column-veto-handler]
  // 多層防御: 実ブラウザでは `disabled` が `change` 発火を防ぐが、disabled-event
  // ガードのない環境（a11y ツール、vitest setValue）は発火させる。ロック列に
  // change が届いたら DOM を checked に戻して短絡 — 内部 boolean を絶対に反転させない。
  if (isLocked(col)) {
    el.checked = true;
    selected[col] = true;
    return;
  }
  selected[col] = el.checked;
}

// ヘルパー: プレビューセル値を描画（boolean → ✓/空, null → 空）。
function renderCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? '✓' : '';
  return String(value);
}
</script>

<template>
  <div class="space-y-6">
    <section
      class="bg-surface-card border border-border rounded-ant shadow-ant-card p-4"
    >
      <form class="space-y-4" @submit.prevent>
        <!-- Row 1（lg・5カラム）: [file ×2] [空き] [取込モード] [テンプレート右]。
             購読者取込(SCR-016)と同一グリッド（購読種別カラムは空きにする）にし、
             Excelファイル名入力の幅を SCR-016 と完全一致させる。 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-4 items-start">
          <div class="md:col-span-2 lg:col-span-2">
            <label
              class="block text-sm font-semibold text-text-main mb-1.5"
              for="file-input"
            >
              Excelファイル名
              <span class="text-error ml-1">*</span>
            </label>
            <!--
              ネイティブのファイル選択欄はボタン文言と未選択メッセージを
              ブラウザのロケールで表示し日本語に固定できないため、非表示にして
              日本語のカスタムボタン＋ファイル名表示に置き換える（機能は不変）。
              クリック時はピッカーを開く前に選択値をクリアし、同一ファイルの
              再選択でも再取り込みされるようにする。
            -->
            <div
              class="flex items-center gap-3 w-full border border-border-strong rounded bg-surface-card px-3 py-1"
            >
              <button
                type="button"
                class="shrink-0 rounded border-0 bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20 cursor-pointer"
                @click="fileInputEl?.click()"
              >
                ファイルを選択
              </button>
              <span class="text-sm text-text-description truncate">
                {{ fileName || 'ファイルが選択されていません。' }}
              </span>
            </div>
            <input
              id="file-input"
              ref="fileInputEl"
              type="file"
              accept=".xlsx,.xls"
              class="hidden"
              @click="resetFileInput"
              @change="onFileChange"
            />
          </div>

          <div>
            <span
              class="block text-sm font-semibold text-text-main mb-1.5"
              id="import-mode-label"
            >
              取込モード
              <span class="text-error ml-1">*</span>
            </span>
            <!-- [import-mode-radio] 顧客 2026-05-27 — ワンクリックのモード切替の
                 ため native dropdown からインライン radio へ変更。各 radio は
                 値ごとの test hook（IMPORT_MODE_OPTIONS 参照）を持ち、vitest が
                 親 select の setValue なしで特定オプションを狙える。 -->
            <div
              role="radiogroup"
              aria-labelledby="import-mode-label"
              data-test="import-mode"
              class="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1"
            >
              <label
                v-for="opt in IMPORT_MODE_OPTIONS"
                :key="opt.value"
                class="inline-flex items-center gap-1.5 text-sm text-text-main cursor-pointer"
              >
                <input
                  v-model="importModeFe"
                  type="radio"
                  name="import-mode"
                  :value="opt.value"
                  :data-test="`import-mode-${opt.value}`"
                  class="w-3.5 h-3.5 border-border-strong accent-primary focus:ring-primary/20"
                />
                {{ opt.label }}
              </label>
            </div>
          </div>

          <!-- 取込モードをファイル入力の直後に置き、テンプレートは右端に残すための
               空きカラム（lg のみ占有）。 -->
          <div class="hidden lg:block" aria-hidden="true"></div>

          <div
            class="md:col-span-2 lg:col-span-1 flex flex-col items-start md:items-end justify-end h-full md:pt-6"
          >
            <button
              data-test="template-download-btn"
              type="button"
              class="flex items-center justify-center gap-1.5 px-3 py-[7px] text-sm font-medium text-primary border border-primary/40 rounded hover:bg-primary/5 transition-colors whitespace-nowrap"
              @click="onTemplateDownload"
            >
              <span class="material-icons text-[16px]">download</span>
              テンプレート
            </button>
          </div>
        </div>

        <!-- 取込列セレクタのアコーディオン -->
        <div class="border border-border rounded">
          <div
            class="w-full flex items-center justify-between px-4 py-2.5 bg-surface-card-subtle"
          >
            <div class="flex items-center">
              <button
                data-test="col-toggle"
                type="button"
                class="flex items-center gap-1.5 text-sm font-semibold text-text-main"
                :aria-expanded="!panelCollapsed"
                @click="onPanelToggle"
              >
                <span class="material-icons text-[18px]">
                  {{ panelCollapsed ? 'chevron_right' : 'expand_more' }}
                </span>
                取込列
              </button>
              <span
                v-if="importModeFe === 'update'"
                class="ml-2 text-xs font-normal text-text-secondary"
              >
                更新は選択した列のみ対象です。全列を更新する場合は「すべて選択」にチェックしてください。
              </span>
            </div>
            <label
              class="flex items-center gap-1.5 text-xs text-text-description cursor-pointer"
            >
              <input
                v-model="allChecked"
                name="select-all-columns"
                data-test="select-all-checkbox"
                type="checkbox"
                class="w-3.5 h-3.5 rounded border-border-strong accent-primary focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
              すべて選択／解除
            </label>
          </div>

          <div v-show="!panelCollapsed" data-test="col-panel" class="px-4 py-3">
            <div
              class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
            >
              <label
                v-for="col in PHYSICAL_COLUMNS"
                :key="col"
                class="flex items-center gap-3 px-3 py-2 border border-border rounded cursor-pointer hover:bg-surface-hover transition-colors"
              >
                <!-- [locked-column-veto]
                     `:disabled` だけでは不十分: jsdom（や一部 a11y override /
                     vitest setValue）は disabled input でも `change` を発火し
                     `.checked` を切り替える。`:checked` + カスタム `@change` で
                     ロック列は JS 層でもチェック外しを無視する。ロック対象は
                     モード依存（REQUIRED_BY_MODE 参照）。 -->
                <input
                  type="checkbox"
                  name="col"
                  :value="col"
                  :checked="selected[col]"
                  :disabled="isLocked(col)"
                  class="w-4 h-4 rounded border-border-strong accent-primary focus:ring-primary/20 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                  @change="(e) => onColumnToggle(col, e.target as HTMLInputElement)"
                />
                <span class="text-sm text-text-main">{{ JP_HEADERS[col] }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- プレビュー -->
        <div
          v-if="previewVisible"
          data-test="preview-section"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-text-main">
              <span class="text-primary">◆</span>
              取込データプレビュー
              <span class="text-xs font-normal text-text-secondary ml-2">
                {{ parsedRows.length }}件
              </span>
            </p>
          </div>
          <div
            class="overflow-x-auto border border-border rounded"
          >
            <table class="w-full text-sm border-collapse min-w-max">
              <thead>
                <tr class="bg-surface-card-subtle text-left">
                  <th
                    v-for="col in previewColumns"
                    :key="col"
                    class="px-3 py-2 text-sm font-semibold text-text-main border-b border-border"
                  >
                    {{ JP_HEADERS[col] }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIdx) in parsedRows"
                  :key="rowIdx"
                  class="border-b border-border"
                >
                  <td
                    v-for="col in previewColumns"
                    :key="col"
                    class="px-3 py-2 text-sm text-text-main"
                  >
                    {{ renderCell(row[col]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </form>

      <!-- 取込エラー — 行/項目単位の常設スクロールパネル -->
      <div
        v-if="importErrors.length > 0"
        data-test="import-error-panel"
        class="mt-4 border border-error rounded overflow-hidden"
      >
        <div class="px-4 py-2.5 bg-error-subtle flex items-center gap-2">
          <span class="material-icons text-error text-[18px]">error_outline</span>
          <span class="text-sm font-semibold text-error">
            取込エラー（{{ importErrors.length }}件）
          </span>
        </div>
        <div class="max-h-72 overflow-y-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="bg-surface-card-subtle text-left">
                <th
                  class="px-4 py-2 font-semibold text-text-main border-b border-border w-20"
                >
                  行
                </th>
                <th
                  class="px-4 py-2 font-semibold text-text-main border-b border-border w-48"
                >
                  項目
                </th>
                <th
                  class="px-4 py-2 font-semibold text-text-main border-b border-border"
                >
                  メッセージ
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(e, i) in importErrors"
                :key="i"
                class="border-b border-border"
              >
                <td class="px-4 py-2 text-text-main whitespace-nowrap">
                  {{ e.row != null ? `${e.row}行目` : '—' }}
                </td>
                <td class="px-4 py-2 text-text-main">
                  {{ errorFieldLabel(e) || '—' }}
                </td>
                <td class="px-4 py-2 text-error">{{ e.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 取込結果件数（緑バナー） — dokusya と同じ表示 -->
      <div
        v-if="importResult"
        data-test="import-result"
        class="mt-4 border border-success/40 bg-success-subtle rounded p-3 text-sm text-text-main"
      >
        取込件数：登録 {{ importResult.created_count }}件 / 更新
        {{ importResult.updated_count }}件 / スキップ
        {{ importResult.skipped_count }}件（合計 {{ importResult.total_rows }}件）
      </div>

      <div class="flex gap-3 pt-4">
        <button
          data-test="import-submit-btn"
          type="button"
          :disabled="!canImport || submitting"
          class="px-10 py-2 bg-primary hover:bg-primary-hover text-white rounded font-medium transition-colors shadow-ant-card text-sm disabled:bg-text-disabled disabled:cursor-not-allowed disabled:hover:bg-text-disabled ant-btn-disabled"
          :class="{ 'ant-btn-disabled': !canImport || submitting }"
          @click="onSubmit"
        >
          取込開始
        </button>
      </div>
    </section>
  </div>
</template>
