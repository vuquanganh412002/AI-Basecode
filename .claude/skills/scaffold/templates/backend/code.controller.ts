import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { CodeService } from './code.service';

@ApiTags('codes')
@ApiCookieAuth('session_id')
@Controller('api/v1/codes')
@UseGuards(SessionAuthGuard)
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  @Get()
  @ApiOperation({
    summary: '全コードマスタ取得',
    description:
      'すべてのカテゴリのコードマスタを一括取得する。ログイン直後に1回呼び出し、フロントエンドでキャッシュする想定。',
  })
  @ApiResponse({ status: 200 })
  findAll() {
    return { data: this.codeService.getAll() };
  }

  @Get(':category')
  @ApiOperation({
    summary: 'カテゴリ別コードマスタ取得',
    description: '指定カテゴリ（例: TANKA_TYPE, GENDER）のコード一覧を取得する。',
  })
  @ApiResponse({ status: 200 })
  findByCategory(@Param('category') category: string) {
    return { data: this.codeService.getByCategory(category) };
  }
}
