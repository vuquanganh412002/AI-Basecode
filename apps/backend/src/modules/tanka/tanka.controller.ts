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

import { CreateTankaDto } from './dto/create-tanka.dto';
import { UpdateTankaDto } from './dto/update-tanka.dto';
import { SearchTankaDto } from './dto/search-tanka.dto';
import { TankaResponseDto } from './dto/tanka-response.dto';
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
  @ApiResponse({ status: 200 })
  findAll(
    @Query() query: SearchTankaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findAll(query, req.user);
  }

  @Delete(':id')
  @Permissions('tanka.delete')
  @ApiOperation({ summary: '単価マスタ明細検索画面 — 単価論理削除' })
  @ApiResponse({ status: 200 })
  remove(
    @Param('id', ParseIntPipe) tankaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.remove(tankaId, req.user, req);
  }

  // ─── API-003-001 — GET /api/v1/tanka/:id ──────────────────────────
  @Get(':id')
  @Permissions('tanka.view')
  @ApiOperation({ summary: '単価マスタ登録画面 — 単価詳細取得（編集モード）' })
  @ApiResponse({ status: 200, type: TankaResponseDto })
  async findById(
    @Param('id', ParseIntPipe) tankaId: number,
    @Req() req: Request & { user: SessionPayload },
  ): Promise<{ data: TankaResponseDto }> {
    const data = await this.service.findById(tankaId, req.user);
    return { data };
  }

  // ─── API-003-002 — POST /api/v1/tanka ───────────────────────────────────
  @Post()
  @Permissions('tanka.create')
  @ApiOperation({ summary: '単価マスタ登録画面 — 単価登録' })
  @ApiResponse({ status: 201, type: TankaResponseDto })
  async create(
    @Body() dto: CreateTankaDto,
    @Req() req: Request & { user: SessionPayload },
  ): Promise<{ data: TankaResponseDto; message: string }> {
    const data = await this.service.create(dto, req.user, req);
    return { data, message: '登録しました。' };
  }

  // ─── API-003-003 — PUT /api/v1/tanka/:id ──────────────────────────
  @Put(':id')
  @Permissions('tanka.update')
  @ApiOperation({ summary: '単価マスタ登録画面 — 単価更新' })
  @ApiResponse({ status: 200, type: TankaResponseDto })
  async update(
    @Param('id', ParseIntPipe) tankaId: number,
    @Body() dto: UpdateTankaDto,
    @Req() req: Request & { user: SessionPayload },
  ): Promise<{ data: TankaResponseDto; message: string }> {
    const data = await this.service.update(tankaId, dto, req.user, req);
    return { data, message: '更新しました。' };
  }
}
