// Drives src/composables/useNotify.ts. Lock the canonical Japanese
// copy for every CRUD-success verb so every screen renders the same
// phrasing. The toast wording is a customer-facing UI contract, not
// implementation detail — any change here ships in product copy.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ant-design-vue', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import { useNotify } from '@/composables/useNotify';

let success: ReturnType<typeof vi.fn>;
let error: ReturnType<typeof vi.fn>;
let warning: ReturnType<typeof vi.fn>;
let info: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  const { message } = await import('ant-design-vue');
  success = vi.mocked(message.success);
  error = vi.mocked(message.error);
  warning = vi.mocked(message.warning);
  info = vi.mocked(message.info);
  success.mockClear();
  error.mockClear();
  warning.mockClear();
  info.mockClear();
});

describe('useNotify — verb-only canonical toasts', () => {
  it('created() should toast `登録しました。`', () => {
    useNotify().created();
    expect(success).toHaveBeenCalledWith('登録しました。');
  });

  it('updated() should toast `更新しました。`', () => {
    useNotify().updated();
    expect(success).toHaveBeenCalledWith('更新しました。');
  });

  it('deleted() should toast `削除しました。`', () => {
    useNotify().deleted();
    expect(success).toHaveBeenCalledWith('削除しました。');
  });

  it('uploaded() should toast `アップロードしました。`', () => {
    useNotify().uploaded();
    expect(success).toHaveBeenCalledWith('アップロードしました。');
  });

  it('downloaded() should toast `ダウンロードを開始しました。`', () => {
    useNotify().downloaded();
    expect(success).toHaveBeenCalledWith('ダウンロードを開始しました。');
  });
});

describe('useNotify — generic passthrough helpers', () => {
  it('success(text) should pass arbitrary copy to message.success', () => {
    useNotify().success('カスタム成功');
    expect(success).toHaveBeenCalledWith('カスタム成功');
  });

  it('error(text) should pass arbitrary copy to message.error', () => {
    useNotify().error('予期しないエラー。');
    expect(error).toHaveBeenCalledWith('予期しないエラー。');
  });

  it('warning(text) should pass arbitrary copy to message.warning', () => {
    useNotify().warning('注意してください。');
    expect(warning).toHaveBeenCalledWith('注意してください。');
  });

  it('info(text) should pass arbitrary copy to message.info', () => {
    useNotify().info('情報メッセージ');
    expect(info).toHaveBeenCalledWith('情報メッセージ');
  });
});
