// Denshiban integration Phase 2 — unit tests for the send client
// (`DenshibanApiService.send`).
//
// Contract: docs/design-vi/Denshiban-mapper/outbound-field-matrix.md §E
//   - HTTP is always 200. Success/failure lives in the body's `statusCode`.
//   - `timestamp` is stamped by send() right before sending (epoch seconds).
//
// `fetch` is mocked, so no network is needed.

import { createDecipheriv } from 'node:crypto';
import { ConfigService } from '@nestjs/config';

import { buildDokusya } from '@test/fixtures/dokusya.factory';

import { DenshibanApiService } from './denshiban-api.service';
import type { DenshibanPayloadAssembler } from './outbound/denshiban-payload.assembler';
import type { DenshibanPayload } from './mapper/denshiban-payload.builder';
import { DenshibanApiException } from './outbound/denshiban-api.exception';

/** 32 bytes = exactly the AES-256 key length (resolved as a raw utf8 byte string). */
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

/** Mock fetch — retained so the body it was called with can be inspected. */
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

/** Decrypts and extracts the plaintext send() actually sent (IV(12) + body + Tag(16)). */
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
      // The payload carried no timestamp (the builder doesn't stamp one).
      expect(PAYLOAD.timestamp).toBeUndefined();
      expect(sent.timestamp).toBe(Math.floor(Date.parse('2026-07-14T03:00:00Z') / 1000));
      expect(String(sent.timestamp)).toHaveLength(10);
    } finally {
      jest.useRealTimers();
    }
  });

  it('statusCode!=0 は HTTP 200 でも DenshibanApiException を投げる', async () => {
    mockFetch({ statusCode: 'P01', message: 'メールアドレスが重複しています' }, 200);

    await expect(buildService().send(PAYLOAD)).rejects.toBeInstanceOf(
      DenshibanApiException,
    );
  });

  it('denshiban の statusCode を例外に保持する', async () => {
    mockFetch({ statusCode: 'V12', message: 'invalid zip' });

    await expect(buildService().send(PAYLOAD)).rejects.toMatchObject({
      statusCode: 'V12',
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

// ── sendNow — the business entry (gate + assemble + send) ──────────────────
// sendNow's contract:
//   1. Gate: only digital-only (2) subscribers are sent; both (3) / paper-only
//      (1) return null without assembling or POSTing.
//   2. Digital: assemble the payload then send() it, returning denshiban's response.
//   3. Unwired (no assembler) for a digital subscriber → throws (a silent no-op
//      would mean "we think we sent it but we didn't").
//   4. Denshiban errors are NOT swallowed — they propagate so the caller's tx rolls back.

const ASSEMBLED: DenshibanPayload = {
  action_kbn: 'create',
  jacd_execute: '0123456789',
  first_name: '山田',
};

function buildAssembler() {
  return {
    assemble: jest.fn().mockResolvedValue(ASSEMBLED),
  } as unknown as jest.Mocked<Pick<DenshibanPayloadAssembler, 'assemble'>>;
}

function buildServiceWith(
  assembler?: Pick<DenshibanPayloadAssembler, 'assemble'>,
  config: Record<string, unknown> = {},
): DenshibanApiService {
  const configService = {
    get: (key: string) =>
      ({ 'denshiban.apiUrl': URL, 'denshiban.commonKey': KEY, ...config })[key],
  } as unknown as ConfigService;
  return new DenshibanApiService(
    configService,
    assembler as DenshibanPayloadAssembler,
  );
}

describe('DenshibanApiService.sendNow', () => {
  it('電子版読者 (2) は組み立てて送信し、結果を返す', async () => {
    mockFetch({ statusCode: '0', id: '5001', message: '' });
    const assembler = buildAssembler();

    const result = await buildServiceWith(assembler).sendNow({
      dokusya: buildDokusya({ dokusyaId: 42, dokusyaShubetsu: 2 }),
      mode: 'create',
    });

    expect(assembler.assemble).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'create' }),
      undefined,
    );
    expect(result).toEqual({ statusCode: '0', id: '5001', message: '' });
  });

  it('併読 (3) は組み立ても送信もせず null', async () => {
    const assembler = buildAssembler();
    const fetchMock = mockFetch({ statusCode: '0' });

    const result = await buildServiceWith(assembler).sendNow({
      dokusya: buildDokusya({ dokusyaShubetsu: 3 }),
      mode: 'update',
      before: buildDokusya({ dokusyaShubetsu: 3 }),
    });

    expect(result).toBeNull();
    expect(assembler.assemble).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('紙のみ (1) は組み立ても送信もせず null', async () => {
    const assembler = buildAssembler();
    const fetchMock = mockFetch({ statusCode: '0' });

    const result = await buildServiceWith(assembler).sendNow({
      dokusya: buildDokusya({ dokusyaShubetsu: 1 }),
      mode: 'create',
    });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('manager を assembler にそのまま渡す（同一トランザクション接続で読む）', async () => {
    mockFetch({ statusCode: '0' });
    const assembler = buildAssembler();
    const manager = { marker: 'tx' } as never;

    await buildServiceWith(assembler).sendNow(
      { dokusya: buildDokusya({ dokusyaShubetsu: 2 }), mode: 'create' },
      manager,
    );

    expect(assembler.assemble).toHaveBeenCalledWith(expect.anything(), manager);
  });

  it('未配線（assembler 未注入）で電子版読者を送ると投げる', async () => {
    await expect(
      buildServiceWith(undefined).sendNow({
        dokusya: buildDokusya({ dokusyaShubetsu: 2 }),
        mode: 'create',
      }),
    ).rejects.toThrow(/未配線/);
  });

  it('電子版APIのエラーは握りつぶさず伝播する（呼び出し側の tx を巻き戻す）', async () => {
    mockFetch({ statusCode: 'P03', message: '会員が存在しません' });

    await expect(
      buildServiceWith(buildAssembler()).sendNow({
        dokusya: buildDokusya({ dokusyaShubetsu: 2 }),
        mode: 'create',
      }),
    ).rejects.toBeInstanceOf(DenshibanApiException);
  });
});
