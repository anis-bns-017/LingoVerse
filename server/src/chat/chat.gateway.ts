import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { parse as parseCookie } from 'cookie';
import { Logger, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets: Map<string, string[]> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map(); // roomId -> Set of userIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers.cookie;

      if (!cookieHeader) {
        this.logger.warn('No cookie header, disconnecting');
        client.disconnect();
        return;
      }

      const cookies = parseCookie(String(cookieHeader)) as Record<
        string,
        string
      >;
      const token = cookies['accessToken'];

      if (!token) {
        this.logger.warn('No access token, disconnecting');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // Store socket
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);

      // Join all chat rooms the user is part of
      const chats = await this.prisma.chat.findMany({
        where: {
          participants: {
            some: { userId },
          },
        },
        select: { id: true },
      });

      for (const chat of chats) {
        await client.join(`chat:${chat.id}`);
        client.to(`chat:${chat.id}`).emit('user:online', { userId });
      }

      // Join all community rooms the user is part of
      const communities = await this.prisma.communityMember.findMany({
        where: { userId },
        select: { communityId: true },
      });

      for (const member of communities) {
        await client.join(`community:${member.communityId}`);
        client.to(`community:${member.communityId}`).emit('user:online', { userId });
      }

      this.logger.log(`✅ User ${userId} connected via socket ${client.id}`);
    } catch (error) {
      this.logger.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      // Remove from typing users
      for (const [roomId, users] of this.typingUsers.entries()) {
        if (users.has(userId)) {
          users.delete(userId);
          if (users.size === 0) {
            this.typingUsers.delete(roomId);
          }
          // Notify room that user stopped typing
          this.server.to(roomId).emit('typing:stop', {
            userId,
            chatId: roomId.startsWith('chat:') ? roomId.replace('chat:', '') : undefined,
            communityId: roomId.startsWith('community:') ? roomId.replace('community:', '') : undefined,
          });
        }
      }

      // Remove socket
      const sockets = this.userSockets.get(userId) || [];
      const index = sockets.indexOf(client.id);

      if (index > -1) {
        sockets.splice(index, 1);

        if (sockets.length === 0) {
          this.userSockets.delete(userId);

          // Notify chat rooms
          const chats = await this.prisma.chat.findMany({
            where: { participants: { some: { userId } } },
            select: { id: true },
          });
          for (const chat of chats) {
            client.to(`chat:${chat.id}`).emit('user:offline', { userId });
          }

          // Notify community rooms
          const communities = await this.prisma.communityMember.findMany({
            where: { userId },
            select: { communityId: true },
          });
          for (const member of communities) {
            client
              .to(`community:${member.communityId}`)
              .emit('user:offline', { userId });
          }
        } else {
          this.userSockets.set(userId, sockets);
        }
      }
    }

    this.logger.log(`Client ${client.id} disconnected`);
  }

  // ==========================
  // ROOM MEMBERSHIP
  // ==========================

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.chatId) {
      client.emit('error', { message: 'Invalid request' });
      return;
    }

    try {
      const participant = await this.prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId: data.chatId, userId } },
      });
      if (!participant) {
        client.emit('error', { message: 'You are not a participant in this chat' });
        return;
      }

      await client.join(`chat:${data.chatId}`);
      this.logger.log(`User ${userId} joined chat ${data.chatId}`);
      client.emit('chat:joined', { chatId: data.chatId });
    } catch (error) {
      this.logger.error('Error joining chat:', error);
      client.emit('error', { message: 'Failed to join chat' });
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!data?.chatId) return;
    await client.leave(`chat:${data.chatId}`);
    this.logger.log(`User ${client.data.userId} left chat ${data.chatId}`);
    client.emit('chat:left', { chatId: data.chatId });
  }

  @SubscribeMessage('community:join')
  async handleJoinCommunity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { communityId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.communityId) {
      client.emit('error', { message: 'Invalid request' });
      return;
    }

    try {
      const member = await this.prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: data.communityId, userId } },
      });
      if (!member) {
        client.emit('error', { message: 'You are not a member of this community' });
        return;
      }

      await client.join(`community:${data.communityId}`);
      client.to(`community:${data.communityId}`).emit('user:online', { userId });
      this.logger.log(`User ${userId} joined community ${data.communityId}`);
      client.emit('community:joined', { communityId: data.communityId });
    } catch (error) {
      this.logger.error('Error joining community:', error);
      client.emit('error', { message: 'Failed to join community' });
    }
  }

  @SubscribeMessage('community:leave')
  async handleLeaveCommunity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { communityId: string },
  ) {
    if (!data?.communityId) return;
    await client.leave(`community:${data.communityId}`);
    this.logger.log(
      `User ${client.data.userId} left community ${data.communityId}`,
    );
    client.emit('community:left', { communityId: data.communityId });
  }

  // ==========================
  // MESSAGE - SEND
  // ==========================

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      chatId?: string;
      communityId?: string;
      content?: string;
      type?: string;
      mediaUrl?: string;
      fileUrl?: string;
      replyToId?: string;
    },
  ) {
    const userId = client.data.userId;

    if (!userId) {
      client.emit('message:error', { message: 'Unauthenticated' });
      return;
    }

    if (!data.content && !data.mediaUrl && !data.fileUrl) {
      client.emit('message:error', { message: 'Message content is required' });
      return;
    }

    if (!data.chatId && !data.communityId) {
      client.emit('message:error', {
        message: 'chatId or communityId is required',
      });
      return;
    }

    try {
      const message = await this.chatService.sendMessage(userId, {
        chatId: data.chatId,
        communityId: data.communityId,
        content: data.content || '',
        type: data.type || 'TEXT',
        mediaUrl: data.mediaUrl,
        fileUrl: data.fileUrl,
        replyToId: data.replyToId,
      });

      let roomId: string | null = null;
      if (data.chatId) {
        roomId = `chat:${data.chatId}`;
      } else if (data.communityId) {
        roomId = `community:${data.communityId}`;
      }

      if (roomId) {
        // Broadcast to all participants in the room
        this.server.to(roomId).emit('message:new', message);
        
        // Also send confirmation back to sender (so they don't need to rely on the broadcast)
        client.emit('message:sent', message);
        
        this.logger.log(`📤 Message sent to ${roomId} by user ${userId}`);
      }
    } catch (error: any) {
      this.logger.error('Error sending message:', error);
      client.emit('message:error', {
        error: error.message || 'Failed to send message',
      });
    }
  }

  // ==========================
  // VOICE MESSAGE
  // ==========================

  @SubscribeMessage('voice:message:send')
  async handleVoiceMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      chatId?: string;
      communityId?: string;
      audioUrl: string;
      duration: number;
    },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('message:error', { message: 'Unauthenticated' });
      return;
    }

    if (!data.chatId && !data.communityId) {
      client.emit('message:error', {
        message: 'chatId or communityId is required',
      });
      return;
    }

    try {
      const message = await this.chatService.sendMessage(userId, {
        chatId: data.chatId,
        communityId: data.communityId,
        content: '🎤 Voice message',
        type: 'VOICE_NOTE',
        mediaUrl: data.audioUrl,
      });

      let roomId: string | null = null;
      if (data.chatId) {
        roomId = `chat:${data.chatId}`;
      } else if (data.communityId) {
        roomId = `community:${data.communityId}`;
      }

      if (roomId) {
        this.server.to(roomId).emit('voice:message:new', message);
        client.emit('voice:message:sent', message);
        this.logger.log(`🎤 Voice message sent to ${roomId} by user ${userId}`);
      }
    } catch (error: any) {
      this.logger.error('Error sending voice message:', error);
      client.emit('message:error', {
        error: error.message || 'Failed to send voice message',
      });
    }
  }

  // ==========================
  // MESSAGE - DELETE
  // ==========================

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('message:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const message = await this.chatService.deleteMessage(
        userId,
        data.messageId,
      );
      if (message) {
        let roomId: string | null = null;
        if (message.chatId) {
          roomId = `chat:${message.chatId}`;
        } else if (message.communityId) {
          roomId = `community:${message.communityId}`;
        }
        if (roomId) {
          this.server.to(roomId).emit('message:deleted', {
            messageId: data.messageId,
            userId,
            chatId: message.chatId,
            communityId: message.communityId,
          });
          client.emit('message:deleted', {
            messageId: data.messageId,
            success: true,
          });
        }
      }
    } catch (error: any) {
      this.logger.error('Error deleting message:', error);
      client.emit('message:error', {
        error: error.message || 'Failed to delete message',
      });
    }
  }

  // ==========================
  // MESSAGE - EDIT
  // ==========================

  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('message:error', { message: 'Unauthenticated' });
      return;
    }

    if (!data.content) {
      client.emit('message:error', { message: 'Content is required' });
      return;
    }

    try {
      const message = await this.chatService.editMessage(
        userId,
        data.messageId,
        data.content,
      );
      if (message) {
        let roomId: string | null = null;
        if (message.chatId) {
          roomId = `chat:${message.chatId}`;
        } else if (message.communityId) {
          roomId = `community:${message.communityId}`;
        }
        if (roomId) {
          this.server.to(roomId).emit('message:edited', message);
          client.emit('message:edited', message);
        }
      }
    } catch (error: any) {
      this.logger.error('Error editing message:', error);
      client.emit('message:error', {
        error: error.message || 'Failed to edit message',
      });
    }
  }

  // ==========================
  // TYPING
  // ==========================

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId?: string; communityId?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const roomId = data.chatId
      ? `chat:${data.chatId}`
      : data.communityId
        ? `community:${data.communityId}`
        : null;
    if (!roomId) return;

    // Track typing users
    if (!this.typingUsers.has(roomId)) {
      this.typingUsers.set(roomId, new Set());
    }
    this.typingUsers.get(roomId)!.add(userId);

    client.to(roomId).emit('typing:start', {
      userId,
      chatId: data.chatId,
      communityId: data.communityId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId?: string; communityId?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const roomId = data.chatId
      ? `chat:${data.chatId}`
      : data.communityId
        ? `community:${data.communityId}`
        : null;
    if (!roomId) return;

    // Remove from typing users
    const users = this.typingUsers.get(roomId);
    if (users) {
      users.delete(userId);
      if (users.size === 0) {
        this.typingUsers.delete(roomId);
      }
    }

    client.to(roomId).emit('typing:stop', {
      userId,
      chatId: data.chatId,
      communityId: data.communityId,
    });
  }

  // ==========================
  // READ RECEIPTS
  // ==========================

  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      chatId: string;
      messageId: string;
    },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('error', { message: 'Unauthenticated' });
      return;
    }

    try {
      await this.chatService.markMessageRead(
        userId,
        data.chatId,
        data.messageId,
      );

      client.to(`chat:${data.chatId}`).emit('message:read', {
        userId,
        messageId: data.messageId,
        chatId: data.chatId,
      });
    } catch (error) {
      this.logger.error('Error marking message as read:', error);
      client.emit('error', { message: 'Failed to mark message as read' });
    }
  }

  // ==========================
  // REACTIONS
  // ==========================

  @SubscribeMessage('reaction:add')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      messageId: string;
      emoji: string;
    },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('reaction:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const reaction = await this.chatService.addReaction(
        userId,
        data.messageId,
        data.emoji,
      );

      // Find which room this message belongs to
      const message = await this.prisma.message.findUnique({
        where: { id: data.messageId },
        select: { chatId: true, communityId: true },
      });

      if (message) {
        let roomId: string | null = null;
        if (message.chatId) {
          roomId = `chat:${message.chatId}`;
        } else if (message.communityId) {
          roomId = `community:${message.communityId}`;
        }
        if (roomId) {
          this.server.to(roomId).emit('reaction:new', reaction);
        }
      }
    } catch (error: any) {
      this.logger.error('Error adding reaction:', error);
      client.emit('reaction:error', {
        error: error.message || 'Failed to add reaction',
      });
    }
  }

  @SubscribeMessage('reaction:remove')
  async handleRemoveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      messageId: string;
      emoji: string;
    },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('reaction:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      await this.chatService.removeReaction(userId, data.messageId, data.emoji);

      const message = await this.prisma.message.findUnique({
        where: { id: data.messageId },
        select: { chatId: true, communityId: true },
      });

      if (message) {
        let roomId: string | null = null;
        if (message.chatId) {
          roomId = `chat:${message.chatId}`;
        } else if (message.communityId) {
          roomId = `community:${message.communityId}`;
        }
        if (roomId) {
          this.server.to(roomId).emit('reaction:removed', {
            messageId: data.messageId,
            userId,
            emoji: data.emoji,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error removing reaction:', error);
      client.emit('reaction:error', {
        error: error.message || 'Failed to remove reaction',
      });
    }
  }

  // ==========================
  // CHAT HISTORY
  // ==========================

  @SubscribeMessage('messages:fetch')
  async handleFetchMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      chatId?: string;
      communityId?: string;
      limit?: number;
      before?: string;
    },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('message:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      let messages;
      if (data.chatId) {
        // Verify user is a participant
        const participant = await this.prisma.chatParticipant.findUnique({
          where: { chatId_userId: { chatId: data.chatId, userId } },
        });
        if (!participant) {
          client.emit('message:error', { message: 'You are not a participant in this chat' });
          return;
        }

        messages = await this.chatService.getMessages(userId, {
          chatId: data.chatId,
          limit: data.limit ? String(data.limit) : '50',
          before: data.before,
        });
      } else if (data.communityId) {
        // Verify user is a member
        const member = await this.prisma.communityMember.findUnique({
          where: { communityId_userId: { communityId: data.communityId, userId } },
        });
        if (!member) {
          client.emit('message:error', { message: 'You are not a member of this community' });
          return;
        }

        messages = await this.chatService.getCommunityMessages(
          userId,
          data.communityId,
          data.limit || 50,
          data.before,
        );
      } else {
        client.emit('message:error', {
          message: 'chatId or communityId is required',
        });
        return;
      }
      client.emit('messages:list', messages);
    } catch (error: any) {
      this.logger.error('Error fetching messages:', error);
      client.emit('message:error', {
        error: error.message || 'Failed to fetch messages',
      });
    }
  }

  // ==========================
  // PIN MESSAGES
  // ==========================

  @SubscribeMessage('message:pin')
  async handlePinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; pinned: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const message = await this.chatService.pinMessage(
        userId,
        data.messageId,
        data.pinned,
      );
      if (message) {
        let roomId: string | null = null;
        if (message.chatId) {
          roomId = `chat:${message.chatId}`;
        } else if (message.communityId) {
          roomId = `community:${message.communityId}`;
        }
        if (roomId) {
          this.server.to(roomId).emit('message:pinned', {
            messageId: data.messageId,
            pinned: data.pinned,
            userId,
          });
          client.emit('message:pinned', {
            messageId: data.messageId,
            pinned: data.pinned,
            success: true,
          });
        }
      }
    } catch (error: any) {
      this.logger.error('Error pinning message:', error);
      client.emit('error', {
        error: error.message || 'Failed to pin message',
      });
    }
  }
}