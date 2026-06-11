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
    @Query() query: { ja_id?: string; kinyu_shiten_flg?: string; q?: string },
    @Req() req: Request & { user: SessionPayload },
  ) {
    const jaId = query.ja_id === undefined ? undefined : Number(query.ja_id);
    // Query-string booleans arrive as 'true' / 'false' / undefined; coerce.
    let kinyuFlg: boolean | undefined;
    if (query.kinyu_shiten_flg === 'true') kinyuFlg = true;
    else if (query.kinyu_shiten_flg === 'false') kinyuFlg = false;
    const q = typeof query.q === 'string' ? query.q : undefined;
    const data = await this.service.listDropdown(
      { ja_id: jaId, kinyu_shiten_flg: kinyuFlg, q },
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
