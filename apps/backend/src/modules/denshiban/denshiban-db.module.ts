import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { Hanbaiten } from '@/database/entities/hanbaiten.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';

import { DenshibanApiService } from './denshiban-api.service';
import { DenshibanDbService } from './denshiban-db.service';
import { DenshibanDokusyaAssembler } from './inbound/denshiban-dokusya.assembler';
import { DenshibanInboundFetcher } from './inbound/denshiban-inbound.fetcher';
import { DenshibanInboundSyncService } from './inbound/denshiban-inbound-sync.service';
import { DenshibanPayloadAssembler } from './outbound/denshiban-payload.assembler';

/**
 * Integration module for the customer system "denshiban".
 *
 * `@Global()` because it can be referenced from anywhere — `DokusyaService`
 * injects `DenshibanApiService` without importing this module.
 *
 * Contents:
 *   - `DenshibanApiService`       … the single entry point business logic calls
 *                                   (`sendNow` = synchronous, in-transaction send)
 *                                   plus the transport layer (`send` = encrypt +
 *                                   POST `updateUserInfo`)
 *   - `DenshibanPayloadAssembler` … subscriber → payload assembly (outbound)
 *   - `DenshibanDbService`        … read-only access to denshiban's MySQL
 *   - Inbound (電子版 `users` → `t_dokusya`):
 *       `DenshibanInboundFetcher`     … reads `users` (collecting=1)
 *       `DenshibanDokusyaAssembler`   … resolves FKs + builds the draft
 *       `DenshibanInboundSyncService` … single-shot `syncAll()` the batch runner
 *                                       calls (fetch → classify → write + audit)
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Dokusya, KanriShiten, Hanbaiten])],
  providers: [
    DenshibanDbService,
    DenshibanApiService,
    DenshibanPayloadAssembler,
    DenshibanInboundFetcher,
    DenshibanDokusyaAssembler,
    DenshibanInboundSyncService,
  ],
  exports: [
    DenshibanDbService,
    DenshibanApiService,
    DenshibanPayloadAssembler,
    DenshibanInboundSyncService,
  ],
})
export class DenshibanDbModule {}
