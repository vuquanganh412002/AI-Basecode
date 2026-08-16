import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
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

import { SuccessMessageDto } from '@/common/dto/responses.dto';

import { CreateTankaDto } from './dto/create-tanka.dto';
import { TankaDropdownQueryDto } from './dto/tanka-dropdown-query.dto';
import { UpdateTankaDto } from './dto/update-tanka.dto';
import { SearchTankaDto } from './dto/search-tanka.dto';
import {
  TankaDetailEnvelopeDto,
  TankaListResponseDto,
  TankaMutationResponseDto,
  TankaResponseDto,
} from './dto/tanka-response.dto';
import { TankaService } from './tanka.service';

@ApiTags('tanka')
@ApiCookieAuth('session_id')
@Controller('tanka')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class TankaController {
  constructor(private readonly service: TankaService) {}

  @Get()
  @Permissions('tanka.view')
  @ApiOperation({ summary: '単価マスタ明細検索画面 — 単価一覧取得' })
  @ApiResponse({ status: 200, type: TankaListResponseDto })
  findAll(
    @Query() query: SearchTankaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findAll(query, req.user);
  }

  // [dropdown-route-order] `@Get(':id')` より前に宣言 — 静的パスを動的パラメータ
  // より優先させる。逆順だと `/tanka/dropdown` が findById(':id') に入り
  // ParseIntPipe が非数値 "dropdown" で 400 になる。
  //
  // [shared-dropdown-rule] 認証のみ — @Permissions なし。異なるゲートを持つ複数画面
  // (ACSMS-SCR-017 hanbaiten / ACSMS-SCR-011 dokusya) が共有するフォーム用ドロップダウン。1つの CRUD
  // 権限で絞ると消費側画面のロールを締め出す恐れ。データ境界は
  // TankaService.dropdown → applyJaScope (制限ロールは自 JA のみ)、画面アクセスは各ルート自身のガード。
  @Get('dropdown')
  @ApiOperation({
    summary: '単価ドロップダウン — 配達手数料単価 (SCR-017) 用',
  })
  getDropdown(
    @Query() query: TankaDropdownQueryDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.getDropdown(query, req.user);
  }

  @Delete(':id')
  @Permissions('tanka.delete')
  @ApiOperation({ summary: '単価マスタ明細検索画面 — 単価論理削除' })
  @ApiResponse({ status: 200, type: SuccessMessageDto })
  remove(
    @Param('id', ParseIntPipe) tankaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.remove(tankaId, req.user, req);
  }

  // ─── ACSMS-API-003-001 — GET /api/v1/tanka/:id ──────────────────────────
  @Get(':id')
  @Permissions('tanka.view')
  @ApiOperation({ summary: '単価マスタ登録画面 — 単価詳細取得（編集モード）' })
  @ApiResponse({ status: 200, type: TankaDetailEnvelopeDto })
  async findById(
    @Param('id', ParseIntPipe) tankaId: number,
    @Req() req: Request & { user: SessionPayload },
  ): Promise<{ data: TankaResponseDto }> {
    const data = await this.service.findById(tankaId, req.user);
    return { data };
  }

  // ─── ACSMS-API-003-002 — POST /api/v1/tanka ───────────────────────────────────
  @Post()
  @Permissions('tanka.create')
  @ApiOperation({ summary: '単価マスタ登録画面 — 単価登録' })
  @ApiResponse({ status: 201, type: TankaMutationResponseDto })
  async create(
    @Body() dto: CreateTankaDto,
    @Req() req: Request & { user: SessionPayload },
  ): Promise<{ data: TankaResponseDto; message: string }> {
    const data = await this.service.create(dto, req.user, req);
    return { data, message: '登録しました。' };
  }

  // ─── ACSMS-API-003-003 — PUT /api/v1/tanka/:id ──────────────────────────
  @Put(':id')
  @Permissions('tanka.update')
  @ApiOperation({ summary: '単価マスタ登録画面 — 単価更新' })
  @ApiResponse({ status: 200, type: TankaMutationResponseDto })
  async update(
    @Param('id', ParseIntPipe) tankaId: number,
    @Body() dto: UpdateTankaDto,
    @Req() req: Request & { user: SessionPayload },
  ): Promise<{ data: TankaResponseDto; message: string }> {
    const data = await this.service.update(tankaId, dto, req.user, req);
    return { data, message: '更新しました。' };
  }
}
