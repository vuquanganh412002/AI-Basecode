import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Account } from '@/database/entities/account.entity';
import { DokusyaShubetsu } from '@/common/enums';
import type { SessionPayload } from '@/modules/auth/session.service';

import { ShubetsuPermissionException } from './exceptions/shubetsu-permission.exception';

/**
 * 購読種別（紙版/電子版）アカウントフラグの判定を担う共有サービス。
 * DokusyaService(登録/更新/承認/却下)・DokusyaImportService(一括取込)・
 * DokusyaReplaceService(販売店一括置換) が共通利用するため単一クラスに切り出す。
 */
@Injectable()
export class DokusyaAccountFlagService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  /**
   * アカウント単位の購読種別ゲート（account_concept.md §139-145, 紙版側も対称ルール）。
   * ロール権限に加える追加チェック — 行の購読種別に対応するフラグも必要:
   *   - 紙版(1) → paper_flg
   *   - 電子版(2) → denshi_flg
   *   - 併読(3) は読取専用なのでこのゲートに到達しない。
   *
   * 毎回 m_account を再クエリ（create/update/approve/reject は低頻度）し、フラグ変更が
   * 再ログインなしで即反映。フラグ欠如時は ShubetsuPermissionException(403)。FE も該当 UI を
   * disable するが BE が本当の境界（security.md Layer 1/2 同様）。
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
   * 単一購読種別に紐づかない操作 — 一括Excel取込 / 販売店一括置換 / 削除 — は少なくとも
   * 1つの購読種別フラグを要求。paper_flg も denshi_flg も無いアカウントは購読者を管理できない
   * （account_concept.md §139-145）。毎回 m_account を再クエリ。
   */
  async assertAnyDokusyaFlag(session: SessionPayload): Promise<void> {
    const { paperFlg, denshiFlg } = await this.loadAccountFlags(session);
    if (!paperFlg && !denshiFlg) {
      throw ShubetsuPermissionException.noFlag();
    }
  }
}
