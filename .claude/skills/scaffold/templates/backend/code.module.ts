import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CodeController } from './code.controller';
import { CodeService } from './code.service';
import { MCode } from './entities/m-code.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MCode]), AuthModule],
  controllers: [CodeController],
  providers: [CodeService],
  exports: [CodeService],
})
export class CodeModule {}
