import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Account } from '@/database/entities/account.entity';
import { DokusyaShubetsu } from '@/common/enums';
import type { SessionPayload } from '@/modules/auth/session.service';

import { ShubetsuPermissionException } from './exceptions/shubetsu-permission.exception';

/**
 * 購読種別（紙版 / 電子版）アカウントフラグの判定を担う共有サービス。
 *
 * `DokusyaService`（登録 / 更新 / 承認 / 却下）、`DokusyaImportService`
 * （一括取込）、`DokusyaReplaceService`（販売店一括置換）が共通で利用する
 * ため、単一クラスに切り出してロジックの重複を防ぐ。
 */
@Injectable()
export class DokusyaAccountFlagService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  /**
   * Account-level 購読種別 gate (account_concept.md §139-145, 紙版側は対称
   * ルール). An ADDITIONAL check on top of the role permission — the
   * account also needs the flag matching the row's 購読種別:
   *   - 紙版 (1) → `paper_flg`
   *   - 電子版 (2) → `denshi_flg`
   *   - 併読 (3) は読み取り専用なのでこのゲートに到達しない。
   *
   * Re-queries `m_account` per call (create/update/approve/reject are
   * low-frequency) so a flag change takes effect immediately without a
   * re-login. Throws `ShubetsuPermissionException` (403) when the flag is
   * missing — the FE also disables the matching UI, but the BE is the
   * real boundary (security.md Layer 1/2 同様).
   */
  async loadAccountFlags(
    session: SessionPayload,
  ): Promise<{ paperFlg: boolean; denshiFlg: boolean }> {
    const account = await this.accountRepo.findOne({
      where: { accountId: session.account_id },
      select: ['accountId', 'paperFlg', 'denshiFlg'],
    });
    return {
      paperFlg: account?.paperFlg ?? false,
      denshiFlg: account?.denshiFlg ?? false,
    };
  }

  async assertShubetsuFlag(
    shubetsu: number,
    session: SessionPayload,
  ): Promise<void> {
    const { paperFlg, denshiFlg } = await this.loadAccountFlags(session);
    if (Number(shubetsu) === DokusyaShubetsu.PAPER && !paperFlg) {
      throw ShubetsuPermissionException.paper();
    }
    if (Number(shubetsu) === DokusyaShubetsu.DIGITAL && !denshiFlg) {
      throw ShubetsuPermissionException.denshi();
    }
  }

  /**
   * Operations not tied to a single 購読種別 — 一括Excel取込 / 販売店一括置換 /
   * 削除 — require the account to hold AT LEAST ONE 購読種別 flag. An account
   * with neither paper_flg nor denshi_flg cannot manage any 購読者
   * (account_concept.md §139-145). Re-queries m_account per call.
   */
  async assertAnyDokusyaFlag(session: SessionPayload): Promise<void> {
    const { paperFlg, denshiFlg } = await this.loadAccountFlags(session);
    if (!paperFlg && !denshiFlg) {
      throw ShubetsuPermissionException.noFlag();
    }
  }
}
