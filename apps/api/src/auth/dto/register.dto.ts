import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(['ADMIN', 'CLIENT'])
  role!: 'ADMIN' | 'CLIENT';

  @IsOptional()
  @IsString()
  businessName?: string;
}
