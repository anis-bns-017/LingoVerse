import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  nativeLanguage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningLanguages?: string[];
}