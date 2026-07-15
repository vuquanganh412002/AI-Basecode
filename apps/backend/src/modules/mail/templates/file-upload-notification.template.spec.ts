// ファイルアップロード通知メール template — pure function, no Nest DI / no IO.

import { renderFileUploadNotificationMail } from './file-upload-notification.template';

function render() {
  return renderFileUploadNotificationMail({
    jaName: 'JA北海道',
    fileName: 'Checklist_Project Management Audit.xlsx',
    uploadDatetime: new Date('2026-07-14T09:37:00Z'), // JST 18:37
    uploaderLoginId: 'admin01',
  });
}

describe('renderFileUploadNotificationMail', () => {
  it('should return the customer-confirmed subject literal', () => {
    expect(render().subject).toBe(
      '【クラウド版購読者管理システム】ファイルアップロードのお知らせ',
    );
  });

  it('should list JA名 / ファイル名 / アップロード日時 / アップロード者', () => {
    const { text } = render();
    expect(text).toContain('JA名　　　　: JA北海道');
    expect(text).toContain('ファイル名　: Checklist_Project Management Audit.xlsx');
    expect(text).toContain('アップロード日時: 2026/07/14 18:37');
    expect(text).toContain('アップロード者: admin01');
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
