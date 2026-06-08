import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { Account } from '@/database/entities/account.entity';
import { MfaOtp } from '@/database/entities/mfa-otp.entity';
import { Permission } from '@/database/entities/permission.entity';
import { Role } from '@/database/entities/role.entity';
import { RolePermission } from '@/database/entities/role-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, MfaOtp, Role, Permission, RolePermission]),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, SessionAuthGuard],
  exports: [AuthService, SessionService, SessionAuthGuard],
})
export class AuthModule {}
