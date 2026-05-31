import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import type { SessionPayload } from '@/modules/auth/session.service';

import { CreateDokusyaDto } from './dto/create-dokusya.dto';
import { UpdateDokusyaDto } from './dto/update-dokusya.dto';
import {
  DokusyaHistoryResponseDto,
} from './dto/dokusya-history-response.dto';
import {
  DokusyaMutationResponseDto,
  DokusyaResponseEnvelopeDto,
} from './dto/dokusya-response.dto';
import { DokusyaService } from './dokusya.service';

/**
 * ACSMS-SCR-011 — 購読者情報登録画面.
 *
 * Six endpoints exposed under `/api/v1/dokusya`. The global prefix
 * `api/v1` is applied centrally in `main.ts` via `setGlobalPrefix` —
 * controllers declare the unprefixed segment only.
 *
 * Both guards (`SessionAuthGuard` + `PermissionsGuard`) wrap every
 * endpoint. The `@Permissions('dokusya.*')` decorator names the
 * permission codes from `seeder.md §3` each role must hold:
 *   - `dokusya.view`   — GET detail + GET history
 *   - `dokusya.create` — POST
 *   - `dokusya.update` — PUT + approve / reject
 */
@ApiTags('dokusya')
@ApiCookieAuth('session_id')
@Controller('dokusya')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class DokusyaController {
  constructor(private readonly service: DokusyaService) {}

  // ─── API-011-001 ────────────────────────────────────────────────────
  @Get(':dokusya_id')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.view')
  @ApiOperation({ summary: '購読者情報登録画面 — 購読者詳細取得' })
  @ApiResponse({ status: 200, type: DokusyaResponseEnvelopeDto })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async getDetail(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.getDetail(dokusyaId, req.user);
    return { data };
  }

  // ─── API-011-002 ────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('dokusya.create')
  @ApiOperation({ summary: '購読者情報登録画面 — 購読者登録' })
  @ApiResponse({ status: 201, type: DokusyaMutationResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー / メール重複 など' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async create(
    @Body() dto: CreateDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.create(dto, req.user, req);
    return { data, message: '登録しました。' };
  }

  // ─── API-011-003 ────────────────────────────────────────────────────
  @Put(':dokusya_id')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.update')
  @ApiOperation({ summary: '購読者情報登録画面 — 購読者更新' })
  @ApiResponse({ status: 200, type: DokusyaMutationResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー / メール重複 など' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async update(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Body() dto: UpdateDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.update(dokusyaId, dto, req.user, req);
    return { data, message: '更新しました。' };
  }

  // ─── API-011-004 ────────────────────────────────────────────────────
  @Put(':dokusya_id/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.update')
  @ApiOperation({ summary: '購読者情報登録画面 — 電子版承認' })
  @ApiResponse({ status: 200, type: DokusyaMutationResponseDto })
  @ApiResponse({ status: 400, description: 'INVALID_STATUS — 承認待ち以外' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async approve(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.approve(dokusyaId, req.user, req);
  }

  // ─── API-011-005 ────────────────────────────────────────────────────
  @Put(':dokusya_id/reject')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.update')
  @ApiOperation({ summary: '購読者情報登録画面 — 電子版否認' })
  @ApiResponse({ status: 200, type: DokusyaMutationResponseDto })
  @ApiResponse({ status: 400, description: 'INVALID_STATUS — 承認待ち以外' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async reject(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.reject(dokusyaId, req.user, req);
  }

  // ─── API-011-006 ────────────────────────────────────────────────────
  @Get(':dokusya_id/history')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.view')
  @ApiOperation({ summary: '購読者情報登録画面 — 履歴表示' })
  @ApiResponse({ status: 200, type: DokusyaHistoryResponseDto })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async getHistory(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.getHistory(dokusyaId, req.user);
  }
}
