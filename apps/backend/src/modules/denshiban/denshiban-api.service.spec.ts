import type { ConfigService } from '@nestjs/config';

import { DenshibanApiService } from './denshiban-api.service';

/** AES-256 用のテスト鍵（64文字hex）。値そのものに意味はない。 */
const TEST_KEY = 'a'.repeat(64);
const TEST_URL = 'https://example.test/readermanage/updateUserInfo';

function buildService(): DenshibanApiService {
  const config = {
    get: (key: string) =>
      key === 'denshiban.apiUrl'
        ? TEST_URL
        : key === 'denshiban.commonKey'
          ? TEST_KEY
          : undefined,
  } as unknown as ConfigService;
  return new DenshibanApiService(config);
}

/** fetch を差し替え、指定の HTTP status / 本文を返させる。 */
function stubFetch(body: string, ok = true, status = 200): jest.Mock {
  const mock = jest.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Gateway',
    text: () => Promise.resolve(body),
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('DenshibanApiService.updateUserInfo — レスポンス解釈', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  /**
   * 本命の回帰テスト。実サーバは仕様書の `statusCode` ではなく `satusCd` を
   * 返す。これを読み落とすと成功 '0' すら空文字になり、push が永久に失敗する
   * （2026-07-29 に AWS 検証環境で発生した事象）。
   */
  it('実サーバのキー satusCd を読む', async () => {
    stubFetch('{"satusCd":"0","id":"12345","message":""}');

    await expect(buildService().updateUserInfo('create', {})).resolves.toEqual({
      statusCode: '0',
      id: '12345',
      message: '',
    });
  });

  it('satusCd のエラーコードをそのまま返す', async () => {
    stubFetch('{"satusCd":"P01","id":"","message":"重複"}');

    const res = await buildService().updateUserInfo('create', {});

    expect(res.statusCode).toBe('P01');
    expect(res.message).toBe('重複');
  });

  it('仕様書どおり statusCode で返るサーバにもフォールバックする', async () => {
    stubFetch('{"statusCode":"0","id":"777","message":""}');

    const res = await buildService().updateUserInfo('create', {});

    expect(res.statusCode).toBe('0');
    expect(res.id).toBe('777');
  });

  it('両方のキーが来たら実サーバ側 satusCd を優先する', async () => {
    stubFetch('{"satusCd":"V15","statusCode":"0","id":"","message":""}');

    await expect(
      buildService().updateUserInfo('create', {}),
    ).resolves.toMatchObject({ statusCode: 'V15' });
  });

  it('どちらのキーも無ければ空文字（未知の応答形）', async () => {
    stubFetch('{"id":"","message":"サーバーエラー"}');

    const res = await buildService().updateUserInfo('create', {});

    expect(res.statusCode).toBe('');
    expect(res.message).toBe('サーバーエラー');
  });

  it('JSON でない応答は本文付きで throw する', async () => {
    stubFetch('<html><body>502 Bad Gateway</body></html>');

    await expect(buildService().updateUserInfo('create', {})).rejects.toThrow(
      /JSON でない応答.*502 Bad Gateway/s,
    );
  });

  it('非2xx は本文付きで throw する', async () => {
    stubFetch('gateway timeout', false, 504);

    await expect(buildService().updateUserInfo('create', {})).rejects.toThrow(
      /HTTP 504.*gateway timeout/s,
    );
  });

  /**
   * P99「その他のエラー」だけでは原因が分からないため、失敗時は送信内容も
   * ログに出す。ただし CloudWatch に個人情報を残してはならない。
   */
  describe('失敗時のリクエストログ', () => {
    async function captureErrorLogs(): Promise<string[]> {
      const service = buildService();
      const logs: string[] = [];
      jest
        .spyOn(service['logger'], 'error')
        .mockImplementation((msg: unknown) => {
          logs.push(String(msg));
        });

      await service.updateUserInfo('create', {
        jacd_execute: '1275002003',
        pref_id: '13',
        profession: '999',
        first_name: '山田',
        email: 'taro@example.com',
        tel: '0312345678',
        building: '',
      });
      return logs;
    }

    it('調査に必要な区分値・識別子はそのまま残す', async () => {
      stubFetch('{"satusCd":"P99","id":"","message":"サーバーエラー"}');

      const sent = (await captureErrorLogs()).find((l) => l.includes('送信'));

      expect(sent).toContain('"jacd_execute":"1275002003"');
      expect(sent).toContain('"pref_id":"13"');
      expect(sent).toContain('"profession":"999"');
      expect(sent).toContain('"action_kbn":"create"');
    });

    it('個人情報は値を伏せ、長さだけ残す', async () => {
      stubFetch('{"satusCd":"P99","id":"","message":"サーバーエラー"}');

      const sent = (await captureErrorLogs()).find((l) => l.includes('送信'));

      expect(sent).not.toContain('山田');
      expect(sent).not.toContain('taro@example.com');
      expect(sent).not.toContain('0312345678');
      expect(sent).toContain('"first_name":"<len:2>"');
      expect(sent).toContain('"email":"<len:16>"');
      // 空文字を送っていたことは長さ0として判別できる必要がある。
      expect(sent).toContain('"building":"<empty>"');
    });

    it('成功時は送信内容をログに出さない', async () => {
      stubFetch('{"satusCd":"0","id":"1","message":""}');

      expect(await captureErrorLogs()).toEqual([]);
    });
  });

  it('apiUrl 未設定なら送信せずに throw する', async () => {
    const mock = stubFetch('{}');
    const config = { get: () => undefined } as unknown as ConfigService;

    await expect(
      new DenshibanApiService(config).updateUserInfo('create', {}),
    ).rejects.toThrow(/DENSHIBAN_API_URL/);
    expect(mock).not.toHaveBeenCalled();
  });
});
