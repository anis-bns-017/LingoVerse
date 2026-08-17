import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SpeakerQueueService } from '../services/queue.service';

@ApiTags('voice-queue')
@Controller('voice/queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(private queueService: SpeakerQueueService) {}

  @Post(':roomId')
  @ApiOperation({ summary: 'Add user to speaker queue' })
  @ApiResponse({ status: 200, description: 'Added to queue' })
  async addToQueue(@Param('roomId') roomId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.queueService.addToQueue(roomId, userId);
  }

  @Delete(':roomId')
  @ApiOperation({ summary: 'Remove user from speaker queue' })
  @ApiResponse({ status: 200, description: 'Removed from queue' })
  async removeFromQueue(@Param('roomId') roomId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.queueService.removeFromQueue(roomId, userId);
  }

  @Post('promote/:roomId/:userId')
  @ApiOperation({ summary: 'Promote user to speaker' })
  @ApiResponse({ status: 200, description: 'User promoted' })
  async promoteToSpeaker(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    const moderatorId = req.user.id;
    return this.queueService.promoteToSpeaker(roomId, userId, moderatorId);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get speaker queue' })
  @ApiResponse({ status: 200, description: 'Queue retrieved' })
  async getQueue(@Param('roomId') roomId: string) {
    return this.queueService.getQueue(roomId);
  }

  @Post('invite/:roomId/:userId')
  @ApiOperation({ summary: 'Invite user to stage' })
  @ApiResponse({ status: 200, description: 'User invited' })
  async inviteToStage(
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    const moderatorId = req.user.id;
    return this.queueService.inviteToStage(roomId, userId, moderatorId);
  }
}
