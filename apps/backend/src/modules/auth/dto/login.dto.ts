import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', minLength: 1, maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[\x21-\x7E]+$/, { message: 'login_id must contain only half-width characters' })
  login_id: string;

  @ApiProperty({ example: 'Admin@1234', minLength: 8, maxLength: 32 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^[\x21-\x7E]+$/, { message: 'password must contain only half-width characters' })
  password: string;
}
