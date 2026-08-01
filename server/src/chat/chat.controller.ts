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
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateChatDto,
  SendMessageDto,
  GetMessagesDto,
  MarkReadDto,
  AddReactionDto,
  CreateGroupDto,
  AddParticipantsDto,
  RemoveParticipantDto,
} from './dto/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ============ CHATS ============

  @Get()
  async getUserChats(@Request() req) {
    return this.chatService.getUserChats(req.user.id);
  }

  @Get(':chatId')
  async getChatById(@Request() req, @Param('chatId') chatId: string) {
    return this.chatService.getChatById(chatId, req.user.id);
  }

  @Post('private/:userId')
  async createPrivateChat(@Request() req, @Param('userId') otherUserId: string) {
    return this.chatService.createPrivateChat(req.user.id, otherUserId);
  }

  @Post('group')
  async createGroupChat(@Request() req, @Body() dto: CreateGroupDto) {
    return this.chatService.createGroupChat(req.user.id, {
      type: 'GROUP',
      name: dto.name,
      participantIds: dto.participantIds,
    });
  }

  @Post('group/:chatId/add')
  async addParticipants(
    @Request() req,
    @Param('chatId') chatId: string,
    @Body() dto: AddParticipantsDto,
  ) {
    return this.chatService.addParticipants(chatId, req.user.id, dto.userIds);
  }

  @Delete('group/:chatId/remove/:userId')
  async removeParticipant(
    @Request() req,
    @Param('chatId') chatId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.chatService.removeParticipant(chatId, req.user.id, targetUserId);
  }

  // ============ MESSAGES ============

  @Get(':chatId/messages')
  async getMessages(@Request() req, @Param('chatId') chatId: string, @Query() dto: GetMessagesDto) {
    dto.chatId = chatId;
    return this.chatService.getMessages(req.user.id, dto);
  }

  @Post('messages')
  async sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(req.user.id, dto);
  }

  @Put('messages/read')
  async markMessageRead(@Request() req, @Body() dto: MarkReadDto) {
    return this.chatService.markMessageRead(req.user.id, dto.chatId, dto.messageId);
  }

  @Post('messages/reaction')
  async addReaction(@Request() req, @Body() dto: AddReactionDto) {
    return this.chatService.addReaction(req.user.id, dto.messageId, dto.emoji);
  }

  @Get('messages/:messageId/read-receipts')
  async getReadReceipts(@Request() req, @Param('messageId') messageId: string) {
    return this.chatService.getReadReceipts(messageId, req.user.id);
  }

  @Get('search/:chatId')
  async searchMessages(@Request() req, @Param('chatId') chatId: string, @Query('q') query: string) {
    return this.chatService.searchMessages(req.user.id, chatId, query);
  }
}