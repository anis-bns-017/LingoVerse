import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateCommunityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsEnum(['PUBLIC', 'PRIVATE', 'RESTRICTED'])
  type: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
}

export class UpdateCommunityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'RESTRICTED'])
  type?: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
}

export class CreateChannelDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['TEXT', 'VOICE', 'ANNOUNCEMENT', 'CATEGORY'])
  type: 'TEXT' | 'VOICE' | 'ANNOUNCEMENT' | 'CATEGORY';

  @IsOptional()
  @IsUUID(4)
  parentId?: string;

  @IsOptional()
  @IsNumber()
  position?: number;
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  position?: number;
}

export class CreateThreadDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class AddMemberDto {
  @IsUUID(4)
  userId: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateMemberRoleDto {
  @IsString()
  role: string;
}

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @IsNumber()
  @Min(0)
  position: number;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsNumber()
  position?: number;
}

export class BanMemberDto {
  @IsUUID(4)
  userId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class CreateInviteDto {
  @IsOptional()
  @IsNumber()
  maxUses?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}