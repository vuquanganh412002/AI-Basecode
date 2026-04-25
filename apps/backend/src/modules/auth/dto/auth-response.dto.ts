import { ApiProperty } from '@nestjs/swagger';

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
  todofuken_code: string | null;

  @ApiProperty()
  paper_flg: boolean;

  @ApiProperty()
  denshi_flg: boolean;

  @ApiProperty()
  email: string;

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
