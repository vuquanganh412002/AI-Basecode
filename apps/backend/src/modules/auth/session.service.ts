import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RedisService } from '@/modules/redis/redis.service';
import { DEFAULT_SESSION_TTL_SECONDS } from '@/config/config-defaults.constant';

export interface SessionPayload {
  account_id: number;
  login_id: string;
  role_id: number;
  role_code: string;
  ja_id: number | null;
  kanri_shiten_id: number | null;
  /**
   * 所属支店ID（顧客要件 2026-07）。設定されている（非 null）JA管理支店アカウントは
   * DataScope を支店単位まで絞り込み、帳票5画面の使用が禁止される。
   */
  shiten_id: number | null;
  /**
   * 都道府県コード（`m_account.todofuken_code`。中央会・JA本店・JA管理支店で必須）。
   * 中央会(CHUOKAI)のファイルダウンロード画面 DataScope を「自JAのみ」から
   * 「同一都道府県の全JA」へ広げるのに使う（顧客要件 2026-07）。
   *
   * デプロイ前に発行された Redis 上の既存セッションには本項目が**存在しない**ため
   * optional。型を必須にすると実行時の実態と食い違う。読み取り側は未設定を
   * 「都道府県スコープ無し＝従来どおり自JAのみ」として扱うこと（安全側）。
   */
  todofuken_code?: string | null;
  permissions: string[];
  created_at: string;      // ISO-8601
  last_activity_at: string; // ISO-8601 — 成功リクエストごとに更新
}

const SESSION_PREFIX = 'session:';
const ACCOUNT_INDEX_PREFIX = 'account_sessions:';

/**
 * 認証済みセッションを Redis に保存。
 *   session:{session_id}          → JSON payload (EX = ttlSeconds)
 *   account_sessions:{account_id} → session_ids の Set（同 TTL）
 * account 単位 index により、パスワードリセット時(SCR-012 §4.8)に keyspace 全走査なしで
 * 全セッションを一括破棄できる。
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly ttlSeconds: number;

  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.ttlSeconds =
      this.configService.get<number>('session.ttlSeconds') ??
      DEFAULT_SESSION_TTL_SECONDS;
  }

  // 新規セッションを作成し opaque ID(UUID v4)を返す。
  async create(payload: Omit<SessionPayload, 'created_at' | 'last_activity_at'>): Promise<string> {
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    const full: SessionPayload = {
      ...payload,
      created_at: now,
      last_activity_at: now,
    };

    const sessionKey = SESSION_PREFIX + sessionId;
    const indexKey = ACCOUNT_INDEX_PREFIX + payload.account_id;

    await this.redis.setEx(sessionKey, this.ttlSeconds, JSON.stringify(full));
    await this.redis.sadd(indexKey, sessionId);
    await this.redis.expire(indexKey, this.ttlSeconds);

    this.logger.log({
      event: 'session.created',
      accountId: payload.account_id,
      sessionId: this.mask(sessionId),
    });
    return sessionId;
  }

  // セッション payload を取得。不在/期限切れは null。
  async get(sessionId: string): Promise<SessionPayload | null> {
    const raw = await this.redis.get(SESSION_PREFIX + sessionId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionPayload;
    } catch {
      // 破損 payload — 破棄。
      await this.destroy(sessionId).catch(() => undefined);
      return null;
    }
  }

  // TTL を1窓分延長(スライディング)し last_activity_at を更新。期限切れ済みなら no-op。
  async touch(sessionId: string): Promise<SessionPayload | null> {
    const payload = await this.get(sessionId);
    if (!payload) return null;

    payload.last_activity_at = new Date().toISOString();
    const sessionKey = SESSION_PREFIX + sessionId;
    const indexKey = ACCOUNT_INDEX_PREFIX + payload.account_id;

    await this.redis.setEx(sessionKey, this.ttlSeconds, JSON.stringify(payload));
    await this.redis.expire(indexKey, this.ttlSeconds);
    return payload;
  }

  // 単一セッションを破棄。
  async destroy(sessionId: string): Promise<void> {
    const payload = await this.get(sessionId);
    if (payload) {
      await this.redis.srem(ACCOUNT_INDEX_PREFIX + payload.account_id, sessionId);
    }
    await this.redis.del(SESSION_PREFIX + sessionId);
    this.logger.log({ event: 'session.destroyed', sessionId: this.mask(sessionId) });
  }

  // account の全セッションを破棄 — パスワードリセット時、admin による強制失効時に使用。
  async destroyAllForAccount(accountId: number): Promise<number> {
    const indexKey = ACCOUNT_INDEX_PREFIX + accountId;
    const sessionIds = await this.redis.smembers(indexKey);
    if (sessionIds.length === 0) {
      await this.redis.del(indexKey).catch(() => undefined);
      return 0;
    }
    const keys = sessionIds.map((sid) => SESSION_PREFIX + sid);
    await this.redis.del(...keys, indexKey);
    this.logger.log({
      event: 'session.destroyed_all',
      accountId,
      count: sessionIds.length,
    });
    return sessionIds.length;
  }

  // session ID は機密。ログには先頭8文字のみ表示。
  private mask(sessionId: string): string {
    return sessionId.slice(0, 8) + '…';
  }
}
