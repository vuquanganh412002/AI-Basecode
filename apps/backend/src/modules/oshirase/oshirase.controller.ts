import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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

import { CreateOshiraseDto } from './dto/create-oshirase.dto';
import { LoginOshiraseQueryDto } from './dto/login-oshirase-query.dto';
import { SearchOshiraseDto } from './dto/search-oshirase.dto';
import { UpdateOshiraseDto } from './dto/update-oshirase.dto';
import { OshiraseService } from './oshirase.service';

/**
 * Controller covers two distinct surfaces:
 *
 *  - `/api/v1/oshirase/public` — unauthenticated login-screen banner
 *    (SCR-001). NO guards.
 *  - `/api/v1/oshirase[/:id]` — authenticated admin CRUD (SCR-031).
 *    `@UseGuards` declared at method level so the public route stays open.
 */
@ApiTags('oshirase')
@Controller('oshirase')
export class OshiraseController {
  constructor(private readonly service: OshiraseService) {}

  // ─── SCR-001 — login screen banner (no auth) ─────────────────────
  @Get('login')
  @ApiOperation({ summary: 'Login-screen oshirase list (no auth) — ACSMS-API-001-006' })
  async findLogin(@Query() query: LoginOshiraseQueryDto) {
    const data = await this.service.findLogin(query);
    return { data };
  }

  // ─── SCR-010 — menu screen list (authenticated, any role) ────────
  @Get('menu')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth('session_id')
  @ApiOperation({ summary: 'メニュー画面お知らせ取得 — ACSMS-API-010-001' })
  @ApiResponse({ status: 200, description: '正常にお知らせ一覧を取得しました' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  async getMenuList(
    @Query('limit') limit: string | undefined,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    const parsedLimit =
      limit === undefined ? undefined : Number.parseInt(limit, 10);
    const safeLimit =
      typeof parsedLimit === 'number' && Number.isFinite(parsedLimit)
        ? parsedLimit
        : undefined;
    return this.service.getMenuList(session, safeLimit);
  }

  // ─── SCR-031 — admin endpoints ───────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permissions('oshirase.view')
  @ApiCookieAuth('session_id')
  @ApiOperation({ summary: 'お知らせ一覧取得 — ACSMS-API-031-001' })
  @ApiResponse({ status: 200, description: '正常にお知らせ一覧を取得しました' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async getList(@Query() query: SearchOshiraseDto) {
    return this.service.getList(query);
  }

  @Get(':oshirase_id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permissions('oshirase.view')
  @ApiCookieAuth('session_id')
  @ApiOperation({ summary: 'お知らせ詳細取得 — ACSMS-API-031-002' })
  @ApiResponse({ status: 200, description: '正常にお知らせ詳細を取得しました' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定されたお知らせが見つかりません。' })
  async getDetail(
    @Param('oshirase_id', ParseIntPipe) oshiraseId: number,
  ) {
    return this.service.getDetail(oshiraseId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permissions('oshirase.create')
  @ApiCookieAuth('session_id')
  @ApiOperation({ summary: 'お知らせ登録 — ACSMS-API-031-003' })
  @ApiResponse({ status: 201, description: '登録しました。' })
  @ApiResponse({ status: 400, description: '入力内容にエラーがあります' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async create(
    @Body() dto: CreateOshiraseDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.service.create(dto, session, req);
  }

  @Patch(':oshirase_id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permissions('oshirase.update')
  @ApiCookieAuth('session_id')
  @ApiOperation({ summary: 'お知らせ更新 — ACSMS-API-031-004' })
  @ApiResponse({ status: 200, description: '更新しました。' })
  @ApiResponse({ status: 400, description: '入力内容にエラーがあります' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定されたお知らせが見つかりません。' })
  async update(
    @Param('oshirase_id', ParseIntPipe) oshiraseId: number,
    @Body() dto: UpdateOshiraseDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.service.update(oshiraseId, dto, session, req);
  }

  @Delete(':oshirase_id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, PermissionsGuard)
  @Permissions('oshirase.delete')
  @ApiCookieAuth('session_id')
  @ApiOperation({ summary: 'お知らせ削除 — ACSMS-API-031-005' })
  @ApiResponse({ status: 200, description: '削除しました。' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定されたお知らせが見つかりません。' })
  @ApiResponse({ status: 409, description: '関連データが存在するため削除できません。' })
  async remove(
    @Param('oshirase_id', ParseIntPipe) oshiraseId: number,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.service.remove(oshiraseId, session, req);
  }
}
