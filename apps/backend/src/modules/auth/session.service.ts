import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';

export interface SessionPayload {
  account_id: number;
  login_id: string;
  role_id: number;
  role_code: string;
  ja_id: number | null;
  kanri_shiten_id: number | null;
  permissions: string[];
  created_at: string;      // ISO-8601
  last_activity_at: string; // ISO-8601 — updated on each successful request
}

const SESSION_PREFIX = 'session:';
const ACCOUNT_INDEX_PREFIX = 'account_sessions:';

/**
 * Stores authenticated sessions in Redis.
 *
 * Layout:
 *   session:{session_id}              → JSON payload (EX = ttlSeconds)
 *   account_sessions:{account_id}     → Set of session_ids (same TTL)
 *
 * The per-account index lets us destroy all sessions at once on password
 * reset (SCR-012 §4.8) without scanning the entire keyspace.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly ttlSeconds: number;

  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.ttlSeconds = this.configService.get<number>('session.ttlSeconds') ?? 24 * 60 * 60;
  }

  /** Create a new session and return its opaque ID (UUID v4). */
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

  /** Fetch the session payload; `null` if missing or expired. */
  async get(sessionId: string): Promise<SessionPayload | null> {
    const raw = await this.redis.get(SESSION_PREFIX + sessionId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionPayload;
    } catch {
      // Corrupt payload — destroy it.
      await this.destroy(sessionId).catch(() => undefined);
      return null;
    }
  }

  /**
   * Refresh the session's TTL to another full window (sliding expiration).
   * Also stamps `last_activity_at`. No-op if the session has already expired.
   */
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

  /** Destroy a single session. */
  async destroy(sessionId: string): Promise<void> {
    const payload = await this.get(sessionId);
    if (payload) {
      await this.redis.srem(ACCOUNT_INDEX_PREFIX + payload.account_id, sessionId);
    }
    await this.redis.del(SESSION_PREFIX + sessionId);
    this.logger.log({ event: 'session.destroyed', sessionId: this.mask(sessionId) });
  }

  /**
   * Destroy every session belonging to an account — used on password reset
   * and when an admin wants to force-revoke a user's access.
   */
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

  /** Session IDs are secrets; only show the first 8 chars in logs. */
  private mask(sessionId: string): string {
    return sessionId.slice(0, 8) + '…';
  }
}
