import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SendFriendRequestDto,
  RespondFriendRequestDto,
  BlockUserDto,
  GetFriendsDto,
} from './dto/friend-request.dto';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  // ---------- REQUESTS ----------
  @Post('requests')
  async sendFriendRequest(@Request() req, @Body() dto: SendFriendRequestDto) {
    return this.friendsService.sendFriendRequest(req.user.id, dto);
  }

  @Get('requests')
  async getFriendRequests(@Request() req) {
    return this.friendsService.getFriendRequests(req.user.id);
  }

  @Put('requests/respond')
  async respondFriendRequest(@Request() req, @Body() dto: RespondFriendRequestDto) {
    return this.friendsService.respondFriendRequest(req.user.id, dto);
  }

  // ---------- FRIENDS ----------
  @Get()
  async getFriends(@Request() req, @Query() query: GetFriendsDto) {
    return this.friendsService.getFriends(
      req.user.id,
      query.search,
      query.limit ? parseInt(query.limit) : undefined,
      query.offset ? parseInt(query.offset) : undefined
    );
  }

  @Get('suggestions')
  async getSuggestions(@Request() req) {
    return this.friendsService.getSuggestions(req.user.id);
  }

  // ---------- BLOCKING ----------
  @Post('block')
  async blockUser(@Request() req, @Body() dto: BlockUserDto) {
    return this.friendsService.blockUser(req.user.id, dto);
  }

  @Delete('block/:userId')
  async unblockUser(@Request() req, @Param('userId') userId: string) {
    return this.friendsService.unblockUser(req.user.id, userId);
  }

  @Get('blocked')
  async getBlockedUsers(@Request() req) {
    return this.friendsService.getBlockedUsers(req.user.id);
  }
}