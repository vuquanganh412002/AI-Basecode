import { createCipheriv, randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DENSHIBAN_STATUS_SUCCESS } from './denshiban-error-codes';

/**
 * 電子版 共通API `updateUserInfo` のレスポンス。常に HTTP 200 で返り、
 * 成否はステータスコードで判定する（'0'=成功、それ以外はエラーコード
 * E01/V01/P01…）。
 */
export interface UpdateUserInfoResult {
  /** '0'=成功。それ以外はエラーコード。 */
  statusCode: string;
  /** create 成功時に採番された会員ID。それ以外は空文字。 */
  id: string;
  message: string;
}

/**
 * 実サーバの生レスポンス。ステータスコードのキー名が2種類ありうる。
 *
 * ⚠️ 仕様書（20260723_読者管理連携用API使用方法.xlsx / 共通フロー C27）は
 * `statusCode` と記載しているが、検証環境の実装が返すのは **`satusCd`**
 * （"status" の t 欠落 + `Cd` 省略形）。2026-07-29 の ECS ログで確認:
 *
 *     {"satusCd":"E04","id":"","message":"パラメータエラー"}
 *
 * 仕様書どおり `statusCode` だけを読むと値が常に空になり、成功 '0' すら
 * 「'0' ではない」＝失敗と判定されて push が絶対に成功しない。どちらが正なのか
 * 顧客確認が取れるまでは両方を受け付ける（実サーバ優先）。確定したら一本化する。
 */
/**
 * `unknown` をログ/レスポンス用に安全に文字列化する。
 *
 * 素の `String(v)` はオブジェクトを '[object Object]' にしてしまい、
 * 「値が無い」のか「想定外の形が来た」のか区別が付かなくなる（S6551）。
 * スカラだけ文字列化し、それ以外は JSON へ落として原形を残す。
 */
function scalarToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  // 配列/オブジェクトが来るのは電子版側の仕様変更か障害。原形を残して調査可能にする。
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

interface UpdateUserInfoRawResponse {
  /** 実サーバのキー（優先）。 */
  satusCd?: unknown;
  /** 仕様書上のキー（フォールバック）。 */
  statusCode?: unknown;
  id?: unknown;
  message?: unknown;
}

/**
 * 顧客システム「電子版」の会員情報更新 共通API (updateUserInfo) クライアント。
 * cloud → 電子版 push（DenshibanPushService から利用）。
 *
 * 仕様（顧客提供 "Common Flow"）:
 *   - HTTPS / POST, Content-Type: application/json, UTF-8
 *   - 平文JSON 全体を AES-256-GCM（共通鍵）で暗号化
 *   - パケット = IV(12B) + Ciphertext + AuthTag(16B) を連結し Base64 化
 *   - リクエストボディ = { "payload": "<Base64パケット>" }
 *   - 平文JSON にリプレイ防止用 timestamp を含める（API開始 - timestamp <= 300秒）
 */
@Injectable()
export class DenshibanApiService {
  /** 外部I/Oがハングしないための受信タイムアウト（ms）。 */
  private static readonly REQUEST_TIMEOUT_MS = 15_000;

  /**
   * 失敗時に生レスポンスをログへ出す際の最大長。エラーページの HTML が丸ごと
   * CloudWatch に流れ込むのを防ぐ。
   */
  private static readonly MAX_RAW_LOG_LEN = 500;

  /**
   * 失敗時のリクエストログで値を伏せる項目（個人情報）。
   *
   * 電子版APIは業務エラーを P99「その他のエラー」でまとめて返すことがあり、
   * それだけでは原因が特定できない。どの値で落ちたのかを追うには送信内容が要る
   * 一方、氏名・住所・連絡先を CloudWatch に残すわけにはいかない。そこで
   * 「原因調査に効く識別子・区分値は残し、個人情報は伏せる」方針を取る。
   *
   * ここに載せない ＝ ログに出る項目: jacd_execute / action_kbn / timestamp /
   * id / pref_id / profession / products / subscribe_flg / melmaga / sex /
   * payment_start / birthyear / notify_flg / cancel_ym。
   */
  private static readonly MASKED_KEYS: ReadonlySet<string> = new Set([
    'first_name',
    'last_name',
    'first_kana',
    'last_kana',
    'zip',
    'addr',
    'city',
    'building',
    'tel',
    'email',
    'branch',
    'remarks1',
    'remarks2',
    'remarks3',
    'remarks4',
    'remarks5',
    'others_profession',
    'others_products',
  ]);

  private readonly logger = new Logger(DenshibanApiService.name);

  constructor(private readonly configService: ConfigService) {}

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
    // TODO(debug): 暗号化前の平文payloadを全項目そのまま出力する一時ログ。
    // 個人情報（氏名・住所・連絡先）を含むため、調査が終わったら必ず削除すること。
    console.log(
      `[denshiban] updateUserInfo(${action}) 平文payload(暗号化前):`,
      JSON.stringify(plain),
    );

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
      // 生テキストで受ける。res.json() だと非JSON応答が SyntaxError になり、
      // 「何が返ってきたのか」がログに残らないまま失敗するため。
      const rawText = await res.text();

      // 電子版APIは業務エラーも HTTP 200 + ステータスコードで返す仕様。非2xx は
      // インフラ/プロキシ/WAF 由来なので明示的に失敗として扱う。
      if (!res.ok) {
        throw new Error(
          `updateUserInfo HTTP ${res.status} ${res.statusText} — ` +
            DenshibanApiService.truncate(rawText),
        );
      }

      let json: UpdateUserInfoRawResponse;
      try {
        json = JSON.parse(rawText) as UpdateUserInfoRawResponse;
      } catch {
        throw new Error(
          'updateUserInfo: JSON でない応答 — ' +
            DenshibanApiService.truncate(rawText),
        );
      }

      // satusCd が実サーバのキー、statusCode は仕様書上のキー。詳細は
      // UpdateUserInfoRawResponse の説明を参照。
      const result: UpdateUserInfoResult = {
        statusCode: scalarToString(json.satusCd ?? json.statusCode),
        id: scalarToString(json.id),
        message: scalarToString(json.message),
      };

      // 失敗時は「何を送って何が返ったか」を対で残す。応答だけでは P99
      // （その他のエラー）のように原因を特定できないコードが返ってくる。
      if (result.statusCode !== DENSHIBAN_STATUS_SUCCESS) {
        this.logger.error(
          `updateUserInfo(${action}) 応答(生): ` +
            DenshibanApiService.truncate(rawText),
        );
        this.logger.error(
          `updateUserInfo(${action}) 送信(個人情報マスク): ` +
            DenshibanApiService.truncate(
              JSON.stringify(DenshibanApiService.maskPayload(plain)),
            ),
        );
      }

      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 送信payloadを調査用に加工する。個人情報項目は値を捨て、代わりに
   * `<len:N>`（空なら `<empty>`）を残す。空文字を送っていて弾かれた、といった
   * ケースは長さだけで判別できるため、中身そのものは不要。
   */
  private static maskPayload(
    plain: Record<string, unknown>,
  ): Record<string, unknown> {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(plain)) {
      if (!DenshibanApiService.MASKED_KEYS.has(key)) {
        masked[key] = value;
        continue;
      }
      const len = scalarToString(value).length;
      masked[key] = len === 0 ? '<empty>' : `<len:${len}>`;
    }
    return masked;
  }

  /** ログ用にレスポンス本文を上限長で切り詰める。 */
  private static truncate(text: string): string {
    const oneLine = text.replace(/\s+/g, ' ').trim();
    return oneLine.length > DenshibanApiService.MAX_RAW_LOG_LEN
      ? `${oneLine.slice(0, DenshibanApiService.MAX_RAW_LOG_LEN)}…(truncated)`
      : oneLine;
  }

  /**
   * 平文を AES-256-GCM で暗号化し、IV(12B)+Ciphertext+Tag(16B) を Base64 で返す。
   *
   * 鍵は AES-256 = 32byte が必須。`resolveKey()` で共通鍵文字列を 32byte に解決する。
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
   * 顧客から共有された鍵は「64文字の16進文字列（= 32byte）」形式。その場合は
   * hex デコードしてそのまま使う（追加のハッシュ化は不要）。32byte の生バイト列で
   * 渡された場合も raw で使う。
   * （実鍵の断片はコメントに書かない — 値は Secrets Manager のみが持つ。）
   *
   * ⚠️ それ以外（長さが合わない / hex でない）はサーバと鍵がズレている可能性が
   * 高いので、握りつぶさず例外を投げて気付けるようにする。
   */
  private resolveKey(rawKey: string): Buffer {
    const trimmed = rawKey.trim();

    // 64文字の16進文字列 → hex デコードで 32byte。
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, 'hex');
    }

    // 32byte ちょうどの生文字列ならそのまま鍵に使う。
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
