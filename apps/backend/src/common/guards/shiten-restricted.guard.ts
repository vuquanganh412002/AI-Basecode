import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { ForbiddenException } from '@/common/exceptions/common.exceptions';
import type { SessionPayload } from '@/modules/auth/session.service';

/**
 * 制限② — 所属支店が設定されたアカウントは帳票5画面を使用不可（顧客要件 2026-07）。
 *
 * `session.shiten_id != null` のとき 403 で弾く。permission（role 単位）は変更せず、
 * アカウント属性(shiten_id)ベースの実行時ガードとして 5 コントローラに付与する:
 *   - 増減通知（日本農業新聞）出力 (SCR-029)
 *   - 増減連絡票（販売店）出力 (SCR-028)
 *   - 購読者名簿出力 (SCR-026)
 *   - 口座振替データ出力 (SCR-020)
 *   - 配達手数料支払情報出力 (SCR-021)
 *
 * SessionAuthGuard の後段に置く前提（req.user が SessionPayload であること）。
 */
@Injectable()
export class ShitenRestrictedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: SessionPayload;
    }>();
    const user = request.user;
    if (user?.shiten_id != null) {
      throw new ForbiddenException(
        '所属支店が設定されたアカウントはこの機能を使用できません。',
      );
    }
    return true;
  }
}
