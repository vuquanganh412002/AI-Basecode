import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { message } from 'ant-design-vue';

import { useFileDelivery } from '@/composables/useFileDelivery';

vi.spyOn(message, 'warning').mockImplementation(() => undefined as any);
vi.spyOn(message, 'success').mockImplementation(() => undefined as any);

interface Row {
  id: number;
  name: string;
  deleted: boolean;
}

function setup(rowsData: Row[] = [{ id: 1, name: 'a.pdf', deleted: false }]) {
  const rows = ref<Row[]>(rowsData);
  const api = {
    getFilePreview: vi.fn(async () => ({
      data: { preview_url: 'https://x/signed', file_name: 'a.pdf' },
    })),
    downloadFile: vi.fn(async () => new Blob(['x'])),
    downloadFilesAsZip: vi.fn(async () => ({ blob: new Blob(['x']), filename: 'z.zip' })),
  };
  const onError = vi.fn();
  const d = useFileDelivery<Row>({
    rows,
    idOf: (r) => r.id,
    fileNameOf: (r) => r.name,
    isRowDisabled: (r) => r.deleted,
    api,
    onError,
  });
  return { rows, api, onError, d };
}

describe('useFileDelivery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('disables checkbox for a disabled (deleted) row', () => {
    const { d } = setup();
    expect(d.rowSelectionConfig.value.getCheckboxProps({ id: 9, name: 'x.pdf', deleted: true }).disabled).toBe(true);
    expect(d.rowSelectionConfig.value.getCheckboxProps({ id: 1, name: 'a.pdf', deleted: false }).disabled).toBe(false);
  });

  it('canPreviewSelected only when exactly one previewable row is selected', () => {
    const { d } = setup([
      { id: 1, name: 'a.pdf', deleted: false },
      { id: 2, name: 'b.csv', deleted: false },
    ]);
    d.selectedIds.value = [1];
    expect(d.canPreviewSelected.value).toBe(true); // pdf → previewable
    d.selectedIds.value = [2];
    expect(d.canPreviewSelected.value).toBe(false); // csv → not previewable
    d.selectedIds.value = [1, 2];
    expect(d.canPreviewSelected.value).toBe(false); // multiple
  });

  it('onPreview opens the modal with the signed url', async () => {
    const { d, api } = setup();
    d.selectedIds.value = [1];
    await d.onPreview();
    expect(api.getFilePreview).toHaveBeenCalledWith(1);
    expect(d.previewOpen.value).toBe(true);
    expect(d.previewUrl.value).toBe('https://x/signed');
  });

  it('onPreview warns and does nothing when nothing selected', async () => {
    const { d, api } = setup();
    d.selectedIds.value = [];
    await d.onPreview();
    expect(api.getFilePreview).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalledWith('ファイルを選択してください。');
  });

  it('onDownload downloads a single file directly', async () => {
    const { d, api } = setup();
    d.selectedIds.value = [1];
    await d.onDownload();
    expect(api.downloadFile).toHaveBeenCalledWith(1);
    expect(api.downloadFilesAsZip).not.toHaveBeenCalled();
  });

  it('onDownload bundles multiple files as ZIP', async () => {
    const { d, api } = setup([
      { id: 1, name: 'a.pdf', deleted: false },
      { id: 2, name: 'b.pdf', deleted: false },
    ]);
    d.selectedIds.value = [1, 2];
    await d.onDownload();
    expect(api.downloadFilesAsZip).toHaveBeenCalledWith([1, 2]);
    expect(api.downloadFile).not.toHaveBeenCalled();
  });

  it('invokes onError when an api call rejects', async () => {
    const { d, api, onError } = setup();
    api.downloadFile.mockRejectedValueOnce({ response: { status: 404 } });
    d.selectedIds.value = [1];
    await d.onDownload();
    expect(onError).toHaveBeenCalled();
  });

  it('clearSelection resets selection + preview', () => {
    const { d } = setup();
    d.selectedIds.value = [1];
    d.previewOpen.value = true;
    d.previewUrl.value = 'x';
    d.clearSelection();
    expect(d.selectedIds.value).toEqual([]);
    expect(d.previewOpen.value).toBe(false);
    expect(d.previewUrl.value).toBe('');
  });
});
