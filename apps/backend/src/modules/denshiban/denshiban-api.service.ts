import { createCipheriv, randomBytes } from "node:crypto";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * 顧客システム「電子版」の会員情報更新 共通API (updateUserInfo) への疎通確認サービス。
 *
 * 顧客は ECS の NAT IP（2つ）だけを whitelist しているため、このAPIはローカルや
 * 開発端末からは到達できない。そこで「ECS 起動時（onApplicationBootstrap）」に
 * 1回だけ叩いて疎通を確認し、response を CloudWatch に詳細ログとして出す。
 *
 * ⚠️ TEMPORARY 診断 — フラグ `DENSHIBAN_API_PING=true` のときだけ動く。既定 OFF。
 * updateUserInfo の全 action_kbn は「書き込み」操作なので、起動ごとに本物の
 * action を投げると顧客システムにゴミ会員が増える。よってここでは
 * 「復号は通るが処理は不正」になる invalid probe を送り、サーバが構造化エラー
 * （Status Code != 0）を返すことで「NAT whitelist + TLS + 共通鍵での復号」が
 * 成立していることだけを確認する（データは書き込まない）。
 *
 * 疎通確認が済んだら本サービス・フラグごと削除する。
 *
 * 仕様（顧客提供 "Common Flow"）:
 *   - HTTPS / POST, Content-Type: application/json, UTF-8
 *   - JSON 全体を AES-256-GCM（共通鍵）で暗号化
 *   - パケット = IV(12B) + Ciphertext + AuthTag(16B) を連結し Base64 化
 *   - リクエストボディ = { "payload": "<Base64パケット>" }
 *   - 平文JSON にリプレイ防止用の処理時刻を含める（API開始 - 処理時刻 <= 300秒）
 */
/**
 * 電子版 共通API `updateUserInfo` のレスポンス。常に HTTP 200 で返り、
 * 成否は `statusCode` で判定する（'0'=成功、それ以外=エラーコード E01/V01/P01…）。
 */
export interface UpdateUserInfoResult {
  /** '0'=成功。それ以外はエラーコード。 */
  statusCode: string;
  /** create 成功時に採番された会員ID。それ以外は空文字。 */
  id: string;
  message: string;
}

@Injectable()
export class DenshibanApiService implements OnApplicationBootstrap {
  private readonly logger = new Logger("DenshibanApiPing");

  /** 外部I/Oがハングしないための受信タイムアウト（ms）。 */
  private static readonly REQUEST_TIMEOUT_MS = 15_000;

  constructor(private readonly configService: ConfigService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.configService.get<boolean>("denshiban.apiPing")) {
      // 既定 OFF — 診断フラグが立っていなければ何もしない。
      return;
    }

    const url = this.configService.get<string>("denshiban.apiUrl");
    if (!url) {
      this.logger.warn(
        "⏭️  updateUserInfo ping: denshiban.apiUrl 未設定のためスキップ。",
      );
      return;
    }

    const rawKey = this.configService.get<string>("denshiban.commonKey") ?? "";
    if (!rawKey || rawKey === "examplestring") {
      // 共通鍵がダミーのまま投げても復号で必ず失敗する。誤判定を避けるため警告のみ。
      this.logger.warn(
        "⏭️  updateUserInfo ping: 共通鍵 (DENSHIBAN_DB_COMMON_KEY) が未設定/ダミーのためスキップ。",
      );
      return;
    }

    await this.ping(url, rawKey);
  }

  /**
   * 電子版 共通API `updateUserInfo` を呼ぶ（cloud → 電子版 push）。
   * 平文 JSON（action_kbn + timestamp + 各 action パラメータ）を AES-256-GCM で
   * 暗号化して POST し、`{ statusCode, id, message }` を返す。成功は statusCode='0'。
   * URL は `denshiban.apiUrl`（ローカルは擬似デモ、本番は AWS URL に差し替え）。
   */
  async updateUserInfo(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<UpdateUserInfoResult> {
    const url = this.configService.get<string>('denshiban.apiUrl');
    if (!url) throw new Error('denshiban.apiUrl (DENSHIBAN_API_URL) is not set');
    const rawKey = this.configService.get<string>('denshiban.commonKey') ?? '';

    const plain: Record<string, unknown> = {
      ...payload,
      action_kbn: action,
      // リプレイ防止: UTC epoch 秒。サーバ側で now-timestamp<=300 を検証。
      timestamp: Math.floor(Date.now() / 1000),
    };
    const body = JSON.stringify({
      payload: this.encrypt(JSON.stringify(plain), rawKey),
    });

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      DenshibanApiService.REQUEST_TIMEOUT_MS,
    );
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body,
        signal: controller.signal,
      });
      const json = (await res.json()) as Partial<UpdateUserInfoResult>;
      return {
        statusCode: String(json.statusCode ?? ''),
        id: String(json.id ?? ''),
        message: String(json.message ?? ''),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * invalid probe を1回 POST し、response（status / headers / body）を詳細ログに出す。
   * 全て best-effort — 失敗してもアプリ本体は落とさず error ログのみ。
   */
  private async ping(url: string, rawKey: string): Promise<void> {
    const startedAt = Date.now();

    // ── 書き込みを起こさない invalid probe の平文 ─────────────────────────
    // action_kbn は仕様外の値。サーバは復号に成功した上で「不正な処理区分」
    // として弾く想定。processing_time はリプレイ防止用に「今」を入れる。
    const plainObj: Record<string, unknown> = {
      action_kbn: "__connectivity_probe__",
      processing_time: Math.floor(Date.now() / 1000),
    };

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      DenshibanApiService.REQUEST_TIMEOUT_MS,
    );

    try {
      // 暗号化(鍵解決を含む)も try 内で行う — 鍵形式が不正でも例外を握りつぶし、
      // アプリ本体は落とさず error ログのみにする。
      const body = JSON.stringify({
        payload: this.encrypt(JSON.stringify(plainObj), rawKey),
      });

      this.logger.log(
        `🚀 updateUserInfo ping 開始 — url=${url} (invalid probe / 書き込みなし)`,
      );

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body,
        signal: controller.signal,
      });

      const text = await res.text();
      const headers = Object.fromEntries(res.headers.entries());
      const durationMs = Date.now() - startedAt;

      // status >= 400 でも「サーバまで到達して応答が返った」＝疎通自体は成功。
      // 復号や処理の成否は body の Status Code / message で判断する。
      const block = [
        `📥 updateUserInfo ping 応答 (${durationMs}ms)`,
        `   ├─ HTTP status : ${res.status} ${res.statusText}`,
        `   ├─ headers     : ${JSON.stringify(headers)}`,
        `   └─ body        : ${text || "(空)"}`,
      ].join("\n");

      if (res.ok) {
        this.logger.log(block);
      } else {
        this.logger.warn(block);
      }
    } catch (err) {
      // ネットワーク到達不可 / WAF ブロック / タイムアウト など。
      const durationMs = Date.now() - startedAt;
      const isAbort = (err as Error).name === "AbortError";
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

  /**
   * 平文を AES-256-GCM で暗号化し、IV(12B)+Ciphertext+Tag(16B) を Base64 で返す。
   *
   * 鍵は AES-256 = 32byte が必須。`resolveKey()` で共通鍵文字列を 32byte に解決する。
   */
  private encrypt(plaintext: string, rawKey: string): string {
    const key = this.resolveKey(rawKey);

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(plaintext, "utf8")),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag(); // 16B
    return Buffer.concat([iv, ciphertext, tag]).toString("base64");
  }

  /**
   * 共通鍵文字列を AES-256 用の 32byte Buffer に解決する。
   *
   * 顧客から共有された鍵は「64文字の16進文字列（= 32byte）」形式
   * （例: 6f9b2a7c...）。その場合は hex デコードしてそのまま使う（追加の
   * ハッシュ化は不要）。32byte の生バイト列で渡された場合も raw で使う。
   *
   * ⚠️ それ以外（長さが合わない / hex でない）はサーバと鍵がズレている可能性が
   * 高いので、握りつぶさず例外を投げて気付けるようにする。
   */
  private resolveKey(rawKey: string): Buffer {
    const trimmed = rawKey.trim();

    // 64文字の16進文字列 → hex デコードで 32byte。
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, "hex");
    }

    // 32byte ちょうどの生文字列ならそのまま鍵に使う。
    const utf8 = Buffer.from(trimmed, "utf8");
    if (utf8.length === 32) {
      return utf8;
    }

    throw new Error(
      `共通鍵の形式が不正です（64文字のhex か 32byte が必要、実際: ${trimmed.length}文字）。` +
        "顧客提供の鍵長・形式を確認してください。",
    );
  }
}
