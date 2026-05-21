// Screen: __SCREEN_ID__ — __SCREEN__
//
// Controller for __MODULE__. HTTP only — NO business logic.
// Every endpoint MUST have @Permissions('model.action') and @ApiOperation.
// Guards applied at class level: SessionAuthGuard + PermissionsGuard.

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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

import { __SERVICE__ } from './__MODULE__.service';
import { Create__ENTITY__Dto } from './dto/create-__MODULE__.dto';
import { Update__ENTITY__Dto } from './dto/update-__MODULE__.dto';
import { Search__ENTITY__Dto } from './dto/search-__MODULE__.dto';
import { __ENTITY__ResponseDto } from './dto/__MODULE__-response.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { SessionPayload } from '../auth/session.service';

@ApiTags('__MODULE_PLURAL__')
@ApiCookieAuth('session_id')
@Controller('api/v1/__MODULE_PLURAL__')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class __CONTROLLER__ {
  constructor(private readonly service: __SERVICE__) {}

  @Get()
  @Permissions('__MODEL_KEY__.view')
  @ApiOperation({ summary: '__SCREEN__ — 一覧取得' })
  @ApiResponse({ status: 200, type: [__ENTITY__ResponseDto] })
  findAll(
    @Query() query: Search__ENTITY__Dto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findAll(query, req.user);
  }

  @Get(':id')
  @Permissions('__MODEL_KEY__.view')
  @ApiOperation({ summary: '__SCREEN__ — 詳細取得' })
  @ApiResponse({ status: 200, type: __ENTITY__ResponseDto })
  findById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findById(id, req.user);
  }

  @Post()
  @Permissions('__MODEL_KEY__.create')
  @ApiOperation({ summary: '__SCREEN__ — 登録' })
  @ApiResponse({ status: 201, type: __ENTITY__ResponseDto })
  create(
    @Body() dto: Create__ENTITY__Dto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.create(dto, req.user, req);
  }

  @Patch(':id')
  @Permissions('__MODEL_KEY__.update')
  @ApiOperation({ summary: '__SCREEN__ — 更新' })
  @ApiResponse({ status: 200, type: __ENTITY__ResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Update__ENTITY__Dto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.update(id, dto, req.user, req);
  }

  @Delete(':id')
  @Permissions('__MODEL_KEY__.delete')
  @HttpCode(200)
  @ApiOperation({ summary: '__SCREEN__ — 削除' })
  @ApiResponse({ status: 200 })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    await this.service.remove(id, req.user, req);
    return { message: '正常に削除しました' };
  }
}
