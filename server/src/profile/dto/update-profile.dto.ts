import { IsOptional, IsString, IsArray, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  nativeLanguage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningLanguages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}