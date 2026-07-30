# Batch 実装計画 — 6バッチ (顧客review 2026-07 反映)

> 顧客レビュー表 (6項目) を反映したバッチ実装計画。
> **どのフォルダに・どのファイルを作るか** を項目ごとに明記する。
> 対象コードベース: `apps/backend`。既存の単発実行バッチ (single-shot) 方式に従う。

## レビュー結果サマリ

| No | Batch | 時刻 | 判定 | 対応 |
|---|---|---|---|---|
| 1 | 単価 有効期限切れ (m_tanka.active_flg) | 0:05 | 問題なし | 新規実装 |
| 2 | 購読停止 (kaiyaku 到来日) | 0:05 | **要修正** | 抽出条件を種別依存に |
| 3 | 情報変更反映 (t_dokusya recompute) | 0:10 | **要修正** | `=today` → 全件idempotent recompute |
| 4 | S3ファイル削除 | 23:45 | 問題なし | 新規実装 (条件明記) |
| 5 | ログ削除 | 23:00 | **要確認** | 保持期間 1年→5年 (要顧客確定) |
| 6 | 電子版 → cloud 同期 | 10分毎 | 問題なし | 既存stub実装 |

---

## §0. 共通方針 — 単発実行バッチ (既存パターン)

`@nestjs/schedule`/`@Cron` は使わない。スケジュールは `agrinews-terraform` の
EventBridge ルール → ECS RunTask (`npm run <name>:prod`) が持つ。

### 共通ランナー (`src/batch/` に集約 — 2026-07 リファクタ)

> 旧構成は `scripts/batch/` に置き ts-node で実行していたが、`scripts` は
> `tsconfig.build` の exclude 対象で **dist にコンパイルされない**ため、prod は
> source + ts-node + typescript を同梱して on-the-fly コンパイルしていた。
> **リファクタ後は `src/batch/` に置き dist へコンパイル**、app と同じく
> `node dist/...` で実行する（prod の ts-node 依存を排除）。

- `src/batch/batch-job.interface.ts` — `BatchJob { run(): Promise<void> }`。
- `src/batch/run-batch.ts` — `runBatch(name, Service)` が Nest application
  context を起動 → DI で Service 解決 → `run()` 1回 → `exit(0/1)`。
- `src/batch/<name>.main.ts` — 各バッチのエントリ（`void runBatch(...)`）。

### 1バッチあたりの標準構成 (このリポの規約)

```
apps/backend/
├── src/modules/batch/<name>/
│   ├── <name>.service.ts          # ドメインロジック (Nest provider・run() を持つ)
│   ├── <name>.service.spec.ts     # 単体テスト
│   └── <name>.module.ts           # providers/exports
├── src/batch/<name>.main.ts       # エントリ: void runBatch('<name>', <Service>)
└── package.json                   # scripts に dev(ts-node src) + :prod(node dist)
                                   #   "<name>":      "ts-node ... src/batch/<name>.main.ts"
                                   #   "<name>:prod": "node dist/batch/<name>.main.js"
```

さらに **共通の配線変更** (§7 参照):
- `src/app.module.ts` の `imports:` に `<Name>Module` を追加
- `agrinews-terraform` に EventBridge ルール (別リポ・command override は `:prod`)

### 命名一覧 (本計画で作るモジュール)

| No | モジュールフォルダ | エントリ (src/batch) | npm script (prod) | EventBridge cron (JST) |
|---|---|---|---|---|
| 1 | `modules/batch/tanka-expire/` | `tanka-expire.main.ts` | `tanka:expire:prod` | `5 0 * * *` |
| 2+3 | `modules/batch/dokusya-nightly/` | `dokusya-nightly.main.ts` | `dokusya:nightly:prod` | `5 0 * * *` |
| 4 | `modules/batch/file-cleanup/` | `file-cleanup.main.ts` | `file:cleanup:prod` | `45 23 * * *` |
| 5 | `modules/batch/log-cleanup/` | `log-cleanup.main.ts` | `log:cleanup:prod` | `0 23 * * *` |
| 6 | `modules/batch/dokusya-sync/` (既存) | `dokusya-sync.main.ts` (済) | `dokusya:sync:prod` (済) | `rate(10 minutes)` |

> Batch 2 と 3 は **順序保証** (「解約→反映」) のため 1エントリ `dokusya-nightly`
> にまとめ、内部で kaiyaku → recompute の順に呼ぶ。

---

## §1. 単価 有効期限切れ — `tanka-expire`

**やること**: `m_tanka.tekiyo_end_date < today AND active_flg=TRUE → active_flg=FALSE`
(`tekiyo_end_date IS NULL` = 無期限 → 対象外)。

### 作るファイル

| ファイル | 種別 |
|---|---|
| `apps/backend/src/modules/batch/tanka-expire/tanka-expire.service.ts` | 新規 |
| `apps/backend/src/modules/batch/tanka-expire/tanka-expire.service.spec.ts` | 新規 |
| `apps/backend/src/modules/batch/tanka-expire/tanka-expire.module.ts` | 新規 |
| `apps/backend/scripts/batch/tanka-expire.ts` | 新規 |
| `apps/backend/src/database/entities/tanka.entity.ts` | 修正 (docblock: active_flg 更新方針) |
| `docs/database/database-design.md` | 修正 (active_flg 補足) |

### service スケルトン

```ts
// tanka-expire.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Tanka } from '@/database/entities/tanka.entity';
import { todayIsoJst } from '@/common/utils/datetime';
import type { BatchJob } from '@root/scripts/batch/run-batch'; // ※ import 経路は §7 注記参照

@Injectable()
export class TankaExpireService implements BatchJob {
  private readonly logger = new Logger(TankaExpireService.name);
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async run(): Promise<void> {
    const today = todayIsoJst(); // 'YYYY-MM-DD' (Asia/Tokyo)
    const res = await this.db
      .createQueryBuilder()
      .update(Tanka)
      .set({ activeFlg: false })
      .where('active_flg = TRUE')
      .andWhere('tekiyo_end_date IS NOT NULL')
      .andWhere('tekiyo_end_date < :today', { today }) // '<' : 当日はまだ有効
      .andWhere('deleted_at IS NULL')
      .execute();
    this.logger.log({ event: 'tanka_expire.done', affected: res.affected ?? 0 });
  }
}
```

### module

```ts
// tanka-expire.module.ts
import { Module } from '@nestjs/common';
import { TankaExpireService } from './tanka-expire.service';

@Module({ providers: [TankaExpireService], exports: [TankaExpireService] })
export class TankaExpireModule {}
```

### entry

```ts
// scripts/batch/tanka-expire.ts
import { TankaExpireService } from '@/modules/batch/tanka-expire/tanka-expire.service';
import { runBatch } from './run-batch';
void runBatch('tanka-expire', TankaExpireService);
```

### テスト観点
- 昨日失効 + active → FALSE / `tekiyo_end_date=NULL` → 不変 / 既に FALSE → no-op /
  失効=当日ちょうど → **不変** (`<` のため)。

### 要確認
- `active_flg` の docblock は現状「tekiyo period と独立・手動運用」。本バッチで
  「失効 → FALSE」の一方向連動を追加する旨を docblock に明記し直す (FALSE→TRUE は
  しない)。→ 顧客/PL 確認。

---

## §2+3. 購読停止 + 情報変更反映 — `dokusya-nightly`

順序 (§6-3「解約→反映」) を守るため 1エントリにまとめる。内部で
`DokusyaKaiyakuService.run()` → `DokusyaRecomputeService.run()` の順に実行。

### 作るファイル

| ファイル | 種別 |
|---|---|
| `apps/backend/src/modules/batch/dokusya-nightly/dokusya-kaiyaku.service.ts` | 新規 (Batch 2) |
| `apps/backend/src/modules/batch/dokusya-nightly/dokusya-recompute.service.ts` | 新規 (Batch 3) |
| `apps/backend/src/modules/batch/dokusya-nightly/dokusya-nightly.service.ts` | 新規 (orchestrator) |
| `apps/backend/src/modules/batch/dokusya-nightly/dokusya-kaiyaku.service.spec.ts` | 新規 |
| `apps/backend/src/modules/batch/dokusya-nightly/dokusya-recompute.service.spec.ts` | 新規 |
| `apps/backend/src/modules/batch/dokusya-nightly/dokusya-nightly.module.ts` | 新規 |
| `apps/backend/scripts/batch/dokusya-nightly.ts` | 新規 |

### 再利用する既存関数 (新規実装しない)

| 関数 | 場所 |
|---|---|
| `insertKaiyaku(m, dokusyaId, asOf)` | `src/modules/dokusya/dokusya-history.writer.ts:189` (電子版+1日を内部処理・idempotent) |
| `recomputeMaster(m, dokusyaId, asOf)` | `src/modules/dokusya/dokusya-history.writer.ts:148` (全件再計算・idempotent) |
| `isBoth` / `isDigitalCreditCard` | `src/modules/dokusya/dokusya-shubetsu.rules.ts` |
| `todayIsoJst` / `addDaysIso` | `src/common/utils/datetime.ts` |
| `DokusyaShubetsu` (PAPER=1/DIGITAL=2/BOTH=3) | `src/common/enums/dokusya-shubetsu.enum.ts` |

### Batch 2 (kaiyaku) — 抽出条件 (§6-2 修正版)

| 種別 | 条件 | 備考 |
|---|---|---|
| 紙版 (1) | `dokusya_chushi_date <= today` | `<=` で batch 未実行日を取りこぼさない |
| 電子版 (2) | `dokusya_chushi_date < today` | D+1 で処理 (= `<= addDaysIso(today,-1)`) |
| 併読 (3) / 電子版クレカ | **除外** | 第3システム同期のため read-only (G6) |

```ts
// dokusya-kaiyaku.service.ts (抜粋)
async run(): Promise<void> {
  const today = todayIsoJst();
  const yesterday = addDaysIso(today, -1);

  // 紙版: chushi <= today / 電子版(クレカ除く): chushi <= today-1
  const rows: { dokusya_id: number }[] = await this.db.query(
    `SELECT dokusya_id FROM t_dokusya
      WHERE deleted_at IS NULL
        AND dokusya_chushi_date IS NOT NULL
        AND (
          (dokusya_shubetsu = $1 AND dokusya_chushi_date <= $3) OR
          (dokusya_shubetsu = $2 AND dokusya_chushi_date <= $4
             AND shiharai_hoho <> $5)
        )`,
    [DokusyaShubetsu.PAPER, DokusyaShubetsu.DIGITAL, today, yesterday,
     ShiharaiHoho.CREDIT_CARD],
  );

  let ok = 0, ng = 0;
  for (const { dokusya_id } of rows) {
    try {
      await this.db.transaction((m) => insertKaiyaku(m, dokusya_id, today));
      ok++;
    } catch (err) {
      ng++; // 1件失敗で全体を止めない
      this.logger.error({ event: 'kaiyaku.fail', dokusyaId: dokusya_id,
                          message: (err as Error).message });
    }
  }
  this.logger.log({ event: 'kaiyaku.done', target: rows.length, ok, ng });
}
```

### Batch 3 (recompute) — 全件 idempotent

```ts
// dokusya-recompute.service.ts (抜粋)
async run(): Promise<void> {
  const today = todayIsoJst();
  const ids: { dokusya_id: number }[] = await this.db.query(
    'SELECT dokusya_id FROM t_dokusya WHERE deleted_at IS NULL',
  );
  let ok = 0, ng = 0;
  for (const { dokusya_id } of ids) {
    try {
      await this.db.transaction((m) => recomputeMaster(m, dokusya_id, today));
      ok++;
    } catch (err) {
      ng++;
      this.logger.error({ event: 'recompute.fail', dokusyaId: dokusya_id,
                          message: (err as Error).message });
    }
  }
  this.logger.log({ event: 'recompute.done', target: ids.length, ok, ng });
}
// ※ 大量件数なら 500件/バッチで dokusya_id を分割して回す (メモリ・ロック対策)
```

### orchestrator + module + entry

```ts
// dokusya-nightly.service.ts
@Injectable()
export class DokusyaNightlyService implements BatchJob {
  constructor(
    private readonly kaiyaku: DokusyaKaiyakuService,
    private readonly recompute: DokusyaRecomputeService,
  ) {}
  async run(): Promise<void> {
    await this.kaiyaku.run();    // ① 解約 (到来日)
    await this.recompute.run();  // ② 反映 (全件 recompute)
  }
}

// dokusya-nightly.module.ts
@Module({
  providers: [DokusyaKaiyakuService, DokusyaRecomputeService, DokusyaNightlyService],
  exports: [DokusyaNightlyService],
})
export class DokusyaNightlyModule {}

// scripts/batch/dokusya-nightly.ts
import { DokusyaNightlyService } from '@/modules/batch/dokusya-nightly/dokusya-nightly.service';
import { runBatch } from './run-batch';
void runBatch('dokusya-nightly', DokusyaNightlyService);
```

### テスト観点
- Batch2: 紙版 昨日 chushi → kaiyaku行+master反映 / 紙版 3日前取りこぼし → 処理 /
  電子版 当日 → **未処理**、昨日 → 処理 (D+1) / 併読・電子版クレカ → 除外 /
  2回実行 → idempotent (kaiyakuFlg で重複なし)。
- Batch3: 未来行が当日到来 → master flip / 同一 joho で rireki_no 大を選択 /
  2回連続 → 状態不変 / 前日未実行 → 当日 recompute で正。

### G7 (連携)
- 電子版の kaiyaku 発生時 → Batch6 (dokusya-sync) を発火する要件あり。今回は
  TODO フックのみ (10分周期の pull でも収束するため後回し可)。

---

## §4. S3ファイル削除 — `file-cleanup`

**やること**: `scheduled_delete_date IS NOT NULL AND <= now` の行を S3 から削除 →
DB を論理削除。`NULL` = 無期限 → 対象外。対象テーブル: `t_file_download`
(+ 要確認で `t_file_upload`)。

### 作るファイル

| ファイル | 種別 |
|---|---|
| `apps/backend/src/modules/batch/file-cleanup/file-cleanup.service.ts` | 新規 |
| `apps/backend/src/modules/batch/file-cleanup/file-cleanup.service.spec.ts` | 新規 |
| `apps/backend/src/modules/batch/file-cleanup/file-cleanup.module.ts` | 新規 |
| `apps/backend/scripts/batch/file-cleanup.ts` | 新規 |

### 再利用
- `StorageService.delete(key)` — `src/modules/storage/storage.service.ts:63`
  (S3 `DeleteObjectCommand` / MinIO `removeObject` を provider が実装)。
- module で `StorageModule` を import (StorageService 注入のため)。

### service スケルトン

```ts
// file-cleanup.service.ts (抜粋)
async run(): Promise<void> {
  const rows = await this.db.getRepository(FileDownload)
    .createQueryBuilder('f')
    .where('f.scheduled_delete_date IS NOT NULL')
    .andWhere('f.scheduled_delete_date <= now()') // timestamptz なので now() 比較
    .andWhere('f.deleted_at IS NULL')
    .getMany();

  let ok = 0, ng = 0;
  for (const f of rows) {
    try {
      await this.storage.delete(f.filePath);      // ① 先に S3 実削除
      await this.db.getRepository(FileDownload).softDelete(f.id); // ② 成功後に論理削除
      ok++;
    } catch (err) {
      ng++; // S3失敗 → 論理削除しない (次回リトライ)
      this.logger.error({ event: 'file_cleanup.fail', id: f.id,
                          message: (err as Error).message });
    }
  }
  this.logger.log({ event: 'file_cleanup.done', target: rows.length, ok, ng });
}
```

### テスト観点
- `scheduled_delete_date` 昨日 → `storage.delete(file_path)` 呼出 + softDelete /
  `NULL` → skip / 未来 → skip / `storage.delete` throw → softDelete しない。

### 要確認
- 対象は `t_file_download` のみ / `t_file_upload` も含むか (両テーブルに
  `scheduled_delete_date` あり)。

---

## §5. ログ削除 — `log-cleanup`

**やること**: 保持期間超過の `t_log` / `t_login_log` を削除。保持期間は
ConfigService から (default 5年)。

### 作るファイル

| ファイル | 種別 |
|---|---|
| `apps/backend/src/modules/batch/log-cleanup/log-cleanup.service.ts` | 新規 |
| `apps/backend/src/modules/batch/log-cleanup/log-cleanup.service.spec.ts` | 新規 |
| `apps/backend/src/modules/batch/log-cleanup/log-cleanup.module.ts` | 新規 |
| `apps/backend/scripts/batch/log-cleanup.ts` | 新規 |
| `apps/backend/src/config/configuration.ts` | 修正 (`app.logRetentionYears`) |
| `apps/backend/.env.example` | 修正 (`LOG_RETENTION_YEARS=5`) |

### service スケルトン

```ts
// log-cleanup.service.ts (抜粋)
async run(): Promise<void> {
  const years = this.config.get<number>('app.logRetentionYears') ?? 5;
  const cutoff = nowTokyo().subtract(years, 'year').toISOString();

  const a = await this.db.query(
    'DELETE FROM t_log WHERE log_datetime < $1', [cutoff]);
  const b = await this.db.query(
    'DELETE FROM t_login_log WHERE login_datetime < $1', [cutoff]);
  this.logger.log({ event: 'log_cleanup.done', years,
                    tLog: a[1] ?? 0, tLoginLog: b[1] ?? 0 });
  // ※ 大量削除は id IN (SELECT ... LIMIT n) ループでバッチ削除しロック回避
}
```

### テスト観点
- cutoff 超過ログ → 削除 / 期間内 → 保持 / env=1年 → cutoff が正しく移動。

### 要確認 (レビューの確認ポイント)
- **保持期間 5年で確定か** (現行1年)。ハード削除でよいか / 削除前にアーカイブ
  (S3 cold storage 等) が必要か → 顧客確定待ち。確定するまで実装保留可。

---

## §6. 電子版 → cloud 同期 — `dokusya-sync` (既存)

**既存 stub の実装のみ**。フォルダ/エントリ/npm script は既に存在:
- `apps/backend/src/modules/batch/dokusya-sync/dokusya-sync.service.ts` (`run()` が TODO)
- `apps/backend/scripts/batch/dokusya-sync.ts` / npm `dokusya:sync:dev`

### やること
- 電子版 MySQL `users` の差分 (`updated_at` 等) を `DenshibanDbService.withConnection()`
  で取得 → `t_dokusya` (必要なら `t_dokusya_rireki`) へ upsert。
- 差分起点 (checkpoint) を保持して毎回チェンジ分のみ。

### 要確認 (blocker)
- 電子版 `users` のスキーマ + 差分カラム / `t_dokusya` への突合キー /
  同期方向 (pull片方向か)。→ 外部システム資料が必要。**着手不可 (資料待ち)**。

---

## §7. 共通の配線変更

### 1) `apps/backend/package.json` scripts に追加

```jsonc
"tanka:expire":    "ts-node -r tsconfig-paths/register scripts/batch/tanka-expire.ts",
"dokusya:nightly": "ts-node -r tsconfig-paths/register scripts/batch/dokusya-nightly.ts",
"file:cleanup":    "ts-node -r tsconfig-paths/register scripts/batch/file-cleanup.ts",
"log:cleanup":     "ts-node -r tsconfig-paths/register scripts/batch/log-cleanup.ts"
```

> **実装時の差異（本計画からの変更点）**: エントリは `scripts/batch/*.ts` ではなく
> `src/batch/*.main.ts`（dist へコンパイルされる）に置いた。npm script 名も
> `start:dev` / `start:prod` に合わせ **`<job>:dev`（ts-node）/ `<job>:prod`
> （`node dist/…`）** の 2 本立てに統一している（接尾辞なしの名前は使わない）。
> ECS のコマンド override は `:prod` を叩く。

### 2) `apps/backend/src/app.module.ts` の `imports:` に追加

`DokusyaSyncModule` (17行目付近) の並びに:

```ts
TankaExpireModule,
DokusyaNightlyModule,
FileCleanupModule,
LogCleanupModule,
```

### 3) `BatchJob` interface の import 経路

`run-batch.ts` は `scripts/` 配下 (src 外) にある。service 側で
`implements BatchJob` する場合、tsconfig の paths に scripts が無ければ相対 import
に頼らず、**`BatchJob` を `src/modules/batch/batch-job.interface.ts` に移設**して
`run-batch.ts` がそれを re-export する形が綺麗 (任意)。最小構成なら
`implements BatchJob` を省略し `run(): Promise<void>` を持つだけでも `runBatch` は動く。

### 4) EventBridge (別リポ `agrinews-terraform`)

各バッチに rule (JST→UTC 変換に注意) + ECS RunTask target
(command override `npm run <name>`)。cron は §0 の命名一覧参照。

---

## §8. 実装順序 (推奨)

1. **Batch 2+3 (`dokusya-nightly`)** — 既存 helper (`insertKaiyaku`/`recomputeMaster`)
   ＋ plan doc (`docs/dokusya-kaiyaku-phase2-plan.md`) あり。価値最大・配線主体。
2. **Batch 1 (`tanka-expire`)** — 単純・独立。docblock 方針だけ確認。
3. **Batch 4 (`file-cleanup`)** — `StorageService.delete` 再利用。要確認: upload 含むか。
4. **Batch 5 (`log-cleanup`)** — 単純だが **保持5年の顧客確定待ち**。
5. **Batch 6 (`dokusya-sync`)** — 外部スキーマ資料待ち (blocker)。最後。

## 未確定事項 (顧客/PL 確認)

- [ ] Batch1: `active_flg` を失効時 FALSE 連動する方針で docblock 更新 (現行「独立」)。
- [ ] Batch4: 削除対象は `t_file_download` のみか `t_file_upload` も含むか。
- [ ] Batch5: 保持期間 5年で確定か / ハード削除でよいか (アーカイブ要否)。
- [ ] Batch6: 電子版 `users` スキーマ・差分カラム・突合キー・同期方向。
