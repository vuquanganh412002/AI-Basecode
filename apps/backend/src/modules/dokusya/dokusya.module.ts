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
 * `Shiten` is re-imported (not just listed in providers) so the service
 * can run the 口座引落 reverse-lookup on `m_shiten` without owning the
 * entity (the canonical owner is `ShitenModule`).
 *
 * `AuthModule` provides `SessionService` / `PermissionsService` for the
 * two guards; `AuditLogModule` provides `AuditLogService`. `CodeModule`
 * is `@Global` so it doesn't need importing — but listing it here makes
 * the dependency explicit for future readers and survives module
 * extraction.
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
