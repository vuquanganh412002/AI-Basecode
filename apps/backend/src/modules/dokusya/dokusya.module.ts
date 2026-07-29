import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { Shiten } from '@/database/entities/shiten.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Hanbaiten } from '@/database/entities/hanbaiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';
import { Account } from '@/database/entities/account.entity';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CodeModule } from '@/modules/code/code.module';
import { DenshibanDbModule } from '@/modules/denshiban/denshiban-db.module';

import { DokusyaController } from './dokusya.controller';
import { DokusyaService } from './dokusya.service';
import { DokusyaAccountFlagService } from './dokusya-account-flag.service';
import { DokusyaImportService } from './dokusya-import.service';
import { DokusyaImportValidator } from './dokusya-import-validator.service';
import { DokusyaRirekiService } from './dokusya-rireki-helper.service';
import { DokusyaSearchService } from './dokusya-search.service';
import { DokusyaReplaceService } from './dokusya-replace.service';

/**
 * SCR-011 — 購読者情報登録画面.
 *
 * `Shiten` はエンティティを所有せずに `m_shiten` の 口座引落 逆引きを実行できるよう、
 * （providers に列挙するだけでなく）再インポートする（正規の所有者は `ShitenModule`）。
 *
 * `AuthModule` が2つのガード用に `SessionService` / `PermissionsService` を、
 * `AuditLogModule` が `AuditLogService` を提供する。`CodeModule` は `@Global` なので
 * インポート不要だが、ここに列挙して将来の読者に依存を明示し、モジュール分離にも耐える。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Dokusya,
      DokusyaRireki,
      Shiten,
      KanriShiten,
      Hanbaiten,
      Tanka,
      Account,
    ]),
    AuthModule,
    AuditLogModule,
    CodeModule,
    // cloud → 電子版 push（DenshibanPushService）。@Global だが、統合テストが
    // DokusyaModule を単独 boot するため明示 import して自己完結にする（CodeModule と同方針）。
    DenshibanDbModule,
  ],
  controllers: [DokusyaController],
  providers: [
    DokusyaService,
    DokusyaAccountFlagService,
    DokusyaImportService,
    DokusyaImportValidator,
    DokusyaRirekiService,
    DokusyaSearchService,
    DokusyaReplaceService,
  ],
  exports: [DokusyaService],
})
export class DokusyaModule {}
