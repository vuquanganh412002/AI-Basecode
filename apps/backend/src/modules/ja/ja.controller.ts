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
import { JaService } from './ja.service';
import { CreateJaDto } from './dto/create-ja.dto';
import { UpdateJaDto } from './dto/update-ja.dto';
import { SearchJaDto } from './dto/search-ja.dto';
import { JaDropdownQueryDto } from './dto/ja-dropdown-query.dto';
import {
  JaDetailEnvelopeDto,
  JaDropdownResponseDto,
  JaListResponseDto,
  JaMutationResponseDto,
} from './dto/ja-envelopes.dto';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import type { SessionPayload } from '@/modules/auth/session.service';

@ApiTags('ja')
@ApiCookieAuth('session_id')
@Controller('ja')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class JaController {
  constructor(private readonly service: JaService) {}

  @Get()
  @Permissions('ja.view')
  @ApiOperation({ summary: 'JAマスタ明細検索画面 — JA一覧取得' })
  @ApiResponse({ status: 200, type: JaListResponseDto })
  async findAll(
    @Query() query: SearchJaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findAll(query, req.user);
  }

  // NOTE: must come BEFORE `@Get(':id')` — otherwise the dynamic
  // route swallows `/dropdown` as a ParseIntPipe-failed id.
  @Get('dropdown')
  // [shared-dropdown-rule] Authenticated-only — NO @Permissions. This is
  // a form-facing shared dropdown: many screens with different permission
  // gates embed it (JA / dokusya / hanbaiten 代行 / account / ファイル
  // アップロード …). Gating it by any single CRUD permission would lock
  // out a consuming screen's role (e.g. JA_KANRI_SHITEN holds file.upload
  // but not ja.view — the file-upload screen broke). The data boundary is
  // `JaService.dropdown` → `applyJaScope` (JA roles see only their own JA);
  // screen access is enforced by each route's own guard.
  @ApiOperation({
    summary:
      'JA共通ドロップダウン — フォーム用のページング付き検索可能リスト',
  })
  @ApiResponse({ status: 200, type: JaDropdownResponseDto })
  async dropdown(
    @Query() query: JaDropdownQueryDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.dropdown(query, req.user);
  }

  @Get(':id')
  @Permissions('ja.view')
  @ApiOperation({ summary: 'JAマスタ登録画面 — JA詳細取得' })
  @ApiResponse({ status: 200, type: JaDetailEnvelopeDto })
  async findById(
    @Param('id', ParseIntPipe) jaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.findById(jaId, req.user);
    return { data };
  }

  @Post()
  @Permissions('ja.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'JAマスタ登録画面 — JA登録' })
  @ApiResponse({ status: 201, type: JaMutationResponseDto })
  async create(
    @Body() dto: CreateJaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const { message, ...data } = await this.service.create(dto, req.user, req);
    return { data, message };
  }

  @Put(':id')
  @Permissions('ja.update')
  @ApiOperation({ summary: 'JAマスタ登録画面 — JA更新' })
  @ApiResponse({ status: 200, type: JaMutationResponseDto })
  async update(
    @Param('id', ParseIntPipe) jaId: number,
    @Body() dto: UpdateJaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const { message, ...data } = await this.service.update(jaId, dto, req.user, req);
    return { data, message };
  }

  @Delete(':id')
  @Permissions('ja.delete')
  @ApiOperation({ summary: 'JAマスタ明細検索画面 — JA論理削除' })
  @ApiResponse({ status: 200, type: SuccessMessageDto })
  async remove(
    @Param('id', ParseIntPipe) jaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.remove(jaId, req.user, req);
  }
}
