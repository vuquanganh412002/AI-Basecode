import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Modal } from 'ant-design-vue';

import { confirmDelete } from '@/utils/confirm';

describe('confirmDelete (共通削除確認ダイアログ)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should open Modal.confirm with the unified 削除確認 / はい(danger) / いいえ options', () => {
    const spy = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({}) as never);

    confirmDelete('このXを削除してもよろしいですか？', () => {});

    expect(spy).toHaveBeenCalledTimes(1);
    const opts = spy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(opts.title).toBe('削除確認');
    expect(opts.content).toBe('このXを削除してもよろしいですか？');
    expect(opts.okText).toBe('はい');
    expect(opts.cancelText).toBe('いいえ');
    expect(opts.okType).toBe('danger');
  });

  it('should pass the caller onOk through as the dialog OK handler', async () => {
    const onOk = vi.fn();
    vi.spyOn(Modal, 'confirm').mockImplementation((opts) => {
      (opts as { onOk?: () => void }).onOk?.();
      return {} as never;
    });

    confirmDelete('削除しますか？', onOk);

    expect(onOk).toHaveBeenCalledTimes(1);
  });
});
