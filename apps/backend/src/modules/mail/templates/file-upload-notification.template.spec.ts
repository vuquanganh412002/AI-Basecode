// ファイルアップロード通知メール template — pure function, no Nest DI / no IO.

import { renderFileUploadNotificationMail } from './file-upload-notification.template';

function render(
  overrides: { uploaderAccountName?: string; downloadUrl?: string } = {},
) {
  return renderFileUploadNotificationMail({
    jaName: 'JA北海道',
    fileName: 'Checklist_Project Management Audit.xlsx',
    uploadDatetime: new Date('2026-07-14T09:37:00Z'), // JST 18:37
    uploaderLoginId: 'chuokai01_zg',
    uploaderAccountName: '東京中央会 担当者',
    downloadUrl:
      'https://app.example.com/file-download?file_name=Checklist_Project%20Management%20Audit.xlsx',
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

  // 顧客要件2026-08: 本文にダウンロード画面(ACSMS-SCR-022)へのリンクを載せる
  // （2026-07 の「URL を含めない」方針からの変更）。
  it('should include the download link with a short guidance line', () => {
    const { text } = render();
    expect(text).toContain('下記のリンクからダウンロードしてください。');
    expect(text).toContain(
      'https://app.example.com/file-download?file_name=Checklist_Project%20Management%20Audit.xlsx',
    );
  });

  it('should drop the link block entirely when downloadUrl is empty', () => {
    // FRONTEND_URL 未設定環境で見出しだけ残ると不自然なため、行ごと落とす。
    const { text } = render({ downloadUrl: '' });
    expect(text).not.toContain('下記のリンクからダウンロードしてください。');
    expect(text).not.toContain('http');
    // 他の項目は従来どおり出ること。
    expect(text).toContain('アップロード者: chuokai01_zg');
  });
});
