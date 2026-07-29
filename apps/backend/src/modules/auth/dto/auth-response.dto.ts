import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty()
  account_id: number;

  @ApiProperty()
  login_id: string;

  @ApiProperty()
  account_name: string;

  @ApiProperty()
  role_id: number;

  @ApiProperty()
  role_code: string;

  @ApiProperty()
  role_name: string;

  @ApiProperty({ nullable: true })
  ja_id: number | null;

  @ApiProperty({ nullable: true })
  kanri_shiten_id: number | null;

  @ApiProperty({ nullable: true })
  shiten_id: number | null;

  @ApiProperty({ nullable: true })
  todofuken_code: string | null;

  @ApiProperty()
  paper_flg: boolean;

  @ApiProperty()
  denshi_flg: boolean;

  @ApiProperty()
  email: string;

  @ApiProperty({
    description:
      '2段階認証有効フラグ。次回ログインから6桁OTPの入力が必要かどうか。' +
      'ヘッダーの自己管理トグルから変更可能。',
  })
  mfa_enable_flg: boolean;

  @ApiProperty({ type: [String] })
  permissions: string[];
}

export class LoginSuccessDto {
  @ApiProperty()
  mfa_required: false;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class LoginMfaRequiredDto {
  @ApiProperty()
  mfa_required: true;

  @ApiProperty()
  mfa_token: string;

  @ApiProperty()
  expires_in: number;
}

/**
 * `POST /auth/login` 応答 — 2形態の union:
 *   - MFA: { data: { mfa_required: true, mfa_token, expires_in } }
 *   - 直接成功: { data: { mfa_required: false, user } }（cookie 設定）
 * Swagger は TS union を綺麗に扱えないため両形態のフィールドを optional にした
 * 寛容な envelope を宣言。FE は `mfa_required` boolean を判別子に絞る。
 */
export class LoginResponseDataDto {
  @ApiProperty({
    description: 'Discriminator: true=OTP required next, false=session established.',
  })
  mfa_required: boolean;

  @ApiPropertyOptional({
    description: 'Present only when mfa_required=true.',
  })
  mfa_token?: string;

  @ApiPropertyOptional({
    description: 'OTP expiry seconds; present only when mfa_required=true.',
  })
  expires_in?: number;

  @ApiPropertyOptional({
    type: AuthUserDto,
    description: 'Present only when mfa_required=false.',
  })
  user?: AuthUserDto;
}

export class LoginResponseDto {
  @ApiProperty({ type: LoginResponseDataDto })
  data: LoginResponseDataDto;
}

// {@link AuthUserEnvelopeDto} の内側形状。
export class AuthUserPayloadDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

// 認証済みユーザ envelope — mfa/verify・refresh で使用。
export class AuthUserEnvelopeDto {
  @ApiProperty({ type: AuthUserPayloadDto })
  data: AuthUserPayloadDto;
}

// POST /auth/mfa/resend payload。
export class MfaResendResultDto {
  @ApiProperty() mfa_token: string;
  @ApiProperty() expires_in: number;
  @ApiProperty() resend_count: number;
  @ApiProperty() max_resend: number;
}

export class MfaResendResponseDto {
  @ApiProperty({ type: MfaResendResultDto })
  data: MfaResendResultDto;
}

// POST /auth/reset-password/verify payload。
export class VerifyResetTokenResultDto {
  @ApiProperty({ example: true })
  valid: true;
}

export class VerifyResetTokenResponseDto {
  @ApiProperty({ type: VerifyResetTokenResultDto })
  data: VerifyResetTokenResultDto;
}

// 共通メッセージ envelope の再エクスポート（logout / forgot / reset 用）。
export { SuccessMessageDto } from '@/common/dto/responses.dto';
