import { IsString, IsOptional } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  userId: string;
}

export class RespondFriendRequestDto {
  @IsString()
  requestId: string;

  @IsString()
  action: 'accept' | 'reject';
}

export class BlockUserDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class GetFriendsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}
