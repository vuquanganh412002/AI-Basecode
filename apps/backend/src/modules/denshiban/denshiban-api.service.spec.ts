// 電子版連携 Pha 2 — 送信クライアント (`DenshibanApiService.send`) のユニットテスト。
//
// 契約: docs/design-vi/Denshiban-mapper/outbound-field-matrix.md §E
//   - HTTP は常に 200。成否はボディの `statusCode`。
//   - `timestamp` は send() が送信直前に打つ（epoch 秒）。
//
// `fetch` をモックするのでネットワークは不要。

import { createDecipheriv } from 'node:crypto';
import { ConfigService } from '@nestjs/config';

import { DenshibanApiService } from './denshiban-api.service';
import type { DenshibanPayload } from './denshiban-payload.builder';
import { DenshibanSyncException } from './denshiban-sync.exception';

/** 32byte = AES-256 の鍵長ちょうど（utf8 生バイト列として解決される）。 */
const KEY = '01234567890123456789012345678901';
const URL = 'https://denshiban.example.jp/readermanage/updateUserInfo';

const PAYLOAD: DenshibanPayload = {
  action_kbn: 'create',
  jacd_execute: '1234567890',
  first_name: '山田',
};

function buildService(config: Record<string, unknown> = {}): DenshibanApiService {
  const configService = {
    get: (key: string) =>
      ({ 'denshiban.apiUrl': URL, 'denshiban.commonKey': KEY, ...config })[key],
  } as unknown as ConfigService;
  return new DenshibanApiService(configService);
}

/** モック fetch — 呼ばれたボディを覗けるように保持する。 */
function mockFetch(body: unknown, status = 200) {
  const fn = jest.fn().mockResolvedValue({
    status,
    statusText: 'OK',
    ok: status < 400,
    headers: new Map(),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

/** send() が実際に送った平文を復号して取り出す（IV(12) + 本文 + Tag(16)）。 */
function decryptSentPayload(fetchMock: jest.Mock): Record<string, unknown> {
  const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
  const packet = Buffer.from(body.payload as string, 'base64');
  const iv = packet.subarray(0, 12);
  const tag = packet.subarray(packet.length - 16);
  const ciphertext = packet.subarray(12, packet.length - 16);

  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(KEY, 'utf8'), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString('utf8')) as Record<string, unknown>;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('DenshibanApiService.send', () => {
  it('statusCode=0 は成功として結果を返す', async () => {
    mockFetch({ statusCode: '0', id: '98765', message: 'OK' });

    const result = await buildService().send(PAYLOAD);

    expect(result).toEqual({ statusCode: '0', id: '98765', message: 'OK' });
  });

  it('平文を AES-256-GCM で暗号化し、payload キーに Base64 で載せる', async () => {
    const fetchMock = mockFetch({ statusCode: '0' });

    await buildService().send(PAYLOAD);

    const sent = decryptSentPayload(fetchMock);
    expect(sent).toMatchObject({
      action_kbn: 'create',
      jacd_execute: '1234567890',
      first_name: '山田',
    });
  });

  it('timestamp を送信直前に打つ（epoch 秒・10桁）', async () => {
    const fetchMock = mockFetch({ statusCode: '0' });
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T03:00:00Z'));

    try {
      await buildService().send(PAYLOAD);
      const sent = decryptSentPayload(fetchMock);
      // ペイロードに timestamp は含まれていなかった（builder は打たない）。
      expect(PAYLOAD.timestamp).toBeUndefined();
      expect(sent.timestamp).toBe(Math.floor(Date.parse('2026-07-14T03:00:00Z') / 1000));
      expect(String(sent.timestamp)).toHaveLength(10);
    } finally {
      jest.useRealTimers();
    }
  });

  it('statusCode!=0 は HTTP 200 でも DenshibanSyncException を投げる', async () => {
    mockFetch({ statusCode: 'P01', message: 'メールアドレスが重複しています' }, 200);

    await expect(buildService().send(PAYLOAD)).rejects.toBeInstanceOf(
      DenshibanSyncException,
    );
  });

  it('E05 は再送可、V12 は再送不可として分類される', async () => {
    mockFetch({ statusCode: 'E05', message: 'timeout' });
    await expect(buildService().send(PAYLOAD)).rejects.toMatchObject({
      statusCode: 'E05',
      retryable: true,
    });

    mockFetch({ statusCode: 'V12', message: 'invalid zip' });
    await expect(buildService().send(PAYLOAD)).rejects.toMatchObject({
      statusCode: 'V12',
      retryable: false,
    });
  });

  it('statusCode の無い応答は成功と誤認せず落とす', async () => {
    mockFetch({ message: 'unexpected' });

    await expect(buildService().send(PAYLOAD)).rejects.toThrow(/statusCode がありません/);
  });

  it('JSON でない応答（WAF の HTML 等）は落とす', async () => {
    mockFetch('<html>403 Forbidden</html>', 403);

    await expect(buildService().send(PAYLOAD)).rejects.toThrow(/JSONではありません/);
  });

  it('ネットワーク到達不可は一時障害として投げる', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;

    await expect(buildService().send(PAYLOAD)).rejects.toThrow(/到達できません/);
  });

  it('URL 未設定なら送信しない', async () => {
    const fetchMock = mockFetch({ statusCode: '0' });

    await expect(
      buildService({ 'denshiban.apiUrl': undefined }).send(PAYLOAD),
    ).rejects.toThrow(/DENSHIBAN_API_URL/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('共通鍵 未設定なら送信しない', async () => {
    const fetchMock = mockFetch({ statusCode: '0' });

    await expect(
      buildService({ 'denshiban.commonKey': '' }).send(PAYLOAD),
    ).rejects.toThrow(/DENSHIBAN_DB_COMMON_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
