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
 * `POST /auth/login` response — union of two shapes:
 *   - MFA branch: { data: { mfa_required: true, mfa_token, expires_in } }
 *   - Direct success: { data: { mfa_required: false, user } } (cookie set)
 *
 * Swagger doesn't introspect TS unions cleanly so we declare a permissive
 * envelope with both shapes' fields marked optional. Orval surfaces the
 * `mfa_required` boolean as the discriminator the FE narrows on.
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

/** Inner shape for {@link AuthUserEnvelopeDto}. */
export class AuthUserPayloadDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

/** Authenticated-user envelope — used by mfa/verify and refresh. */
export class AuthUserEnvelopeDto {
  @ApiProperty({ type: AuthUserPayloadDto })
  data: AuthUserPayloadDto;
}

/** POST /auth/mfa/resend payload. */
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

/** POST /auth/reset-password/verify payload. */
export class VerifyResetTokenResultDto {
  @ApiProperty({ example: true })
  valid: true;
}

export class VerifyResetTokenResponseDto {
  @ApiProperty({ type: VerifyResetTokenResultDto })
  data: VerifyResetTokenResultDto;
}

/** Re-export shared message envelope for auth surfaces (logout / forgot / reset). */
export { SuccessMessageDto } from '@/common/dto/responses.dto';
