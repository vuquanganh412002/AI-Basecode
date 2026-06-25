import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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

import { SuccessMessageDto } from '@/common/dto/responses.dto';
import { KanriShitenService } from './kanri-shiten.service';
import { SearchKanriShitenDto } from './dto/search-kanri-shiten.dto';
import { CreateKanriShitenDto } from './dto/create-kanri-shiten.dto';
import { UpdateKanriShitenDto } from './dto/update-kanri-shiten.dto';
import { KanriShitenDropdownQueryDto } from './dto/kanri-shiten-dropdown-query.dto';
import {
  KanriShitenDetailEnvelopeDto,
  KanriShitenDropdownResponseDto,
  KanriShitenListResponseDto,
  KanriShitenMutationResponseDto,
} from './dto/kanri-shiten-envelopes.dto';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import type { SessionPayload } from '@/modules/auth/session.service';

@ApiTags('kanri-shiten')
@ApiCookieAuth('session_id')
@Controller('kanri-shiten')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class KanriShitenController {
  constructor(private readonly service: KanriShitenService) {}

  @Get()
  @Permissions('kanri_shiten.view')
  @ApiOperation({ summary: '管理支店マスタ明細検索画面 — 管理支店一覧取得' })
  @ApiResponse({ status: 200, type: KanriShitenListResponseDto })
  async findAll(
    @Query() query: SearchKanriShitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findAll(query, req.user);
  }

  // ─── ACSMS-API-COMMON-004 — Get Kanri Shiten Dropdown ────────────────
  // Must be declared BEFORE `@Get(':id')` so Nest's pattern
  // matcher doesn't treat `dropdown` as an id. Per spec §4.2 the endpoint
  // is authenticated-only — no `@Permissions(...)`, so PermissionsGuard
  // passes (empty required list). The caller's screen-level guard is the
  // permission boundary; SessionAuthGuard enforces login here.
  @Get('dropdown')
  @ApiOperation({ summary: '共通API — 管理支店プルダウン (ACSMS-API-COMMON-004)' })
  @ApiResponse({ status: 200, type: KanriShitenDropdownResponseDto })
  async listDropdown(
    @Query() query: KanriShitenDropdownQueryDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const { data, has_more } = await this.service.listDropdown(
      {
        ja_id: query.ja_id,
        q: query.q,
        match_field: query.match_field ?? 'both',
        page: query.page,
        per_page: query.per_page,
        include_id: query.include_id,
      },
      req.user,
    );
    return {
      data,
      meta: {
        total: data.length,
        page: query.page ?? 1,
        per_page: query.per_page ?? data.length,
        has_more,
      },
    };
  }

  @Get(':id')
  @Permissions('kanri_shiten.view')
  @ApiOperation({ summary: '管理支店マスタ登録画面 — 管理支店詳細取得' })
  @ApiResponse({ status: 200, type: KanriShitenDetailEnvelopeDto })
  async findById(
    @Param('id', ParseIntPipe) kanriShitenId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.findById(kanriShitenId, req.user);
    return { data };
  }

  @Post()
  @Permissions('kanri_shiten.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '管理支店マスタ登録画面 — 管理支店新規登録' })
  @ApiResponse({ status: 201, type: KanriShitenMutationResponseDto })
  async create(
    @Body() dto: CreateKanriShitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const { message, ...data } = await this.service.create(dto, req.user, req);
    return { data, message };
  }

  @Put(':id')
  @Permissions('kanri_shiten.update')
  @ApiOperation({ summary: '管理支店マスタ登録画面 — 管理支店更新' })
  @ApiResponse({ status: 200, type: KanriShitenMutationResponseDto })
  async update(
    @Param('id', ParseIntPipe) kanriShitenId: number,
    @Body() dto: UpdateKanriShitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const { message, ...data } = await this.service.update(
      kanriShitenId,
      dto,
      req.user,
      req,
    );
    return { data, message };
  }

  @Delete(':id')
  @Permissions('kanri_shiten.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '管理支店マスタ明細検索画面 — 管理支店論理削除' })
  @ApiResponse({ status: 200, type: SuccessMessageDto })
  async remove(
    @Param('id', ParseIntPipe) kanriShitenId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.remove(kanriShitenId, req.user, req);
  }
}
