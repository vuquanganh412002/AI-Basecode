<script setup lang="ts">
// 口座振替データ出力画面 (ACSMS-SCR-020)
// 初期表示で JASTEM 委託者情報(m_ja) + 最終使用支店(m_shiten) を読み込み、
// 管理支店/支店/口座支店ドロップダウンを取得する。作成開始 で全銀フォーマット CSV を
// 生成・ダウンロードする。対象0件は BE が 404 (NO_TARGET_DATA) を返すため、wrapper が
// `{ error_code }` に正規化し、ここで MSG-020-002（対象データがありません。）を画面内表示。
// アクセス制御は route guard（meta.permission: 'koza_furikae.export'）が担う。
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth.store';
import { useNotify } from '@/composables/useNotify';
import { preventEnterImplicitSubmit } from '@/utils/form-keyboard';
import { downloadBlob } from '@/utils/download';
import { formatYen } from '@/utils/formatters';
import { tyokinShubetsuLabel } from '@/constants/tyokin-shubetsu';
import {
  getInitialKozaFurikae,
  previewKozaFurikae,
  exportKozaFurikae,
  exportKozaFurikaeExcel,
  type ExportKozaFurikaeBody,
  type KozaPreviewRow,
  type KozaFurikaeError,
  type KozaFurikaeErrorDetail,
} from '@/api/koza-furikae/koza-furikae';
import { getKanriShitenDropdown } from '@/api/kanri-shiten/kanri-shiten';
import {
  getShitenDropdown,
  getKozaShitenDropdown,
  type KozaShitenDropdownItem,
} from '@/api/shiten/shiten';

const authStore = useAuthStore();
const notify = useNotify();
const router = useRouter();

/** 失効単価エラーから購読者明細検索(ACSMS-SCR-014)へ遷移し、失効単価参照フィルタを初期適用する。 */
function goToDokusyaSearch(): void {
  void router.push({ name: 'DokusyaList', query: { inactive_tanka: '1' } });
}

interface FormState {
  target_month: string | undefined;
  hikiotoshi_date: string | undefined;
  kanri_shiten_ids: number[];
  shiten_ids: number[];
  koza_shiten_ids: number[];
  jastem_itakusha_code: string;
  jastem_itakusha_name: string;
  jastem_ja_code: string;
  jastem_ja_name: string;
  jastem_toriatsukai_tenpo_code: string;
  jastem_tenpo_name: string;
  jastem_tyokin_shubetsu: string;
  jastem_koza_no: string;
}

const formState = reactive<FormState>({
  target_month: undefined,
  hikiotoshi_date: undefined,
  kanri_shiten_ids: [],
  shiten_ids: [],
  koza_shiten_ids: [],
  jastem_itakusha_code: '',
  jastem_itakusha_name: '',
  jastem_ja_code: '',
  jastem_ja_name: '',
  jastem_toriatsukai_tenpo_code: '',
  jastem_tenpo_name: '',
  jastem_tyokin_shubetsu: '1', // 普通貯金（画面デフォルト）
  jastem_koza_no: '',
});

type FieldKey = Exclude<
  keyof FormState,
  'kanri_shiten_ids' | 'shiten_ids' | 'koza_shiten_ids'
>;
const fieldErrors = reactive<Record<FieldKey, string>>({
  target_month: '',
  hikiotoshi_date: '',
  jastem_itakusha_code: '',
  jastem_itakusha_name: '',
  jastem_ja_code: '',
  jastem_ja_name: '',
  jastem_toriatsukai_tenpo_code: '',
  jastem_tenpo_name: '',
  jastem_tyokin_shubetsu: '',
  jastem_koza_no: '',
});

const submitting = ref(false);
const exportingExcel = ref(false);

// ── v1.1: プレビュー（作成開始）→ 金額編集 → ファイル作成 の2ステップ ──
const previewRows = ref<KozaPreviewRow[]>([]);
const previewed = ref(false); // 作成開始でプレビュー取得済み
const previewing = ref(false); // 作成開始のローディング
const noDataMessage = ref(false); // 対象0件（MSG-020-002）を画面内表示
const amountError = ref(''); // 金額編集の範囲外エラー（ファイル作成時）
const jastemError = ref(''); // JASTEM 情報未設定エラー（ファイル作成時）

// 失効単価参照エラー（409 INACTIVE_TANKA_REFERENCED）。作成開始/ファイル作成で
// 失効単価(active_flg=false)を参照する購読者が居れば、Excel取込画面と同様の
// インラインエラー一覧で該当購読者を提示する（トーストではない）。手動で単価変更後、
// 再度「作成開始」する運用。
const inactiveTankaErrors = ref<KozaFurikaeErrorDetail[]>([]);
const inactiveTankaMessage = ref('');
// 総該当件数（errors[] は先頭15件で打ち切り。全件は購読者明細検索で確認・変更）。
const inactiveTankaTotal = ref(0);

/** 失効単価エラーなら一覧をセットして true。それ以外は false（呼び出し側で従来処理）。 */
function applyInactiveTankaError(err: unknown): boolean {
  const e = err as KozaFurikaeError;
  if (e?.error_code !== 'INACTIVE_TANKA_REFERENCED') return false;
  inactiveTankaErrors.value = e.errors ?? [];
  inactiveTankaTotal.value = e.total ?? e.errors?.length ?? 0;
  inactiveTankaMessage.value =
    e.message ??
    '失効した単価を参照している購読者が存在するため、口座振替データを出力できません。該当購読者の単価を変更してから再度実行してください。';
  return true;
}

/** 失効単価エラー表示をクリアする。 */
function clearInactiveTankaError(): void {
  inactiveTankaErrors.value = [];
  inactiveTankaMessage.value = '';
  inactiveTankaTotal.value = 0;
}

// 「該当 N 件中 15 件を表示」等の要約。打ち切りがある場合のみ全件確認導線を出す。
const inactiveTankaSummary = computed(() => {
  const total = inactiveTankaTotal.value;
  const shown = inactiveTankaErrors.value.length;
  if (total > shown) {
    return `該当 ${total} 件中 ${shown} 件を表示しています。全件は購読者明細検索画面（「失効単価参照」絞込）で確認し、単価を変更してから再度「レポートプレビュー」してください。`;
  }
  return `該当購読者（${total}件）の単価を変更してから、再度「レポートプレビュー」してください。`;
});

/** プレビュー金額の合計（編集で変動）。 */
const totalKingaku = computed(() =>
  previewRows.value.reduce((a, r) => a + (Number(r.furikae_kingaku) || 0), 0),
);

// ── ドロップダウン選択肢 ──
const kanriShitenOptions = ref<Array<{ value: number; label: string }>>([]);
const shitenOptions = ref<Array<{ value: number; label: string }>>([]);
const kozaShitenOptions = ref<Array<{ value: number; label: string }>>([]);

// 選択した口座支店の JASTEM 金融機関支店情報（全フィールド）。Part B の表に
// 1行ずつ表示する。
const kozaShitenData = ref<KozaShitenDropdownItem[]>([]);
// 選択順に並べた表示用の行（未選択時は空 → 表は空欄）。
const selectedKozaRows = computed(() =>
  formState.koza_shiten_ids
    .map((id) => kozaShitenData.value.find((k) => k.shiten_id === id))
    .filter((k): k is KozaShitenDropdownItem => k != null),
);
// CSV(全銀フォーマット)の受取口座は1件のため、CSV 用の JASTEM 店舗情報は
// 先頭の選択口座支店を採用する。未選択時は空（必須バリデーションで作成不可）。
watch(selectedKozaRows, (rows) => {
  const first = rows[0];
  formState.jastem_toriatsukai_tenpo_code = first?.jastem_toriatsukai_tenpo_code ?? '';
  formState.jastem_tenpo_name = first?.jastem_tenpo_name ?? '';
  formState.jastem_tyokin_shubetsu = first?.jastem_tyokin_shubetsu ?? '1';
  formState.jastem_koza_no = first?.jastem_koza_no ?? '';
});

const REQUIRED_MSG = '必須項目です。'; // ACSMS-MSG-020-004

const FIELD_ORDER: FieldKey[] = [
  'target_month',
  'hikiotoshi_date',
  'jastem_itakusha_code',
  'jastem_itakusha_name',
  'jastem_ja_code',
  'jastem_ja_name',
  'jastem_toriatsukai_tenpo_code',
  'jastem_tenpo_name',
  'jastem_tyokin_shubetsu',
  'jastem_koza_no',
];

onMounted(async () => {
  await Promise.all([loadInitial(), loadDropdowns()]);
});

async function loadInitial(): Promise<void> {
  try {
    const resp = await getInitialKozaFurikae();
    const d = resp.data;
    // Part A（委託者・農協）は m_ja 由来。常に表示する。
    formState.jastem_itakusha_code = d.jastem_itakusha_code ?? '';
    formState.jastem_itakusha_name = d.jastem_itakusha_name ?? '';
    formState.jastem_ja_code = d.jastem_ja_code ?? '';
    formState.jastem_ja_name = d.jastem_ja_name ?? '';
    // Part B（金融機関支店）は選択した口座支店由来のため初期データでは設定しない
    //（未選択時は空 → 表は空欄、CSV 用フィールドも空でバリデーション不可）。
  } catch {
    // 403/500 は集約 axios インターセプタがトースト済み。初期値のまま継続。
  }
}

async function loadDropdowns(): Promise<void> {
  const jaId = authStore.user?.ja_id ?? 0;
  try {
    const [kanri, shiten, koza] = await Promise.all([
      getKanriShitenDropdown(jaId),
      // 支店絞込は金融機関支店以外（kinyu_shiten_flg=false）のみ。
      // 口座支店ピッカー(kinyu_shiten_flg=true)と相補的に分ける。
      getShitenDropdown({ kinyu_shiten_flg: false }),
      getKozaShitenDropdown(),
    ]);
    kanriShitenOptions.value = kanri.data.map((r) => ({
      value: r.kanri_shiten_id,
      label: r.kanri_shiten_name,
    }));
    shitenOptions.value = shiten.data.map((r) => ({
      value: r.shiten_id,
      label: `${r.shiten_code} - ${r.shiten_name}`,
    }));
    kozaShitenData.value = koza.data;
    kozaShitenOptions.value = koza.data.map((r) => ({
      value: r.shiten_id,
      label: `${r.shiten_code} - ${r.shiten_name}`,
    }));
  } catch {
    // インターセプタがトースト済み。空のまま継続。
  }
}

// 金額の上限（Zengin 引落金額10桁・D3）。
const KINGAKU_MAX = 9_999_999_999;

// JASTEM 情報（Part A: 委託者/農協 = m_ja、Part B: 店舗/口座 = 選択した口座支店 m_shiten）。
// 全て readonly 表示のため、未設定時は <a-form-item :help> ではなくセクションの
// エラーバナー（jastemError）でまとめて通知する。
const JASTEM_FIELDS: FieldKey[] = [
  'jastem_itakusha_code',
  'jastem_itakusha_name',
  'jastem_ja_code',
  'jastem_ja_name',
  'jastem_toriatsukai_tenpo_code',
  'jastem_tenpo_name',
  'jastem_tyokin_shubetsu',
  'jastem_koza_no',
];

/** 作成開始（プレビュー）用: 年月日・引落日 のみ必須（D8）。 */
function validateForPreview(): boolean {
  const dateKeys: FieldKey[] = ['target_month', 'hikiotoshi_date'];
  for (const k of dateKeys) fieldErrors[k] = '';
  for (const k of dateKeys) {
    if (!formState[k]?.trim()) fieldErrors[k] = REQUIRED_MSG;
  }
  return dateKeys.every((k) => !fieldErrors[k]);
}

/** ファイル作成用: JASTEM 全項目（必須+形式）+ 編集金額の範囲チェック（D8）。 */
function validateForCreate(): boolean {
  for (const k of FIELD_ORDER) fieldErrors[k] = '';
  amountError.value = '';
  jastemError.value = '';

  // 必須チェック（クリア可能コントロールは undefined になりうるため ?.trim()）。
  for (const k of FIELD_ORDER) {
    const v = formState[k];
    if (!v?.trim()) fieldErrors[k] = REQUIRED_MSG;
  }

  // JASTEM 情報が1つでも未設定なら、readonly セクションにまとめてエラーを出す。
  // （口座支店 未選択や JA/支店マスタ未登録が原因 → 出力させない）。
  if (JASTEM_FIELDS.some((k) => !formState[k]?.trim())) {
    jastemError.value =
      'JASTEM委託者情報・金融機関支店情報が未設定のため出力できません。口座支店を選択し、JASTEM情報をご確認ください。';
  }

  // 形式チェック（BE DTO のミラー、非空のときのみ）。
  if (!fieldErrors.jastem_itakusha_code && formState.jastem_itakusha_code &&
      !/^[0-9A-Za-z]{1,10}$/.test(formState.jastem_itakusha_code)) {
    fieldErrors.jastem_itakusha_code = '委託者コードは半角英数字10桁以内で入力してください。';
  }
  if (!fieldErrors.jastem_ja_code && formState.jastem_ja_code &&
      !/^\d{1,4}$/.test(formState.jastem_ja_code)) {
    fieldErrors.jastem_ja_code = '農協番号は半角数字4桁以内で入力してください。';
  }
  if (!fieldErrors.jastem_toriatsukai_tenpo_code && formState.jastem_toriatsukai_tenpo_code &&
      !/^\d{1,3}$/.test(formState.jastem_toriatsukai_tenpo_code)) {
    fieldErrors.jastem_toriatsukai_tenpo_code = 'データ送信取扱店舗コードは半角数字3桁以内で入力してください。';
  }
  if (!fieldErrors.jastem_koza_no && formState.jastem_koza_no &&
      !/^\d{1,7}$/.test(formState.jastem_koza_no)) {
    fieldErrors.jastem_koza_no = '口座番号は半角数字7桁以内で入力してください。';
  }

  // 金額（プレビュー編集値）: 0〜10桁の整数。a-input-number でも制約するが二重で担保。
  const badAmount = previewRows.value.some((r) => {
    const n = Number(r.furikae_kingaku);
    return !Number.isInteger(n) || n < 0 || n > KINGAKU_MAX;
  });
  if (badAmount) amountError.value = '金額は0以上10桁以内の半角数字で入力してください。';

  return (
    FIELD_ORDER.every((k) => !fieldErrors[k]) &&
    !amountError.value &&
    !jastemError.value
  );
}

function buildBody(): ExportKozaFurikaeBody {
  return {
    target_month: formState.target_month as string,
    hikiotoshi_date: formState.hikiotoshi_date as string,
    kanri_shiten_ids: formState.kanri_shiten_ids,
    shiten_ids: formState.shiten_ids,
    koza_shiten_ids: formState.koza_shiten_ids,
    jastem_itakusha_code: formState.jastem_itakusha_code,
    jastem_itakusha_name: formState.jastem_itakusha_name,
    jastem_ja_code: formState.jastem_ja_code,
    jastem_ja_name: formState.jastem_ja_name,
    jastem_toriatsukai_tenpo_code: formState.jastem_toriatsukai_tenpo_code,
    jastem_tenpo_name: formState.jastem_tenpo_name,
    jastem_tyokin_shubetsu: formState.jastem_tyokin_shubetsu,
    jastem_koza_no: formState.jastem_koza_no,
    // v1.1: プレビューで編集した金額を dokusya_id と一緒に送る。
    rows: previewRows.value.map((r) => ({
      dokusya_id: r.dokusya_id,
      furikae_kingaku: Number(r.furikae_kingaku) || 0,
    })),
  };
}

/** 作成開始 = プレビュー一覧を取得（DB/S3 書込なし）。 */
async function onPreview(): Promise<void> {
  if (!validateForPreview()) return;
  if (previewing.value) return;
  previewing.value = true;
  noDataMessage.value = false;
  clearInactiveTankaError();
  try {
    const res = await previewKozaFurikae({
      target_month: formState.target_month as string,
      hikiotoshi_date: formState.hikiotoshi_date as string,
      kanri_shiten_ids: formState.kanri_shiten_ids,
      shiten_ids: formState.shiten_ids,
      koza_shiten_ids: formState.koza_shiten_ids,
    });
    previewRows.value = res.data;
    previewed.value = true;
  } catch (err) {
    // 失効単価参照（409）→ インラインエラー一覧で該当購読者を提示。
    // 対象0件（NO_TARGET_DATA）→ 画面内メッセージ（MSG-020-002）。
    // 他は集約インターセプタがトースト済み。
    previewed.value = false;
    previewRows.value = [];
    if (applyInactiveTankaError(err)) return;
    if ((err as { error_code?: string })?.error_code === 'NO_TARGET_DATA') {
      noDataMessage.value = true;
    }
  } finally {
    previewing.value = false;
  }
}

/** ファイル作成 = 編集金額を送信して全銀CSVを生成・ダウンロード。 */
async function onCreateFile(): Promise<void> {
  if (!validateForCreate()) return;
  if (submitting.value) return;
  submitting.value = true;
  clearInactiveTankaError();
  try {
    const { blob, filename } = await exportKozaFurikae(buildBody());
    // ファイル名はサーバ（口座振替データ_YYYY年MM月DD日・拡張子なし）が決めるため
    // Content-Disposition から受け取る。取得できないときのみ同名パターンをここで
    // 組み立ててフォールバックする。
    const [y, m, d] = (formState.hikiotoshi_date as string).split('-');
    downloadBlob(blob, filename ?? `口座振替データ_${y}年${m}月${d}日`);
    notify.success('口座振替データの作成が完了しました。'); // ACSMS-MSG-020-001
  } catch (err) {
    // 失効単価参照（409）→ インラインエラー一覧で該当購読者を提示（プレビュー〜作成
    // の間に単価が失効した場合等）。プレビュー破棄して再作成を促す。
    if (applyInactiveTankaError(err)) {
      previewed.value = false;
      previewRows.value = [];
      return;
    }
    // プレビュー〜作成の間にデータが消えた等で 0 件になった場合（MSG-020-002）。
    // 他は集約インターセプタがトースト済み（MSG-020-003 等）。
    if ((err as { error_code?: string })?.error_code === 'NO_TARGET_DATA') {
      message.warning('対象データがありません。'); // ACSMS-MSG-020-002
    }
  } finally {
    submitting.value = false;
  }
}

/**
 * Excel出力 = レポートプレビューの内容（預金者名/引落支店/口座番号/金額）を
 * Excel で出力・自動ダウンロードする。全銀フォーマット（ファイル作成）とは
 * 別の読み取り専用出力で、t_koza_furikae は更新しない。
 */
async function onExportExcel(): Promise<void> {
  if (!validateForCreate()) return;
  if (exportingExcel.value) return;
  exportingExcel.value = true;
  clearInactiveTankaError();
  try {
    const { blob, filename } = await exportKozaFurikaeExcel(buildBody());
    const [y, m, d] = (formState.hikiotoshi_date as string).split('-');
    downloadBlob(blob, filename ?? `口座振替データ_${y}年${m}月${d}日.xlsx`);
    notify.downloaded();
  } catch (err) {
    if (applyInactiveTankaError(err)) {
      previewed.value = false;
      previewRows.value = [];
      return;
    }
    if ((err as { error_code?: string })?.error_code === 'NO_TARGET_DATA') {
      message.warning('対象データがありません。'); // ACSMS-MSG-020-002
    }
  } finally {
    exportingExcel.value = false;
  }
}

// D1: フィルタ（年月日/管理支店/支店/口座支店）を変更したらプレビューを破棄し、
// 「作成開始」の再実行を要求する（古いプレビューでファイル作成させない）。
watch(
  () => [
    formState.target_month,
    formState.kanri_shiten_ids,
    formState.shiten_ids,
    formState.koza_shiten_ids,
  ],
  () => {
    if (previewed.value) {
      previewed.value = false;
      previewRows.value = [];
    }
    noDataMessage.value = false;
    amountError.value = '';
    jastemError.value = '';
    clearInactiveTankaError();
  },
  { deep: true },
);

defineExpose({
  formState,
  previewRows,
  previewed,
  noDataMessage,
  inactiveTankaErrors,
  inactiveTankaTotal,
  onPreview,
  onCreateFile,
  onExportExcel,
});
</script>

<template>
  <a-form
    layout="vertical"
    :model="formState"
    class="space-y-6"
    @keydown="preventEnterImplicitSubmit"
  >
    <!-- ❶ 出力設定（年月日 / 引落日 / 支店絞込） -->
    <section class="bg-surface-card border border-border rounded-ant p-6">
      <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">出力設定</h3>

      <div class="space-y-6">
        <!-- 年月日 / 引落日 -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 gap-4">
          <a-form-item
            name="target_month"
            :validate-status="fieldErrors.target_month ? 'error' : ''"
            :help="fieldErrors.target_month"
          >
            <template #label>
              <span>年月日</span><span class="text-error ml-1">*</span>
            </template>
            <a-date-picker
              v-model:value="formState.target_month"
              value-format="YYYY-MM-DD"
              format="YYYY/MM/DD"
              placeholder="YYYY/MM/DD"
              class="w-full"
            />
          </a-form-item>

          <a-form-item
            name="hikiotoshi_date"
            :validate-status="fieldErrors.hikiotoshi_date ? 'error' : ''"
            :help="fieldErrors.hikiotoshi_date"
          >
            <template #label>
              <span>引落日</span><span class="text-error ml-1">*</span>
            </template>
            <a-date-picker
              v-model:value="formState.hikiotoshi_date"
              value-format="YYYY-MM-DD"
              format="YYYY/MM/DD"
              placeholder="YYYY/MM/DD"
              class="w-full"
            />
          </a-form-item>
        </div>

        <!-- 管理支店 / 支店 -->
        <div class="grid grid-cols-1 @lg:grid-cols-2 gap-4">
          <a-form-item label="管理支店" name="kanri_shiten_ids">
            <a-select
              v-model:value="formState.kanri_shiten_ids"
              mode="multiple"
              :options="kanriShitenOptions"
              placeholder="選択してください"
              allow-clear
              class="w-full"
            />
          </a-form-item>

          <a-form-item label="支店" name="shiten_ids">
            <a-select
              v-model:value="formState.shiten_ids"
              mode="multiple"
              :options="shitenOptions"
              placeholder="選択してください"
              allow-clear
              class="w-full"
            />
          </a-form-item>
        </div>

        <!-- 口座支店 -->
        <a-form-item label="口座支店" name="koza_shiten_ids">
          <a-select
            v-model:value="formState.koza_shiten_ids"
            mode="multiple"
            :options="kozaShitenOptions"
            placeholder="選択してください"
            allow-clear
            class="w-full"
          />
        </a-form-item>
      </div>
    </section>

    <!-- ❷ JASTEM委託者コード情報 -->
    <section class="bg-surface-card border border-border rounded-ant p-6">
      <h3 class="text-lg font-bold mb-6 pb-4 border-b border-border">
        JASTEM委託者コード情報
      </h3>

      <!-- JASTEM 未設定エラー（ファイル作成時に検証。readonly 項目のためここに集約表示） -->
      <a-alert
        v-if="jastemError"
        type="error"
        show-icon
        class="mb-4"
        :message="jastemError"
        data-test="jastem-error"
      />

      <!--
        顧客要件: JASTEM 情報は readonly 表示のみ（m_ja + 口座支店 m_shiten 由来）。
        値は formState に保持され、作成開始 時に CSV 用にそのまま送信する。
        Part A: 委託者/農協（m_ja）。Part B: 口座支店情報（m_shiten）を表で表示。
      -->
      <!-- Part A: 委託者コード/名・農協番号/名（m_ja） -->
      <div class="grid grid-cols-1 @lg:grid-cols-2 gap-x-8 gap-y-4">
        <div class="flex items-center gap-3">
          <span class="w-28 shrink-0 text-right text-sm text-text-description">委託者コード</span>
          <div
            class="flex-1 bg-surface-disabled border border-border rounded-ant px-3 py-1.5 text-sm text-text-main"
            data-test="jastem-itakusha-code"
          >
            {{ formState.jastem_itakusha_code || '—' }}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-28 shrink-0 text-right text-sm text-text-description">委託者名</span>
          <div class="flex-1 bg-surface-disabled border border-border rounded-ant px-3 py-1.5 text-sm text-text-main">
            {{ formState.jastem_itakusha_name || '—' }}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-28 shrink-0 text-right text-sm text-text-description">農協番号</span>
          <div class="flex-1 bg-surface-disabled border border-border rounded-ant px-3 py-1.5 text-sm text-text-main">
            {{ formState.jastem_ja_code || '—' }}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-28 shrink-0 text-right text-sm text-text-description">農協名</span>
          <div class="flex-1 bg-surface-disabled border border-border rounded-ant px-3 py-1.5 text-sm text-text-main">
            {{ formState.jastem_ja_name || '—' }}
          </div>
        </div>
      </div>

      <!-- Part B: 口座支店情報（m_shiten）を表で表示 -->
      <div class="mt-5 pt-5 border-t border-border overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-surface-card-subtle">
              <th class="border border-border px-3 py-2 text-left font-medium text-text-main">データ送信取扱店舗コード</th>
              <th class="border border-border px-3 py-2 text-left font-medium text-text-main">店舗名</th>
              <th class="border border-border px-3 py-2 text-left font-medium text-text-main">貯金種目</th>
              <th class="border border-border px-3 py-2 text-right font-medium text-text-main">口座番号</th>
            </tr>
          </thead>
          <tbody>
            <!-- 口座支店 未選択 → 空欄（行なし）。 -->
            <tr v-if="selectedKozaRows.length === 0">
              <td
                colspan="4"
                class="border border-border px-3 py-4 text-center text-text-secondary"
                data-test="koza-empty"
              >
                口座支店を選択してください。
              </td>
            </tr>
            <!-- 選択した口座支店ごとに1行（m_shiten 由来）。 -->
            <tr v-for="row in selectedKozaRows" :key="row.shiten_id">
              <td class="border border-border px-3 py-2 font-medium text-text-main">
                {{ row.jastem_toriatsukai_tenpo_code || '—' }}
              </td>
              <td class="border border-border px-3 py-2 text-text-main">
                {{ row.jastem_tenpo_name || '—' }}
              </td>
              <td class="border border-border px-3 py-2 text-text-main">
                {{ tyokinShubetsuLabel(row.jastem_tyokin_shubetsu) || '—' }}
              </td>
              <td class="border border-border px-3 py-2 text-right text-text-main">
                {{ row.jastem_koza_no || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 失効単価参照エラー（409）: 該当購読者を Excel取込画面と同様のインライン一覧で提示 -->
    <div
      v-if="inactiveTankaErrors.length > 0"
      data-test="inactive-tanka-error-list"
      class="border border-error/40 bg-error-subtle rounded-ant p-4 space-y-2"
    >
      <p class="text-sm font-semibold text-error" data-test="inactive-tanka-error-message">
        {{ inactiveTankaMessage }}
      </p>
      <p class="text-sm text-error" data-test="inactive-tanka-error-summary">
        {{ inactiveTankaSummary }}
      </p>
      <ul class="m-0 pl-0 list-none space-y-0.5">
        <li
          v-for="(e, idx) in inactiveTankaErrors"
          :key="idx"
          data-test="inactive-tanka-error-row"
          class="text-sm text-error"
        >
          購読者ID {{ e.field }}: {{ e.message }}
        </li>
      </ul>
      <div class="pt-1">
        <a-button
          size="small"
          data-test="goto-dokusya-search"
          @click="goToDokusyaSearch"
        >
          購読者明細検索へ（失効単価参照で絞込）
        </a-button>
      </div>
    </div>

    <!-- ❸ プレビュー一覧（作成開始で取得。金額を編集してファイル作成へ） -->
    <p
      v-if="noDataMessage"
      class="text-text-description text-sm"
      data-test="koza-no-data"
    >
      対象データがありません。
    </p>

    <section
      v-if="previewed"
      class="bg-surface-card border border-border rounded-ant p-6"
      data-test="preview-section"
    >
      <h3 class="text-lg font-bold mb-4 pb-4 border-b border-border">
        プレビュー（{{ previewRows.length }}件）
      </h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-surface-card-subtle">
              <th class="border border-border px-3 py-2 text-left font-medium text-text-main">預金者名</th>
              <th class="border border-border px-3 py-2 text-left font-medium text-text-main">引落支店</th>
              <th class="border border-border px-3 py-2 text-left font-medium text-text-main">口座番号</th>
              <th class="border border-border px-3 py-2 text-right font-medium text-text-main">金額</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in previewRows" :key="row.dokusya_id">
              <td class="border border-border px-3 py-2 text-text-main">{{ row.koza_meigi || '—' }}</td>
              <td class="border border-border px-3 py-2 text-text-main">
                {{ row.bank_branch_code }} {{ row.bank_branch_name }}
              </td>
              <td class="border border-border px-3 py-2 text-text-main">{{ row.hikiotoshi_koza_no || '—' }}</td>
              <td class="border border-border px-2 py-1 text-right">
                <a-input-number
                  v-model:value="row.furikae_kingaku"
                  :min="0"
                  :max="9999999999"
                  :precision="0"
                  :controls="false"
                  class="w-32 text-right"
                  :aria-label="`金額（${row.koza_meigi || row.hikiotoshi_koza_no || row.dokusya_id}）`"
                  :data-test="`kingaku-${row.dokusya_id}`"
                />
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bg-surface-card-subtle font-bold">
              <td class="border border-border px-3 py-2 text-text-main" colspan="3">合計</td>
              <td class="border border-border px-3 py-2 text-right text-text-main" data-test="total-kingaku">
                {{ formatYen(totalKingaku) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p v-if="amountError" class="text-error text-sm mt-2" data-test="amount-error">
        {{ amountError }}
      </p>
    </section>

    <!-- フッター：レポートプレビュー（旧称: 作成開始）→ ファイル作成。
         ACSMS-SCR-028/029 とボタン名を統一（顧客要件2026-08）。 -->
    <div class="flex items-center flex-wrap justify-start gap-2">
      <a-button
        type="primary"
        :loading="previewing"
        data-test="preview-btn"
        @click="onPreview"
      >
        レポートプレビュー
      </a-button>
      <a-button
        v-if="previewed && previewRows.length > 0"
        type="primary"
        :loading="submitting"
        data-test="create-btn"
        @click="onCreateFile"
      >
        ファイル作成
      </a-button>
      <a-button
        v-if="previewed && previewRows.length > 0"
        :loading="exportingExcel"
        data-test="export-excel-btn"
        @click="onExportExcel"
      >
        Excel出力
      </a-button>
    </div>
  </a-form>
</template>
