import { IsString, IsOptional, IsEnum, IsArray, IsUUID, IsBoolean, IsDateString, IsNumber } from 'class-validator';

export class CreateVoiceRoomDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['OPEN', 'PRIVATE', 'SCHEDULED', 'STAGE'])
  type: 'OPEN' | 'PRIVATE' | 'SCHEDULED' | 'STAGE';

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsNumber()
  maxParticipants?: number;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  invitedUserIds?: string[];
}

export class JoinVoiceRoomDto {
  @IsString()
  roomId: string;
}

export class UpdateVoiceRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRecording?: boolean;
}

export class StageActionDto {
  @IsString()
  roomId: string;

  @IsUUID(4)
  userId: string;
}

export class RaiseHandDto {
  @IsString()
  roomId: string;

  @IsBoolean()
  raise: boolean;
}