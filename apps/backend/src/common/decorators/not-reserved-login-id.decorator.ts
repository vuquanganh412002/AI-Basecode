// ログインIDにシステム予約名（`SYSTEM` / `SYSTEM_*`）を使わせない。
// SCR-025 アカウント作成で使用。
//
// 予約する理由は名前の見た目ではなく、監査列の判別に使っているため。
// `t_dokusya_rireki.created_by` の最古行(rireki_no=1)を見て「クラウド版で作成
// された電子版読者」と「電子版から同期された電子版読者」を区別する
// （顧客要件 2026-08）。一般ユーザが `SYSTEM_DENSHI_SYNC` を名乗れると、その
// アカウントが登録した読者が同期由来と誤判定される。
//
// 判定本体は `isReservedSystemLoginId`（予約名の定義と同じファイル）に置く。
// 接頭辞で見ているので SystemActor が増えてもここは変更不要。
import { registerDecorator, type ValidationOptions } from 'class-validator';

import { isReservedSystemLoginId } from '@/common/constants/system-actor.constant';

const DEFAULT_MESSAGE =
  'ログインIDに「SYSTEM」から始まる文字列は使用できません。';

export function IsNotReservedLoginId(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isNotReservedLoginId',
      target: object.constructor,
      propertyName,
      options: { message: DEFAULT_MESSAGE, ...validationOptions },
      validator: {
        validate(value: unknown): boolean {
          // 型・必須は他の decorator の責務。ここは非文字列を素通しして
          // 「ログインIDは文字列で指定してください。」を優先させる。
          if (typeof value !== 'string') return true;
          return !isReservedSystemLoginId(value);
        },
      },
    });
  };
}
