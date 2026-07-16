// ファイルアップロード通知メール template — pure function, no Nest DI / no IO.

import { renderFileUploadNotificationMail } from './file-upload-notification.template';

function render(overrides: { uploaderAccountName?: string } = {}) {
  return renderFileUploadNotificationMail({
    jaName: 'JA北海道',
    fileName: 'Checklist_Project Management Audit.xlsx',
    uploadDatetime: new Date('2026-07-14T09:37:00Z'), // JST 18:37
    uploaderLoginId: 'chuokai01_zg',
    uploaderAccountName: '東京中央会 担当者',
    ...overrides,
  });
}

describe('renderFileUploadNotificationMail', () => {
  it('should put the system name + 【login + account name】 in the subject (顧客要件2026-07)', () => {
    expect(render().subject).toBe(
      '【クラウド版購読者管理システム】【chuokai01_zg 東京中央会 担当者】ファイルアップロードのお知らせ',
    );
  });

  it('should fall back to login only in the subject when account name is empty', () => {
    expect(render({ uploaderAccountName: '' }).subject).toBe(
      '【クラウド版購読者管理システム】【chuokai01_zg】ファイルアップロードのお知らせ',
    );
  });

  it('should list JA名 / ファイル名 / アップロード日時 / アップロード者', () => {
    const { text } = render();
    expect(text).toContain('JA名　　　　: JA北海道');
    expect(text).toContain('ファイル名　: Checklist_Project Management Audit.xlsx');
    expect(text).toContain('アップロード日時: 2026/07/14 18:37');
    expect(text).toContain('アップロード者: chuokai01_zg');
  });

  it('should include the 送信専用 footer', () => {
    expect(render().text).toContain(
      '※このメールは送信専用です。返信されてもご対応できません。',
    );
  });

  // 顧客要件2026-07: 環境依存の URL リンク・ダウンロード画面への遷移案内は含めない。
  it('should NOT include any download URL or screen-navigation guidance', () => {
    const { text } = render();
    expect(text).not.toContain('http');
    expect(text).not.toContain('file-download');
    expect(text).not.toContain('ファイルダウンロード画面にアクセス');
    expect(text).not.toContain('URL');
  });
});
