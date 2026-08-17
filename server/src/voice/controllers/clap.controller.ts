import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClapService } from '../services/clap.service';

@ApiTags('voice-claps')
@Controller('voice/claps')
@UseGuards(JwtAuthGuard)
export class ClapController {
  constructor(private clapService: ClapService) {}

  @Post(':roomId')
  @ApiOperation({ summary: 'Add a clap to a room' })
  @ApiResponse({ status: 200, description: 'Clap added' })
  async addClap(
    @Param('roomId') roomId: string,
    @Body('targetUserId') targetUserId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.clapService.addClap(roomId, userId, targetUserId);
  }

  @Get(':roomId/stats')
  @ApiOperation({ summary: 'Get room clap statistics' })
  @ApiResponse({ status: 200, description: 'Clap stats retrieved' })
  async getRoomClaps(@Param('roomId') roomId: string) {
    return this.clapService.getRoomClaps(roomId);
  }
}
