import { computed, ref, type Ref } from 'vue';
import { message } from 'ant-design-vue';

import { downloadBlob } from '@/utils/download';

/** プレビュー API のレスポンス（file-download / file-upload 共通形）。 */
export interface FilePreviewData {
  data: { preview_url: string; file_name: string };
}

/** 呼び出し側が渡す API 関数群（各画面のハンドラ書きラッパ）。 */
export interface FileDeliveryApi {
  getFilePreview: (id: number) => Promise<FilePreviewData>;
  downloadFile: (id: number) => Promise<Blob>;
  downloadFilesAsZip: (ids: number[]) => Promise<{ blob: Blob; filename: string }>;
}

export interface UseFileDeliveryOptions<T> {
  /** 一覧行（プレビュー可否・単一DL のファイル名解決に使う）。 */
  rows: Ref<T[]>;
  /** 行から一意 id を取り出す。 */
  idOf: (row: T) => number;
  /** 行のファイル名を取り出す。 */
  fileNameOf: (row: T) => string;
  /** 選択・プレビュー・DL 対象外の行か（削除済み等）。画面ごとに異なる。 */
  isRowDisabled: (row: T) => boolean;
  /** 各画面の API ラッパ。 */
  api: FileDeliveryApi;
  /**
   * API 失敗時のフック（任意）。画面固有のエラー処理（例: 404 → 専用トースト）に
   * 使う。未指定なら黙って無視する（global axios interceptor が 401/403/500 を
   * 集中トースト済みのため）。
   */
  onError?: (err: unknown) => void;
}

/** ブラウザがインライン表示できる形式（画像 / PDF）。 */
const PREVIEWABLE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|svg|pdf)$/i;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;

/** ブラウザでインラインプレビュー可能か（画像 / PDF）。 */
function isPreviewable(fileName: string): boolean {
  return PREVIEWABLE_EXTENSIONS.test(fileName);
}

/**
 * ファイル配信（チェックボックス選択 + プレビュー + ダウンロード）の共通ロジック。
 *
 * ファイルダウンロード画面(ACSMS-SCR-022) と ファイルアップロード画面(ACSMS-SCR-023) は
 * 「選択→プレビュー(画像/PDF)→単一DL / 複数ZIP」の挙動が同一のため集約する。
 * 行の無効化条件（削除済み / 日農DL不可 等）や対象エンティティは画面依存なので
 * `isRowDisabled` / `idOf` / `fileNameOf` / `api` で注入する。
 */
export function useFileDelivery<T>(opts: UseFileDeliveryOptions<T>) {
  const { rows, idOf, fileNameOf, isRowDisabled, api, onError } = opts;
  const handleError = (err: unknown): void => onError?.(err);

  /** チェックした id。 */
  const selectedIds = ref<number[]>([]);

  const rowSelectionConfig = computed(() => ({
    selectedRowKeys: selectedIds.value,
    onChange: (keys: (string | number)[]) => {
      selectedIds.value = keys.map(Number);
    },
    getCheckboxProps: (record: T) => ({ disabled: isRowDisabled(record) }),
  }));

  // プレビューモーダル。previewUrl は S3 署名付き URL。
  const previewOpen = ref(false);
  const previewUrl = ref('');
  const previewFileName = ref('');
  const isImagePreview = computed(() =>
    IMAGE_EXTENSIONS.test(previewFileName.value),
  );

  /** ちょうど1件選択 かつ プレビュー可能形式 のときだけプレビュー可。 */
  const canPreviewSelected = computed(() => {
    if (selectedIds.value.length !== 1) return false;
    const row = rows.value.find((r) => idOf(r) === selectedIds.value[0]);
    return !!row && !isRowDisabled(row) && isPreviewable(fileNameOf(row));
  });

  async function openPreviewById(id: number): Promise<void> {
    try {
      const resp = await api.getFilePreview(id);
      previewUrl.value = resp.data.preview_url;
      previewFileName.value = resp.data.file_name;
      previewOpen.value = true;
    } catch (err) {
      // 401/403/500 は global interceptor がトースト済み。404 等の画面固有処理は
      // onError フックへ委譲する（未指定なら黙って無視）。
      handleError(err);
    }
  }

  async function onPreview(): Promise<void> {
    if (selectedIds.value.length === 0) {
      message.warning('ファイルを選択してください。');
      return;
    }
    await openPreviewById(selectedIds.value[0]);
  }

  async function onPreviewRow(row: T): Promise<void> {
    if (isRowDisabled(row) || !isPreviewable(fileNameOf(row))) return;
    await openPreviewById(idOf(row));
  }

  async function onDownload(): Promise<void> {
    if (selectedIds.value.length === 0) {
      message.warning('ファイルを選択してください。');
      return;
    }
    // 複数選択は ZIP 1つにまとめる（サーバが命名）。
    if (selectedIds.value.length > 1) {
      try {
        const { blob, filename } = await api.downloadFilesAsZip([
          ...selectedIds.value,
        ]);
        downloadBlob(blob, filename);
        message.success('ダウンロードが完了しました。');
      } catch (err) {
        handleError(err);
      }
      return;
    }
    // 単一選択は元ファイルをそのまま。
    const id = selectedIds.value[0];
    const row = rows.value.find((r) => idOf(r) === id);
    const fallbackName = row ? fileNameOf(row) : `file_${id}`;
    try {
      const blob = await api.downloadFile(id);
      downloadBlob(blob, fallbackName);
      message.success('ダウンロードが完了しました。');
    } catch (err) {
      handleError(err);
    }
  }

  function clearSelection(): void {
    selectedIds.value = [];
    previewOpen.value = false;
    previewUrl.value = '';
  }

  return {
    selectedIds,
    rowSelectionConfig,
    previewOpen,
    previewUrl,
    previewFileName,
    isImagePreview,
    isPreviewable,
    canPreviewSelected,
    onPreview,
    onPreviewRow,
    onDownload,
    clearSelection,
  };
}
