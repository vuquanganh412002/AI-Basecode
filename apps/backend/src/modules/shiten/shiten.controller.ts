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
import { ShitenService } from './shiten.service';
import { CreateShitenDto } from './dto/create-shiten.dto';
import { UpdateShitenDto } from './dto/update-shiten.dto';
import { SearchShitenDto } from './dto/search-shiten.dto';
import {
  ShitenDetailEnvelopeDto,
  ShitenMutationResponseDto,
} from './dto/shiten-envelopes.dto';
import { ShitenListResponseDto } from './dto/shiten-list-item.dto';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import type { SessionPayload } from '@/modules/auth/session.service';

@ApiTags('shiten')
@ApiCookieAuth('session_id')
@Controller('shiten')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ShitenController {
  constructor(private readonly service: ShitenService) {}

  @Get()
  @Permissions('shiten.view')
  @ApiOperation({ summary: '支店マスタ明細検索画面 — 支店一覧取得' })
  @ApiResponse({ status: 200, type: ShitenListResponseDto })
  async findAll(
    @Query() query: SearchShitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findAll(query, req.user);
  }

  // ─── ACSMS-API-COMMON — GET /api/v1/shiten/dropdown (SCR-011) ───────
  //
  // Consumed by the 購読者情報登録 (SCR-011) form's 引落口座支店 picker.
  // Authenticated-only — no `@Permissions` so any logged-in user with a
  // screen-level permission that needs a 支店 picker can call.
  // Declared BEFORE `@Get(':id')` to win the path-vs-param routing.
  @Get('dropdown')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '支店プルダウン (SCR-011 用)' })
  @ApiResponse({ status: 200, description: 'Dropdown projection.' })
  async listShitenDropdown(
    @Query()
    query: {
      ja_id?: string;
      kanri_shiten_id?: string;
      kinyu_shiten_flg?: string;
      q?: string;
    },
    @Req() req: Request & { user: SessionPayload },
  ) {
    const jaId = query.ja_id === undefined ? undefined : Number(query.ja_id);
    // 管理支店で絞り込む（顧客要件2026-07・SCR-025 所属支店 / SCR-011）。選択した
    // 管理支店配下の支店のみをドロップダウンに出す。未指定なら絞らない。
    const kanriShitenId =
      query.kanri_shiten_id === undefined
        ? undefined
        : Number(query.kanri_shiten_id);
    // Query-string booleans arrive as 'true' / 'false' / undefined; coerce.
    let kinyuFlg: boolean | undefined;
    if (query.kinyu_shiten_flg === 'true') kinyuFlg = true;
    else if (query.kinyu_shiten_flg === 'false') kinyuFlg = false;
    const q = typeof query.q === 'string' ? query.q : undefined;
    const data = await this.service.listDropdown(
      { ja_id: jaId, kanri_shiten_id: kanriShitenId, kinyu_shiten_flg: kinyuFlg, q },
      req.user,
    );
    return {
      data,
      meta: {
        total: data.length,
        page: 1,
        per_page: data.length,
        has_more: false,
      },
    };
  }

  // ─── ACSMS-API-COMMON-008 — GET /api/v1/shiten/koza-dropdown ─────────
  // 口座支店（金融機関支店フラグ=TRUE）プルダウン。認証済みなら誰でも可
  // （呼び出し元画面の権限に依存）。`@Get(':id')` より前に宣言する。
  @Get('koza-dropdown')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '口座支店プルダウン (SCR-020 用) — ACSMS-API-COMMON-008' })
  @ApiResponse({ status: 200, description: '金融機関支店プルダウン投影。' })
  async listKozaShitenDropdown(
    @Query() query: { kanri_shiten_ids?: string },
    @Req() req: Request & { user: SessionPayload },
  ) {
    // クエリの kanri_shiten_ids は 'カンマ区切り' 文字列で届く。数値配列へ正規化。
    const kanriShitenIds =
      typeof query.kanri_shiten_ids === 'string' &&
      query.kanri_shiten_ids.length > 0
        ? query.kanri_shiten_ids
            .split(',')
            .map((v) => Number(v.trim()))
            .filter((v) => !Number.isNaN(v))
        : undefined;
    return this.service.getKozaDropdown(
      { kanri_shiten_ids: kanriShitenIds },
      req.user,
    );
  }

  @Get(':id')
  @Permissions('shiten.view')
  @ApiOperation({ summary: '支店マスタ登録画面 — 支店詳細取得' })
  @ApiResponse({ status: 200, type: ShitenDetailEnvelopeDto })
  async findById(
    @Param('id', ParseIntPipe) shitenId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.findById(shitenId, req.user);
    return { data };
  }

  @Post()
  @Permissions('shiten.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '支店マスタ登録画面 — 支店新規登録' })
  @ApiResponse({ status: 201, type: ShitenMutationResponseDto })
  async create(
    @Body() dto: CreateShitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const { message, ...data } = await this.service.create(dto, req.user, req);
    return { data, message };
  }

  @Put(':id')
  @Permissions('shiten.update')
  @ApiOperation({ summary: '支店マスタ登録画面 — 支店更新' })
  @ApiResponse({ status: 200, type: ShitenMutationResponseDto })
  async update(
    @Param('id', ParseIntPipe) shitenId: number,
    @Body() dto: UpdateShitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const { message, ...data } = await this.service.update(
      shitenId,
      dto,
      req.user,
      req,
    );
    return { data, message };
  }

  @Delete(':id')
  @Permissions('shiten.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '支店マスタ明細検索画面 — 支店論理削除' })
  @ApiResponse({ status: 200, type: SuccessMessageDto })
  async remove(
    @Param('id', ParseIntPipe) shitenId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.remove(shitenId, req.user, req);
  }
}
