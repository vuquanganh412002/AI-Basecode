import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Todofuken } from '@/database/entities/todofuken.entity';
import { TodofukenController } from './todofuken.controller';
import { TodofukenService } from './todofuken.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Todofuken]),
    AuthModule, // SessionAuthGuard は SessionService に依存
  ],
  controllers: [TodofukenController],
  providers: [TodofukenService],
  exports: [TodofukenService],
})
export class TodofukenModule {}
