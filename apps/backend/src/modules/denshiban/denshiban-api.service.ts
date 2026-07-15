import { createCipheriv, randomBytes } from 'node:crypto';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { DenshibanPayload } from './denshiban-payload.builder';
import { DenshibanSyncException } from './denshiban-sync.exception';

/**
 * 顧客システム「電子版」の会員情報更新 共通API (`updateUserInfo`) クライアント。
 *
 * 仕様（顧客提供 "Common Flow"）:
 *   - HTTPS / POST, Content-Type: application/json, UTF-8
 *   - 平文JSON 全体を AES-256-GCM（共通鍵）で暗号化
 *   - パケット = IV(12B) + Ciphertext + AuthTag(16B) を連結し Base64 化
 *   - リクエストボディ = `{ "payload": "<Base64パケット>" }`
 *   - 平文JSON にリプレイ防止用の `timestamp`（epoch 秒）を含める
 *     （API開始 - timestamp <= 300秒。超過すると `E05`）
 *
 * ⚠️ **HTTP は常に 200**。成否はボディの `statusCode` にしかない。
 */
@Injectable()
export class DenshibanApiService implements OnApplicationBootstrap {
  private readonly logger = new Logger('DenshibanApi');

  /** 外部I/Oがハングしないための受信タイムアウト（ms）。 */
  private static readonly REQUEST_TIMEOUT_MS = 15_000;

  constructor(private readonly configService: ConfigService) {}

  // ───────────────────────────────────────────────────────────────────────
  // 本番経路 — ワーカー (`DenshibanSyncWorker`) からのみ呼ばれる
  // ───────────────────────────────────────────────────────────────────────

  /**
   * 平文ペイロードを暗号化して `updateUserInfo` に POST し、結果を返す。
   *
   * **`timestamp` はここで打つ** — build 時ではない。ジョブがキューで滞留したり
   * 再送で時間が経つと、build 時刻のままでは 300 秒を超えて `E05` になる。
   * 「送る直前の時刻」でなければ意味がない。
   *
   * @throws {DenshibanSyncException} `statusCode !== '0'`（業務エラー）。
   *   再送可否は `.retryable` を見る。
   * @throws {Error} 設定不備 / ネットワーク到達不可 / タイムアウト / 非JSON応答。
   *   いずれも一時障害の可能性があるため呼び出し側は再送してよい。
   */
  async send(payload: DenshibanPayload): Promise<DenshibanApiResult> {
    const url = this.configService.get<string>('denshiban.apiUrl');
    if (!url) {
      throw new Error(
        '電子版APIのURL (DENSHIBAN_API_URL) が未設定です。送信できません。',
      );
    }
    const rawKey = this.configService.get<string>('denshiban.commonKey') ?? '';
    if (!rawKey) {
      throw new Error(
        '電子版APIの共通鍵 (DENSHIBAN_DB_COMMON_KEY) が未設定です。送信できません。',
      );
    }

    // リプレイ防止用の処理時刻 — 仕様上ここだけ String ではなく数値(long)。
    const plaintext = JSON.stringify({
      ...payload,
      timestamp: Math.floor(Date.now() / 1000),
    });

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      DenshibanApiService.REQUEST_TIMEOUT_MS,
    );

    let text: string;
    let httpStatus: number;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ payload: this.encrypt(plaintext, rawKey) }),
        signal: controller.signal,
      });
      httpStatus = res.status;
      text = await res.text();
    } catch (err) {
      const isAbort = (err as Error).name === 'AbortError';
      throw new Error(
        isAbort
          ? `電子版APIがタイムアウトしました (${DenshibanApiService.REQUEST_TIMEOUT_MS}ms)。`
          : `電子版APIに到達できません: ${(err as Error).message}`,
        { cause: err },
      );
    } finally {
      clearTimeout(timer);
    }

    const result = this.parseResult(text, httpStatus);

    this.logger.log({
      event: 'denshiban.api.response',
      action_kbn: payload.action_kbn,
      // 会員IDは PII ではないが、氏名・住所・メールは載せない（平文は出さない）。
      statusCode: result.statusCode,
      httpStatus,
      durationMs: Date.now() - startedAt,
    });

    if (result.statusCode !== '0') {
      throw new DenshibanSyncException(
        result.statusCode,
        `電子版API (${payload.action_kbn}) がエラーを返しました: ` +
          `statusCode=${result.statusCode} ${result.message}`,
      );
    }

    return result;
  }

  /**
   * 応答ボディを {@link DenshibanApiResult} に正規化する。
   *
   * ⚠️ HTTP ステータスは **判定に使わない**（常に 200 が来る仕様）。ただし
   * 5xx + HTML など「そもそも電子版まで届いていない」ケースは JSON parse に
   * 失敗するので、そこで一時障害として弾かれる。
   */
  private parseResult(text: string, httpStatus: number): DenshibanApiResult {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(
        `電子版APIの応答がJSONではありません (HTTP ${httpStatus}): ${text.slice(0, 200) || '(空)'}`,
      );
    }

    const statusCode = body.statusCode ?? body.status_code;
    if (statusCode === undefined || statusCode === null) {
      // statusCode が無い応答は仕様違反。成功と誤認すると、送れていないのに
      // denshi_kaiin_id を書き込むなど静かな乖離を生む。必ず落とす。
      throw new Error(
        `電子版APIの応答に statusCode がありません (HTTP ${httpStatus}): ${text.slice(0, 200)}`,
      );
    }

    return {
      statusCode: String(statusCode),
      id: body.id === undefined || body.id === null ? undefined : String(body.id),
      message: body.message === undefined ? '' : String(body.message),
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // ⚠️ TEMPORARY — 疎通確認 ping（本番経路が安定したら本ブロックごと削除する）
  // ───────────────────────────────────────────────────────────────────────

  /**
   * 顧客は ECS の NAT IP だけを whitelist しているため、このAPIは開発端末からは
   * 到達できない。そこで ECS 起動時に1回だけ叩いて疎通を CloudWatch に出す。
   *
   * フラグ `DENSHIBAN_API_PING=true` のときだけ動く（既定 OFF）。全 action_kbn は
   * 「書き込み」なので、本物の action を投げると顧客システムにゴミ会員が増える。
   * よって「復号は通るが処理は不正」になる invalid probe を送り、サーバが構造化
   * エラーを返すことで NAT whitelist + TLS + 共通鍵での復号だけを確認する。
   */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.configService.get<boolean>('denshiban.apiPing')) return;

    const url = this.configService.get<string>('denshiban.apiUrl');
    if (!url) {
      this.logger.warn(
        '⏭️  updateUserInfo ping: denshiban.apiUrl 未設定のためスキップ。',
      );
      return;
    }

    const rawKey = this.configService.get<string>('denshiban.commonKey') ?? '';
    if (!rawKey || rawKey === 'examplestring') {
      this.logger.warn(
        '⏭️  updateUserInfo ping: 共通鍵 (DENSHIBAN_DB_COMMON_KEY) が未設定/ダミーのためスキップ。',
      );
      return;
    }

    await this.ping(url, rawKey);
  }

  /** invalid probe を1回 POST し、response を詳細ログに出す（best-effort）。 */
  private async ping(url: string, rawKey: string): Promise<void> {
    const startedAt = Date.now();
    const plainObj: Record<string, unknown> = {
      action_kbn: '__connectivity_probe__',
      timestamp: Math.floor(Date.now() / 1000),
    };

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      DenshibanApiService.REQUEST_TIMEOUT_MS,
    );

    try {
      const body = JSON.stringify({
        payload: this.encrypt(JSON.stringify(plainObj), rawKey),
      });

      this.logger.log(
        `🚀 updateUserInfo ping 開始 — url=${url} (invalid probe / 書き込みなし)`,
      );

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body,
        signal: controller.signal,
      });

      const text = await res.text();
      const headers = Object.fromEntries(res.headers.entries());
      const durationMs = Date.now() - startedAt;

      const block = [
        `📥 updateUserInfo ping 応答 (${durationMs}ms)`,
        `   ├─ HTTP status : ${res.status} ${res.statusText}`,
        `   ├─ headers     : ${JSON.stringify(headers)}`,
        `   └─ body        : ${text || '(空)'}`,
      ].join('\n');

      if (res.ok) {
        this.logger.log(block);
      } else {
        this.logger.warn(block);
      }
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const isAbort = (err as Error).name === 'AbortError';
      this.logger.error(
        `❌ updateUserInfo ping 失敗 (${durationMs}ms) — ${
          isAbort
            ? `タイムアウト(${DenshibanApiService.REQUEST_TIMEOUT_MS}ms)`
            : (err as Error).message
        }（NAT whitelist / DNS / TLS / WAF を確認）`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // 暗号
  // ───────────────────────────────────────────────────────────────────────

  /**
   * 平文を AES-256-GCM で暗号化し、IV(12B)+Ciphertext+Tag(16B) を Base64 で返す。
   */
  private encrypt(plaintext: string, rawKey: string): string {
    const key = this.resolveKey(rawKey);

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(plaintext, 'utf8')),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag(); // 16B
    return Buffer.concat([iv, ciphertext, tag]).toString('base64');
  }

  /**
   * 共通鍵文字列を AES-256 用の 32byte Buffer に解決する。
   *
   * 顧客から共有された鍵は「64文字の16進文字列（= 32byte）」形式。その場合は hex
   * デコードしてそのまま使う（追加のハッシュ化は不要）。32byte の生バイト列で
   * 渡された場合も raw で使う。
   *
   * ⚠️ それ以外はサーバと鍵がズレている可能性が高いので、握りつぶさず例外を投げる。
   */
  private resolveKey(rawKey: string): Buffer {
    const trimmed = rawKey.trim();

    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, 'hex');
    }

    const utf8 = Buffer.from(trimmed, 'utf8');
    if (utf8.length === 32) {
      return utf8;
    }

    throw new Error(
      `共通鍵の形式が不正です（64文字のhex か 32byte が必要、実際: ${trimmed.length}文字）。` +
        '顧客提供の鍵長・形式を確認してください。',
    );
  }
}

/** `updateUserInfo` の応答（正規化後）。 */
export interface DenshibanApiResult {
  /** `'0'` = 成功。それ以外は {@link DenshibanSyncException} として投げられる。 */
  statusCode: string;
  /** `create` 成功時のみ — 電子版が採番した会員ID。`t_dokusya.denshi_kaiin_id` に保存する。 */
  id?: string;
  message: string;
}
