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
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateVoiceRoomDto,
  UpdateVoiceRoomDto,
  StageActionDto,
  RaiseHandDto,
} from './dto/voice.dto';

@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private voiceService: VoiceService) {}

  // ============ ROOMS ============

  @Get('rooms')
  async getRooms(
    @Request() req,
    @Query() query: { type?: string; status?: string },
  ) {
    return this.voiceService.getRooms(req.user.id, query);
  }

  @Get('rooms/:roomId')
  async getRoom(@Request() req, @Param('roomId') roomId: string) {
    return this.voiceService.getRoomById(roomId, req.user.id);
  }

  @Post('rooms')
  async createRoom(@Request() req, @Body() dto: CreateVoiceRoomDto) {
    return this.voiceService.createRoom(req.user.id, dto);
  }

  @Put('rooms/:roomId')
  async updateRoom(
    @Request() req,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateVoiceRoomDto,
  ) {
    return this.voiceService.updateRoom(req.user.id, roomId, dto);
  }

  @Post('rooms/:roomId/end')
  @HttpCode(HttpStatus.OK)
  async endRoom(@Request() req, @Param('roomId') roomId: string) {
    return this.voiceService.endRoom(req.user.id, roomId);
  }

  // ============ PARTICIPANTS ============

  @Post('rooms/:roomId/join')
  async joinRoom(@Request() req, @Param('roomId') roomId: string) {
    return this.voiceService.joinRoom(req.user.id, roomId);
  }

  @Post('rooms/:roomId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveRoom(@Request() req, @Param('roomId') roomId: string) {
    return this.voiceService.leaveRoom(req.user.id, roomId);
  }

  @Put('rooms/:roomId/role/:userId')
  async updateRole(
    @Request() req,
    @Param('roomId') roomId: string,
    @Param('userId') targetUserId: string,
    @Body('role') role: string,
  ) {
    return this.voiceService.updateParticipantRole(
      req.user.id,
      roomId,
      targetUserId,
      role,
    );
  }

  // ============ STAGE ============

  @Post('rooms/:roomId/stage/add/:userId')
  async addToStage(
    @Request() req,
    @Param('roomId') roomId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.voiceService.addToStage(req.user.id, roomId, targetUserId);
  }

  @Post('rooms/:roomId/stage/remove/:userId')
  async removeFromStage(
    @Request() req,
    @Param('roomId') roomId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.voiceService.removeFromStage(req.user.id, roomId, targetUserId);
  }

  // ============ RECORDINGS ============

  @Get('rooms/:roomId/recordings')
  async getRecordings(@Request() req, @Param('roomId') roomId: string) {
    return this.voiceService.getRecordings(roomId, req.user.id);
  }
}
