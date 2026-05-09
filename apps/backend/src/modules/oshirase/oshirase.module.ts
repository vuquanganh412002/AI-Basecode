import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Oshirase } from '@/database/entities/oshirase.entity';
import { OshiraseController } from './oshirase.controller';
import { OshiraseService } from './oshirase.service';

@Module({
  imports: [TypeOrmModule.forFeature([Oshirase])],
  controllers: [OshiraseController],
  providers: [OshiraseService],
  exports: [OshiraseService],
})
export class OshiraseModule {}
