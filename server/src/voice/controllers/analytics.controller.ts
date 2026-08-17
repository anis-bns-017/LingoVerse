
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnalyticsService } from '../services/analytics.service';

@Controller('voice/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get(':roomId')
  async getRoomAnalytics(@Param('roomId') roomId: string) {
    return this.analyticsService.getRoomAnalytics(roomId);
  }

  @Get(':roomId/speakers')
  async getSpeakerStats(@Param('roomId') roomId: string) {
    return this.analyticsService.getSpeakerStats(roomId);
  }

  @Get(':roomId/live')
  async getLiveStats(@Param('roomId') roomId: string) {
    return this.analyticsService.getLiveRoomStats(roomId);
  }
}