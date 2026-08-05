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
  SendVoiceMessageDto,
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

  @Get('rooms/:roomId/participants')
  async getRoomParticipants(@Request() req, @Param('roomId') roomId: string) {
    return this.voiceService.getRoomParticipants(roomId, req.user.id);
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

  @Post('rooms/:roomId/recordings/start')
  @HttpCode(HttpStatus.OK)
  async startRecording(@Request() req, @Param('roomId') roomId: string) {
    return this.voiceService.startRecording(req.user.id, roomId);
  }

  @Post('rooms/:roomId/recordings/stop')
  @HttpCode(HttpStatus.OK)
  async stopRecording(@Request() req, @Param('roomId') roomId: string) {
    return this.voiceService.stopRecording(req.user.id, roomId);
  }

  // ============ CHAT MESSAGES (Voice Room Chat) ============

  @Get('rooms/:roomId/messages')
  async getRoomMessages(
    @Request() req,
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.voiceService.getVoiceRoomMessages(
      req.user.id,
      roomId,
      limit ? parseInt(limit) : 50,
      before,
    );
  }

  @Post('rooms/:roomId/messages')
  async sendRoomMessage(
    @Request() req,
    @Param('roomId') roomId: string,
    @Body() dto: SendVoiceMessageDto,
  ) {
    return this.voiceService.sendVoiceRoomMessage(
      req.user.id,
      roomId,
      dto.content,
      dto.type || 'TEXT',
      dto.mediaUrl,
      dto.fileUrl,
      dto.replyToId,
    );
  }

  @Delete('rooms/:roomId/messages/:messageId')
  @HttpCode(HttpStatus.OK)
  async deleteRoomMessage(
    @Request() req,
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.voiceService.deleteVoiceRoomMessage(
      req.user.id,
      roomId,
      messageId,
    );
  }

  // ============ RAISE HAND ============

  @Post('rooms/:roomId/raise-hand')
  @HttpCode(HttpStatus.OK)
  async raiseHand(
    @Request() req,
    @Param('roomId') roomId: string,
    @Body() dto: RaiseHandDto,
  ) {
    // This is handled via WebSocket, but we keep REST for fallback
    // The WebSocket handler will update the database
    return { success: true };
  }

  // ============ CHECK USER STATUS ============

  @Get('rooms/:roomId/status')
  async checkUserStatus(@Request() req, @Param('roomId') roomId: string) {
    const isInRoom = await this.voiceService.isUserInRoom(roomId, req.user.id);
    return { inRoom: isInRoom };
  }

  @Get('rooms/:roomId/active-participants')
  async getActiveParticipants(@Request() req, @Param('roomId') roomId: string) {
    return this.voiceService.getActiveParticipants(roomId);
  }
}