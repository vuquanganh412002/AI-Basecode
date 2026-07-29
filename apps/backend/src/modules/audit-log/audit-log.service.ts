import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Log } from '@/database/entities/log.entity';
import { LoginLog } from '@/database/entities/login-log.entity';
import { AuditOperation, LogType, ResultStatus } from '@/common/enums';

// `LogType` / `ResultStatus` の正典は `@/common/enums`。以前あった
// 移行用 re-export はどの caller も使わず（consumer は本ファイルから
// `AuditLogService` + `AuditOperationContext` のみ取得）、かつ同一識別子を
// 上で import すると TS 5.x watch-mode がクラッシュ
// (`checkJsDirective` in `trySubstituteClassAlias`) するため削除済み。

/**
 * 全 audit-log 呼び出し共通の context。リクエスト毎に 1 つ構築し
 * (`extractAuditContext(req)` で `ipAddress` + `userAgent` を充填)、
 * `logCreate/Update/Delete/Error` へ渡して同じ 6 フィールドの再記述を省く。
 */
export interface AuditOperationContext {
  /** セッションの認証済アカウント — 未認証ログは `null`。 */
  accountId: number | null;
  /** 操作ユーザーの JA スコープ（ログ検索の DataScope に使用）。 */
  jaId: number | null;
  /** 画面ラベル。規約: `${画面名} (ACSMS-SCR-XXX)`。 */
  screen: string;
  /** 対象テーブル名（`m_ja`, `m_tanka`, ...）。 */
  table: string;
  /** 対象行の主キー。 */
  targetId: number | null;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
    @InjectRepository(LoginLog) private readonly loginLogRepo: Repository<LoginLog>,
  ) {}

  /**
   * CREATE 成功の記録。
   *
   * `manager` は任意だが、規約（`nestjs.md` §"Audit Log" MANDATORY）は
   * `dataSource.transaction(async (manager) => {...})` 内から渡すこと。
   * audit INSERT を業務書き込みと同一 tx に載せ、ロールバック時は audit 行も
   * 原子的にロールバックする。省略は独立行が欲しい稀なケースのみ。
   */
  async logCreate(
    ctx: AuditOperationContext,
    after: unknown,
    manager?: EntityManager,
  ): Promise<void> {
    await this.logOperation(
      {
        logType: LogType.USER_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: AuditOperation.CREATE,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        afterValue: JSON.stringify(after),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      manager,
    );
  }

  /** UPDATE 成功の記録 — before/after 両状態を保存。 */
  async logUpdate(
    ctx: AuditOperationContext,
    before: unknown,
    after: unknown,
    manager?: EntityManager,
  ): Promise<void> {
    await this.logOperation(
      {
        logType: LogType.USER_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: AuditOperation.UPDATE,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        beforeValue: JSON.stringify(before),
        afterValue: JSON.stringify(after),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      manager,
    );
  }

  /**
   * export/出力操作（帳票・ファイル出力）成功の記録。before 状態は不要のため
   * `afterValue`（出力条件 + 件数の JSON、PII は含めない）のみ保存。
   * `operation` / `logType` は画面毎に異なる（PDF は EXPORT_PDF、Excel/CSV は
   * CREATE + FILE_OPERATION）ため caller が渡す。`manager` は export が tx 内で
   * 書く場合に audit INSERT を同 tx へ載せる。
   */
  async logExport(
    ctx: AuditOperationContext,
    opts: {
      operation: string;
      afterValue: string;
      logType?: LogType;
      manager?: EntityManager;
    },
  ): Promise<void> {
    await this.logOperation(
      {
        logType: opts.logType ?? LogType.USER_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: opts.operation,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        beforeValue: '',
        afterValue: opts.afterValue,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      opts.manager,
    );
  }

  /** DELETE 成功の記録 — 削除前の行状態を保存。 */
  async logDelete(
    ctx: AuditOperationContext,
    before: unknown,
    manager?: EntityManager,
  ): Promise<void> {
    await this.logOperation(
      {
        logType: LogType.USER_OPERATION,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation: AuditOperation.DELETE,
        resultStatus: ResultStatus.SUCCESS,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        beforeValue: JSON.stringify(before),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      manager,
    );
  }

  /**
   * 失敗操作の記録。設計上、独立接続で実行 MUST（`manager` を取らない）—
   * caller の catch 実行時には既に tx がロールバック済みで、`manager`
   * 経由の行も消えるため。独立 INSERT はロールバックを生き延び、失敗トレースが
   * デバッグ用に残る。正典パターンは `nestjs.md` §"Audit Log"。
   */
  async logError(
    ctx: AuditOperationContext,
    operation: string,
    err: Error,
  ): Promise<void> {
    // エラーログ自身の書き込み失敗が、caller が再 throw する元エラーを
    // 隠さないよう try/catch で包む。
    try {
      await this.logOperation({
        logType: LogType.ERROR,
        accountId: ctx.accountId,
        jaId: ctx.jaId,
        gamenName: ctx.screen,
        operation,
        resultStatus: ResultStatus.FAILURE,
        targetId: ctx.targetId,
        targetTable: ctx.table,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        errorMessage: err.message,
        stackTrace: err.stack ?? '',
      });
    } catch (logErr) {
      this.logger.error({ event: 'audit_log.error_save_failed', logErr });
    }
  }

  /**
   * 最下層の audit 書き込み。
   *
   * @param manager 任意の EntityManager。渡すと INSERT は
   *   `manager.getRepository(Log)` で実行され caller の tx に参加。省略時は
   *   モジュール repository（独立接続）— `logError` や非トランザクション caller が
   *   使用。例外は BUBBLE させ tx がロールバックできるようにする。握り潰しは
   *   caller 側の責務（例: `logError`）。
   */
  async logOperation(
    params: {
      logType: number;
      accountId: number | null;
      jaId: number | null;
      gamenName: string;
      // 開いた文字列語彙 — 正典動詞は `AuditOperation`。動的計算する caller も
      // ある（hanbaiten IMPORT_*）。AuditOperation メンバー推奨、生文字列も可。
      operation: string;
      resultStatus: number;
      targetId?: number | null;
      targetTable?: string;
      beforeValue?: string;
      afterValue?: string;
      ipAddress?: string;
      userAgent?: string;
      errorMessage?: string;
      stackTrace?: string;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Log) : this.logRepo;
    await repo.save({
      logType: params.logType,
      logDatetime: new Date(),
      accountId: params.accountId,
      jaId: params.jaId,
      gamenName: params.gamenName,
      operation: params.operation,
      resultStatus: params.resultStatus,
      targetId: params.targetId ?? null,
      targetTable: params.targetTable ?? '',
      beforeValue: params.beforeValue ?? '',
      afterValue: params.afterValue ?? '',
      ipAddress: params.ipAddress ?? '',
      userAgent: params.userAgent ?? '',
      errorMessage: params.errorMessage ?? '',
      stackTrace: params.stackTrace ?? '',
    });
  }

  /**
   * ログイン/ログアウト/MFA 試行ログ。別テーブル（`t_login_log`）で意図的に
   * 非トランザクション — 後続失敗（アカウントロック、OTP 不正等）でも試行記録を
   * 残し、攻撃パターンを監査できるようにする。
   */
  async logLogin(params: {
    accountId?: number | null;
    loginId: string;
    loginResult: number;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.loginLogRepo.save({
        accountId: params.accountId ?? null,
        loginId: params.loginId,
        loginDatetime: new Date(),
        loginResult: params.loginResult,
        failureReason: params.failureReason ?? '',
        ipAddress: params.ipAddress ?? '',
        userAgent: params.userAgent ?? '',
      });
    } catch (error) {
      this.logger.error({ event: 'login_log.save_failed', error });
    }
  }
}
