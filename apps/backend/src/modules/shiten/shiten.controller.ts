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

import { ShitenService } from './shiten.service';
import { CreateShitenDto } from './dto/create-shiten.dto';
import { UpdateShitenDto } from './dto/update-shiten.dto';
import { SearchShitenDto } from './dto/search-shiten.dto';
import { ShitenDetailDto } from './dto/shiten-detail.dto';
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
  @ApiResponse({ status: 200 })
  async findAll(
    @Query() query: SearchShitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findAll(query, req.user);
  }

  @Get(':id')
  @Permissions('shiten.view')
  @ApiOperation({ summary: '支店マスタ登録画面 — 支店詳細取得' })
  @ApiResponse({ status: 200, type: ShitenDetailDto })
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
  @ApiResponse({ status: 201, type: ShitenDetailDto })
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
  @ApiResponse({ status: 200, type: ShitenDetailDto })
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
  @ApiResponse({ status: 200 })
  async remove(
    @Param('id', ParseIntPipe) shitenId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.remove(shitenId, req.user, req);
  }
}
