import { createCipheriv, randomBytes } from 'node:crypto';
import { Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EntityManager } from 'typeorm';

import { isDenshibanSubscriber } from '@/common/utils/denshiban-sync-gate';
import type { Dokusya } from '@/database/entities/dokusya.entity';

// ⚠️ Value import (not `import type`) — Nest's DI reads the runtime value via
// `design:paramtypes`. A type-only import is erased at compile time, so the
// constructor parameter loses its type and can no longer be injected.
import { DenshibanPayloadAssembler } from './outbound/denshiban-payload.assembler';
import type { DenshibanMode, DenshibanPayload } from './mapper/denshiban-payload.builder';
import { DenshibanApiException } from './outbound/denshiban-api.exception';

/**
 * Client for the customer system "denshiban"'s member-info update common API
 * (`updateUserInfo`), plus the business entry point business logic calls to sync
 * a subscriber ({@link sendNow}).
 *
 * `sendNow` gates on sync eligibility, assembles the payload (via
 * {@link DenshibanPayloadAssembler}) and hands it to {@link send} — the transport
 * layer that encrypts and POSTs it. Call `sendNow` from inside the caller's
 * transaction, before COMMIT: a denshiban error propagates and rolls the tx back,
 * so data denshiban rejects never ends up in cloud either (customer req, 2026-07).
 *
 * Spec (customer-provided "Common Flow"):
 *   - HTTPS / POST, Content-Type: application/json, UTF-8
 *   - The entire plaintext JSON is encrypted with AES-256-GCM (shared key)
 *   - Packet = IV(12B) + Ciphertext + AuthTag(16B), concatenated and Base64-encoded
 *   - Request body = `{ "payload": "<Base64 packet>" }`
 *   - The plaintext JSON carries a `timestamp` (epoch seconds) for replay protection
 *     (API start - timestamp <= 300s; over that it returns `E05`)
 *
 * ⚠️ **HTTP is always 200.** Success/failure lives only in the body's `statusCode`.
 */
@Injectable()
export class DenshibanApiService implements OnApplicationBootstrap {
  private readonly logger = new Logger('DenshibanApi');

  /** Response timeout (ms) so external I/O can't hang. */
  private static readonly REQUEST_TIMEOUT_MS = 15_000;

  constructor(
    private readonly configService: ConfigService,
    // `@Optional()` so `send()`-only unit specs (and any context that never
    // syncs) can construct without the assembler. In production DI the real
    // instance comes from the global `DenshibanDbModule`.
    @Optional() private readonly assembler?: DenshibanPayloadAssembler,
  ) {}

  // ───────────────────────────────────────────────────────────────────────
  // Business entry — the single method business logic (DokusyaService) calls
  // ───────────────────────────────────────────────────────────────────────

  /**
   * **Synchronous send** — call from inside the caller's transaction, before COMMIT.
   *
   * 1. **Gate**: only digital-only (2) subscribers sync. Both (3) and paper-only
   *    (1) return `null` without touching the API. The campaign-tanka exclusion
   *    is enforced upstream in `DokusyaService.denshibanApiFor` — see the note at
   *    the gate below before adding a new caller.
   * 2. **Assemble** the payload — reads `m_kanri_shiten` on the caller's `manager`
   *    connection, resolves `payment_start` against the clock, validates.
   * 3. **{@link send}** it (encrypt + POST). On a denshiban error the exception
   *    propagates so the caller's tx rolls back — data denshiban rejects never
   *    ends up in cloud either (customer requirement, 2026-07).
   *
   * ⚠️ **Dual write, not a distributed transaction.** If COMMIT fails *after*
   * denshiban returned success (`create` is not idempotent), denshiban has a
   * member cloud does not — reconcile by hand.
   *
   * @returns `null` when out of scope (not digital-only); otherwise denshiban's response.
   * @throws {DenshibanApiException} denshiban returned `statusCode !== '0'`.
   * @throws {DenshibanMappingError} cloud data cannot be expressed in denshiban.
   * @throws {Error} not wired / misconfigured / network unreachable / timeout.
   */
  async sendNow(
    input: DenshibanSyncInput,
    manager?: EntityManager,
  ): Promise<DenshibanApiResult | null> {
    const { dokusya, mode } = input;

    // ── Gate (partial): digital-only (2) subscribers ─────────────────────────
    // Shared definition — `@/common/utils/denshiban-sync-gate`. Both (3) and
    // paper-only (1) are not synced (customer decision: "both" members are
    // registered on the denshiban side separately).
    //
    // ⚠️ The campaign-tanka half of the gate is NOT re-checked here. It needs an
    // `m_tanka` read, and this method's contract treats `manager` as an opaque
    // handle it forwards to the assembler — it may legitimately be absent. The
    // full gate (`resolveDenshibanSyncGate`) runs in `DokusyaService.
    // denshibanApiFor` before the flow is entered. A new caller that skips it
    // can push a campaign contract; route every caller through DokusyaService's
    // helper, or evaluate the gate yourself before calling.
    if (!isDenshibanSubscriber(dokusya.dokusyaShubetsu)) {
      this.logger.debug({
        event: 'denshiban.sync.skip.not_digital_only',
        dokusya_id: dokusya.dokusyaId,
        dokusya_shubetsu: dokusya.dokusyaShubetsu,
        mode,
      });
      return null;
    }

    if (!this.assembler) {
      // Proceeding quietly when unwired means "we think we sent it but we didn't".
      // Stop the business operation to make it visible.
      throw new Error(
        '電子版への同期送信が未配線です（DenshibanPayloadAssembler が注入されていません）。',
      );
    }

    const payload = await this.assembler.assemble(
      {
        dokusya,
        mode,
        cancelYm: input.cancelYm,
        notifyFlg: input.notifyFlg,
        before: input.before,
      },
      manager,
    );

    const result = await this.send(payload);

    this.logger.log({
      event: 'denshiban.sync.sent',
      dokusya_id: dokusya.dokusyaId,
      mode,
      statusCode: result.statusCode,
    });

    return result;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Transport — encrypt + POST (`updateUserInfo`)
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Encrypts the plaintext payload, POSTs it to `updateUserInfo`, returns the result.
   *
   * **`timestamp` is stamped here**, not at build time. If any time passes between
   * assembling the payload and sending it, a build-time stamp could exceed 300
   * seconds and come back `E05`. Only "the moment just before sending" is meaningful.
   *
   * @throws {DenshibanApiException} `statusCode !== '0'` (business error) — carries
   *   the denshiban `statusCode`.
   * @throws {Error} misconfiguration / network unreachable / timeout / non-JSON response.
   *   All of these may be transient, so the caller may retry.
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

    // Processing time for replay protection — per the spec this is the one field
    // that is a number (long), not a String.
    const plainObj = {
      ...payload,
      timestamp: Math.floor(Date.now() / 1000),
    };
    const plaintext = JSON.stringify(plainObj);
    const encrypted = this.encrypt(plaintext, rawKey);

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
        body: JSON.stringify({ payload: encrypted }),
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
      // The member id is not PII, but name / address / email are never logged
      // (the plaintext is not emitted).
      statusCode: result.statusCode,
      httpStatus,
      durationMs: Date.now() - startedAt,
    });

    if (result.statusCode !== '0') {
      throw new DenshibanApiException(
        result.statusCode,
        `電子版API (${payload.action_kbn}) がエラーを返しました: ` +
          `statusCode=${result.statusCode} ${result.message}`,
      );
    }

    return result;
  }

  /**
   * Normalizes the response body into a {@link DenshibanApiResult}.
   *
   * ⚠️ The HTTP status is **not used for the decision** (the spec is: always 200).
   * That said, cases where the request never reached denshiban at all (5xx + HTML,
   * etc.) fail JSON parsing and get rejected there as a transient failure.
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
      // A response with no statusCode violates the spec. Mistaking it for success
      // would create silent divergence — e.g. writing denshi_kaiin_id for something
      // that was never sent. Always fail.
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
  // ⚠️ TEMPORARY — connectivity ping (delete this whole block once the
  // production path is stable)
  // ───────────────────────────────────────────────────────────────────────

  /**
   * The customer whitelists only the ECS NAT IP, so this API is unreachable from a
   * developer machine. Hence: hit it once at ECS startup and surface connectivity
   * in CloudWatch.
   *
   * Runs only when the flag `DENSHIBAN_API_PING=true` (default OFF). Every
   * action_kbn is a "write", so sending a real action would litter the customer
   * system with junk members. Instead we send an invalid probe — one that decrypts
   * fine but is not a valid operation — so the server's structured error confirms
   * just the NAT whitelist + TLS + shared-key decryption.
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

  /** POSTs the invalid probe once and logs the response in detail (best-effort). */
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
  // Cryptography
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Encrypts plaintext with AES-256-GCM and returns IV(12B)+Ciphertext+Tag(16B)
   * as Base64.
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
   * Resolves the shared-key string into a 32-byte Buffer for AES-256.
   *
   * The key the customer shared is a "64-character hex string (= 32 bytes)". In
   * that case, hex-decode and use it as-is (no extra hashing needed). A raw
   * 32-byte string is also used as-is.
   *
   * ⚠️ Anything else most likely means our key is out of sync with the server's, so
   * throw rather than swallow it.
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

/** The `updateUserInfo` response (normalized). */
export interface DenshibanApiResult {
  /** `'0'` = success. Anything else is thrown as a {@link DenshibanApiException}. */
  statusCode: string;
  /** Only on `create` success — the member id denshiban assigned. Stored in `t_dokusya.denshi_kaiin_id`. */
  id?: string;
  message: string;
}

/** Argument for {@link DenshibanApiService.sendNow} from business logic. */
export interface DenshibanSyncInput {
  /** The subscriber to sync (its in-transaction state). */
  dokusya: Dokusya;
  mode: DenshibanMode;
  /** Cancellation month `YYYYMM` — required for `cancel`. */
  cancelYm?: string;
  /** Notify-the-member flag. Defaults to `'0'` (do not notify). */
  notifyFlg?: '0' | '1';
  /** The prior state — required for `update` / `reread` (diff-based sending). */
  before?: Dokusya;
}

// NOTE: the eligibility predicates that used to live here now belong to
// `@/common/utils/denshiban-sync-gate` so DokusyaService can evaluate the same
// rules before entering the outbound flow. Import them from there.
