import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateCommunityDto,
  UpdateCommunityDto,
  CreateChannelDto,
  UpdateChannelDto,
  CreateThreadDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
  BanMemberDto,
  CreateInviteDto,
} from './dto/community.dto';

@Controller('communities')
@UseGuards(JwtAuthGuard)
export class CommunitiesController {
  constructor(private communitiesService: CommunitiesService) {}

  // ============ COMMUNITIES ============

  @Get()
  async getCommunities(@Request() req) {
    return this.communitiesService.getCommunities(req.user.id);
  }

  @Get(':communityId')
  async getCommunity(
    @Request() req,
    @Param('communityId') communityId: string,
  ) {
    return this.communitiesService.getCommunityById(communityId, req.user.id);
  }

  @Post()
  async createCommunity(@Request() req, @Body() dto: CreateCommunityDto) {
    return this.communitiesService.createCommunity(req.user.id, dto);
  }

  @Put(':communityId')
  async updateCommunity(
    @Request() req,
    @Param('communityId') communityId: string,
    @Body() dto: UpdateCommunityDto,
  ) {
    return this.communitiesService.updateCommunity(
      req.user.id,
      communityId,
      dto,
    );
  }

  @Delete(':communityId')
  async deleteCommunity(
    @Request() req,
    @Param('communityId') communityId: string,
  ) {
    return this.communitiesService.deleteCommunity(req.user.id, communityId);
  }

  // ============ CHANNELS ============

  @Post(':communityId/channels')
  async createChannel(
    @Request() req,
    @Param('communityId') communityId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.communitiesService.createChannel(req.user.id, communityId, dto);
  }

  @Put(':communityId/channels/:channelId')
  async updateChannel(
    @Request() req,
    @Param('communityId') communityId: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.communitiesService.updateChannel(
      req.user.id,
      communityId,
      channelId,
      dto,
    );
  }

  @Delete(':communityId/channels/:channelId')
  async deleteChannel(
    @Request() req,
    @Param('communityId') communityId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.communitiesService.deleteChannel(
      req.user.id,
      communityId,
      channelId,
    );
  }

  // ============ THREADS ============

  @Post('channels/:channelId/threads')
  async createThread(
    @Request() req,
    @Param('channelId') channelId: string,
    @Body() dto: CreateThreadDto,
  ) {
    return this.communitiesService.createThread(req.user.id, channelId, dto);
  }

  @Get('channels/:channelId/threads')
  async getThreads(@Request() req, @Param('channelId') channelId: string) {
    return this.communitiesService.getThreads(channelId, req.user.id);
  }

  @Get('threads/:threadId')
  async getThread(@Request() req, @Param('threadId') threadId: string) {
    return this.communitiesService.getThreadById(threadId, req.user.id);
  }

  // ============ MEMBERS ============

  @Post(':communityId/join')
  async joinCommunity(
    @Request() req,
    @Param('communityId') communityId: string,
  ) {
    return this.communitiesService.joinCommunity(req.user.id, communityId);
  }

  @Post(':communityId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveCommunity(
    @Request() req,
    @Param('communityId') communityId: string,
  ) {
    return this.communitiesService.leaveCommunity(req.user.id, communityId);
  }

  @Post(':communityId/members')
  async addMember(
    @Request() req,
    @Param('communityId') communityId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.communitiesService.addMember(req.user.id, communityId, dto);
  }

  @Put(':communityId/members/:userId/role')
  async updateMemberRole(
    @Request() req,
    @Param('communityId') communityId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.communitiesService.updateMemberRole(
      req.user.id,
      communityId,
      targetUserId,
      dto,
    );
  }

  @Delete(':communityId/members/:userId')
  async removeMember(
    @Request() req,
    @Param('communityId') communityId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.communitiesService.removeMember(
      req.user.id,
      communityId,
      targetUserId,
    );
  }

  // ============ ROLES ============

  @Post(':communityId/roles')
  async createRole(
    @Request() req,
    @Param('communityId') communityId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.communitiesService.createRole(req.user.id, communityId, dto);
  }

  @Put(':communityId/roles/:roleId')
  async updateRole(
    @Request() req,
    @Param('communityId') communityId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.communitiesService.updateRole(
      req.user.id,
      communityId,
      roleId,
      dto,
    );
  }

  @Delete(':communityId/roles/:roleId')
  async deleteRole(
    @Request() req,
    @Param('communityId') communityId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.communitiesService.deleteRole(req.user.id, communityId, roleId);
  }

  // ============ BANS ============

  @Post(':communityId/bans')
  async banMember(
    @Request() req,
    @Param('communityId') communityId: string,
    @Body() dto: BanMemberDto,
  ) {
    return this.communitiesService.banMember(req.user.id, communityId, dto);
  }

  @Delete(':communityId/bans/:userId')
  async unbanMember(
    @Request() req,
    @Param('communityId') communityId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.communitiesService.unbanMember(
      req.user.id,
      communityId,
      targetUserId,
    );
  }

  // ============ INVITES ============

  @Post(':communityId/invites')
  async createInvite(
    @Request() req,
    @Param('communityId') communityId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.communitiesService.createInvite(req.user.id, communityId, dto);
  }

  @Post('join/:code')
  async joinByInvite(@Request() req, @Param('code') code: string) {
    return this.communitiesService.joinByInvite(req.user.id, code);
  }
}
