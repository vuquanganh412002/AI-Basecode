import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicOshiraseQueryDto } from './dto/public-oshirase-query.dto';
import { OshiraseService } from './oshirase.service';

@ApiTags('oshirase')
@Controller('api/v1/oshirase')
export class OshiraseController {
  constructor(private readonly service: OshiraseService) {}

  @Get('public')
  @ApiOperation({ summary: 'Public oshirase list (no auth)' })
  async findPublic(@Query() query: PublicOshiraseQueryDto) {
    const data = await this.service.findPublic(query);
    return { data };
  }
}
