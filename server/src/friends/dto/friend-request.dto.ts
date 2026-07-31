// friend-request.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum FriendRequestAction {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export class SendFriendRequestDto {
  @IsString()
  toUserId: string;
}

export class RespondFriendRequestDto {
  @IsString()
  requestId: string;

  @IsEnum(FriendRequestAction)
  action: FriendRequestAction;
}

export class CancelFriendRequestDto {
  @IsString()
  requestId: string;
}

export class BlockUserDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UnblockUserDto {
  @IsString()
  targetUserId: string;
}

// For GET /friends?search=&limit=&offset=
export class GetFriendsQueryDto {
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
