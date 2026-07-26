import { IsOptional, IsBoolean, IsString, IsArray } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  soundEffects?: boolean;

  @IsOptional()
  @IsString()
  theme?: 'light' | 'dark' | 'system';

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dailyReminderTime?: string[];

  @IsOptional()
  @IsBoolean()
  shareActivityWithFriends?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;
}