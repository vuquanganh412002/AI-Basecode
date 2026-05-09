// Screen: __SCREEN_ID__ — __SCREEN__
//
// Module for __MODULE__. Imports:
//   - TypeOrmModule.forFeature([__ENTITY__])  — repository
//   - AuditLogModule                           — audit trail service

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { __ENTITY__ } from '@/database/entities/__MODULE__.entity';
import { __SERVICE__ } from './__MODULE__.service';
import { __CONTROLLER__ } from './__MODULE__.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([__ENTITY__]), AuditLogModule],
  controllers: [__CONTROLLER__],
  providers: [__SERVICE__],
  exports: [__SERVICE__],
})
export class __MODULE_CLASS__ {}
