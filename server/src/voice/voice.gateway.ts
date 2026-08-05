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
import { parse } from 'cookie';
import { Logger, ForbiddenException } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { PrismaService } from '../prisma.service';
import { MessageType } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'voice',
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private roomParticipants: Map<string, Set<string>> = new Map(); // roomId -> Set of userIds
  private roomHosts: Map<string, string> = new Map(); // roomId -> hostUserId
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]
  private userNames: Map<string, string> = new Map(); // userId -> userName

  constructor(
    private jwtService: JwtService,
    private voiceService: VoiceService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers.cookie;
      if (!cookieHeader) {
        this.logger.warn('No cookie header, disconnecting');
        client.disconnect();
        return;
      }

      const cookies = parse(cookieHeader);
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

      // Fetch user name for display
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      if (user) {
        client.data.userName = user.name;
        this.userNames.set(userId, user.name);
      }

      // Store user socket
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);

      this.logger.log(`✅ User ${userId} connected to voice socket`);
    } catch (error) {
      this.logger.error('VoiceGateway auth error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    // Remove socket from userSockets
    const sockets = this.userSockets.get(userId) || [];
    const index = sockets.indexOf(client.id);
    if (index > -1) {
      sockets.splice(index, 1);
      if (sockets.length === 0) {
        this.userSockets.delete(userId);
        this.userNames.delete(userId);
      } else {
        this.userSockets.set(userId, sockets);
      }
    }

    // Remove from all rooms
    for (const [roomId, participants] of this.roomParticipants) {
      if (participants.has(userId)) {
        participants.delete(userId);
        if (participants.size === 0) {
          this.roomParticipants.delete(roomId);
          this.roomHosts.delete(roomId);
        } else {
          // If host left, transfer host to another participant
          if (this.roomHosts.get(roomId) === userId) {
            const newHost = Array.from(participants)[0];
            if (newHost) {
              this.roomHosts.set(roomId, newHost);
              this.server.to(`voice:${roomId}`).emit('voice:host-changed', {
                newHostId: newHost,
              });
            }
          }
        }
        this.server.to(`voice:${roomId}`).emit('participant:left', { userId });
      }
    }

    this.logger.log(`User ${userId} disconnected from voice`);
  }

  // ============ JOIN / LEAVE ============

  @SubscribeMessage('voice:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      if (!room) {
        client.emit('voice:error', { message: 'Room not found' });
        return;
      }

      if (room.status === 'ENDED') {
        client.emit('voice:error', { message: 'Room has ended' });
        return;
      }

      // Check if user is already in the room
      const existingParticipant = await this.prisma.voiceParticipant.findUnique(
        {
          where: {
            roomId_userId: { roomId: data.roomId, userId },
          },
        },
      );

      // Add or update participant in database
      if (!existingParticipant) {
        await this.prisma.voiceParticipant.create({
          data: {
            roomId: data.roomId,
            userId,
            role: userId === room.creatorId ? 'MODERATOR' : 'LISTENER',
          },
        });
      } else if (existingParticipant.leftAt) {
        await this.prisma.voiceParticipant.update({
          where: {
            roomId_userId: { roomId: data.roomId, userId },
          },
          data: { leftAt: null, joinedAt: new Date() },
        });
      }

      // Join socket room
      await client.join(`voice:${data.roomId}`);

      // Track participant in memory
      if (!this.roomParticipants.has(data.roomId)) {
        this.roomParticipants.set(data.roomId, new Set());
      }
      this.roomParticipants.get(data.roomId)!.add(userId);

      // Track host
      if (!this.roomHosts.has(data.roomId)) {
        this.roomHosts.set(data.roomId, room.creatorId);
      }

      // Send current participants list to the joining client
      const participants = Array.from(
        this.roomParticipants.get(data.roomId) || [],
      );

      // Get full participant details from database
      const participantDetails = await this.prisma.voiceParticipant.findMany({
        where: {
          roomId: data.roomId,
          leftAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      client.emit('voice:participants', {
        participants: participantDetails,
        participantIds: participants,
      });

      // Send host info
      client.emit('voice:host', { hostId: this.roomHosts.get(data.roomId) });

      // Get user name for notification
      const userName = this.userNames.get(userId) || 'User';

      // Notify others
      client.to(`voice:${data.roomId}`).emit('participant:joined', {
        userId,
        userName,
      });

      // Send message history (last 50 messages)
      const messages = await this.prisma.message.findMany({
        where: {
          chatId: data.roomId,
          isDeleted: false,
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      client.emit('voice:message-history', messages.reverse());

      this.logger.log(`User ${userId} joined voice room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Error joining voice room:', error);
      client.emit('voice:error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('voice:leave')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      // Update database
      await this.prisma.voiceParticipant.update({
        where: {
          roomId_userId: { roomId: data.roomId, userId },
        },
        data: { leftAt: new Date() },
      });

      // Leave socket room
      await client.leave(`voice:${data.roomId}`);

      // Remove from memory
      const participants = this.roomParticipants.get(data.roomId);
      if (participants) {
        participants.delete(userId);
        if (participants.size === 0) {
          this.roomParticipants.delete(data.roomId);
          this.roomHosts.delete(data.roomId);
        } else {
          // If host left, transfer host
          if (this.roomHosts.get(data.roomId) === userId) {
            const newHost = Array.from(participants)[0];
            if (newHost) {
              this.roomHosts.set(data.roomId, newHost);
              this.server
                .to(`voice:${data.roomId}`)
                .emit('voice:host-changed', {
                  newHostId: newHost,
                });
            }
          }
        }
      }

      client.to(`voice:${data.roomId}`).emit('participant:left', { userId });

      this.logger.log(`User ${userId} left voice room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Error leaving voice room:', error);
      client.emit('voice:error', { message: 'Failed to leave room' });
    }
  }

  // ============ CHAT MESSAGES (WITH DATABASE PERSISTENCE) ============

  @SubscribeMessage('voice:chat')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      content: string;
      type?: string;
      mediaUrl?: string;
      fileUrl?: string;
      replyToId?: string;
    },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      // Verify user is in the room
      const participants = this.roomParticipants.get(data.roomId);
      if (!participants || !participants.has(userId)) {
        client.emit('voice:error', { message: 'You are not in this room' });
        return;
      }

      // Save message to database
      const message = await this.prisma.message.create({
        data: {
          chatId: data.roomId,
          senderId: userId,
          content: data.content,
          type: (data.type as MessageType) || MessageType.TEXT,
          mediaUrl: data.mediaUrl,
          fileUrl: data.fileUrl,
          replyToId: data.replyToId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Add host status to message
      const isHost = this.roomHosts.get(data.roomId) === userId;
      const messageWithHost = {
        ...message,
        isHost,
      };

      // Broadcast to all in room (including sender for consistency)
      this.server
        .to(`voice:${data.roomId}`)
        .emit('voice:chat', messageWithHost);

      this.logger.log(
        `💬 Voice room chat message from ${userId} in ${data.roomId}`,
      );
    } catch (error) {
      this.logger.error('Error sending voice room chat:', error);
      client.emit('voice:error', { message: 'Failed to send message' });
    }
  }

  // ============ TYPING INDICATOR ============

  @SubscribeMessage('voice:typing-start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const userName = this.userNames.get(userId) || 'User';

    client.to(`voice:${data.roomId}`).emit('voice:typing-start', {
      userId,
      userName,
    });
  }

  @SubscribeMessage('voice:typing-stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    client.to(`voice:${data.roomId}`).emit('voice:typing-stop', {
      userId,
    });
  }

  // ============ HOST CONTROLS ============

  @SubscribeMessage('voice:kick')
  async handleKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room) {
        client.emit('voice:error', { message: 'Room not found' });
        return;
      }

      // Check if sender is host
      if (room.creatorId !== userId) {
        client.emit('voice:error', {
          message: 'Only the host can kick members',
        });
        return;
      }

      // Check if target is host
      if (room.creatorId === data.userId) {
        client.emit('voice:error', { message: 'Cannot kick the host' });
        return;
      }

      // Remove from database
      await this.prisma.voiceParticipant.delete({
        where: {
          roomId_userId: { roomId: data.roomId, userId: data.userId },
        },
      });

      // Remove from memory
      const participants = this.roomParticipants.get(data.roomId);
      if (participants) {
        participants.delete(data.userId);
      }

      // Notify room
      this.server.to(`voice:${data.roomId}`).emit('voice:kicked', {
        userId: data.userId,
        kickedBy: userId,
      });

      // Notify the kicked user directly using userSockets map
      const kickedUserSockets = this.userSockets.get(data.userId);
      if (kickedUserSockets) {
        for (const socketId of kickedUserSockets) {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('voice:kicked', {
              roomId: data.roomId,
              reason: 'You were kicked by the host',
            });
            socket.leave(`voice:${data.roomId}`);
          }
        }
      }

      this.logger.log(`User ${data.userId} kicked from room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Error kicking user:', error);
      client.emit('voice:error', { message: 'Failed to kick user' });
    }
  }

  @SubscribeMessage('voice:mute-user')
  async handleMuteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room) {
        client.emit('voice:error', { message: 'Room not found' });
        return;
      }

      // Check if sender is host
      if (room.creatorId !== userId) {
        client.emit('voice:error', {
          message: 'Only the host can mute members',
        });
        return;
      }

      // Check if target is host
      if (room.creatorId === data.userId) {
        client.emit('voice:error', { message: 'Cannot mute the host' });
        return;
      }

      // Update database
      await this.prisma.voiceParticipant.update({
        where: {
          roomId_userId: { roomId: data.roomId, userId: data.userId },
        },
        data: { isMuted: true },
      });

      // Notify room
      this.server.to(`voice:${data.roomId}`).emit('voice:muted', {
        userId: data.userId,
        mutedBy: userId,
      });

      // Notify the muted user directly
      const mutedUserSockets = this.userSockets.get(data.userId);
      if (mutedUserSockets) {
        for (const socketId of mutedUserSockets) {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('voice:muted', {
              roomId: data.roomId,
              message: 'You were muted by the host',
            });
          }
        }
      }

      this.logger.log(`User ${data.userId} muted in room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Error muting user:', error);
      client.emit('voice:error', { message: 'Failed to mute user' });
    }
  }

  @SubscribeMessage('voice:unmute-user')
  async handleUnmuteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room) {
        client.emit('voice:error', { message: 'Room not found' });
        return;
      }

      // Check if sender is host
      if (room.creatorId !== userId) {
        client.emit('voice:error', {
          message: 'Only the host can unmute members',
        });
        return;
      }

      // Update database
      await this.prisma.voiceParticipant.update({
        where: {
          roomId_userId: { roomId: data.roomId, userId: data.userId },
        },
        data: { isMuted: false },
      });

      // Notify room
      this.server.to(`voice:${data.roomId}`).emit('voice:unmuted', {
        userId: data.userId,
        unmutedBy: userId,
      });

      this.logger.log(`User ${data.userId} unmuted in room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Error unmuting user:', error);
      client.emit('voice:error', { message: 'Failed to unmute user' });
    }
  }

  @SubscribeMessage('voice:promote')
  async handlePromote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room) {
        client.emit('voice:error', { message: 'Room not found' });
        return;
      }

      // Check if sender is host
      if (room.creatorId !== userId) {
        client.emit('voice:error', {
          message: 'Only the host can promote members',
        });
        return;
      }

      // Promote to moderator
      await this.prisma.voiceParticipant.update({
        where: {
          roomId_userId: { roomId: data.roomId, userId: data.userId },
        },
        data: { role: 'MODERATOR' },
      });

      this.server.to(`voice:${data.roomId}`).emit('voice:promoted', {
        userId: data.userId,
        promotedBy: userId,
      });

      this.logger.log(`User ${data.userId} promoted in room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Error promoting user:', error);
      client.emit('voice:error', { message: 'Failed to promote user' });
    }
  }

  @SubscribeMessage('voice:demote')
  async handleDemote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room) {
        client.emit('voice:error', { message: 'Room not found' });
        return;
      }

      // Check if sender is host
      if (room.creatorId !== userId) {
        client.emit('voice:error', {
          message: 'Only the host can demote members',
        });
        return;
      }

      // Demote to listener
      await this.prisma.voiceParticipant.update({
        where: {
          roomId_userId: { roomId: data.roomId, userId: data.userId },
        },
        data: { role: 'LISTENER' },
      });

      this.server.to(`voice:${data.roomId}`).emit('voice:demoted', {
        userId: data.userId,
        demotedBy: userId,
      });

      this.logger.log(`User ${data.userId} demoted in room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Error demoting user:', error);
      client.emit('voice:error', { message: 'Failed to demote user' });
    }
  }

  // ============ RAISE HAND ============

  @SubscribeMessage('voice:raise-hand')
  async handleRaiseHand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; raise: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      // Update database
      await this.prisma.voiceParticipant.update({
        where: {
          roomId_userId: { roomId: data.roomId, userId },
        },
        data: { raisedHand: data.raise },
      });

      this.server.to(`voice:${data.roomId}`).emit('voice:hand-raised', {
        userId,
        raised: data.raise,
      });

      this.logger.log(
        `User ${userId} ${data.raise ? 'raised' : 'lowered'} hand in ${data.roomId}`,
      );
    } catch (error) {
      this.logger.error('Error raising hand:', error);
      client.emit('voice:error', { message: 'Failed to raise hand' });
    }
  }

  // ============ PIN MESSAGE ============

  @SubscribeMessage('voice:pin-message')
  async handlePinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; messageId: string; pin: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room) {
        client.emit('voice:error', { message: 'Room not found' });
        return;
      }

      // Check if sender is host
      if (room.creatorId !== userId) {
        client.emit('voice:error', {
          message: 'Only the host can pin messages',
        });
        return;
      }

      // Update message in database - NOTE: You need to add isPinned field to your Message model in schema.prisma
      // For now, we'll store it in a separate table or use a JSON field
      // Since isPinned doesn't exist yet, we'll skip database update and just emit the event

      // For now, just emit the event
      this.server.to(`voice:${data.roomId}`).emit('voice:message-pinned', {
        messageId: data.messageId,
        pinned: data.pin,
        pinnedBy: userId,
      });

      this.logger.log(
        `Message ${data.messageId} ${data.pin ? 'pinned' : 'unpinned'} in ${data.roomId}`,
      );
    } catch (error) {
      this.logger.error('Error pinning message:', error);
      client.emit('voice:error', { message: 'Failed to pin message' });
    }
  }

  // ============ DELETE MESSAGE ============

  @SubscribeMessage('voice:delete-message')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; messageId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room) {
        client.emit('voice:error', { message: 'Room not found' });
        return;
      }

      // Check if sender is host or message owner
      const message = await this.prisma.message.findUnique({
        where: { id: data.messageId },
        select: { senderId: true },
      });

      if (!message) {
        client.emit('voice:error', { message: 'Message not found' });
        return;
      }

      const isHost = room.creatorId === userId;
      const isOwner = message.senderId === userId;

      if (!isHost && !isOwner) {
        client.emit('voice:error', {
          message: 'You do not have permission to delete this message',
        });
        return;
      }

      // Soft delete message
      await this.prisma.message.update({
        where: { id: data.messageId },
        data: {
          isDeleted: true,
          content: 'This message was deleted',
          deletedAt: new Date(),
        },
      });

      this.server.to(`voice:${data.roomId}`).emit('voice:message-deleted', {
        messageId: data.messageId,
        deletedBy: userId,
      });

      this.logger.log(`Message ${data.messageId} deleted in ${data.roomId}`);
    } catch (error) {
      this.logger.error('Error deleting message:', error);
      client.emit('voice:error', { message: 'Failed to delete message' });
    }
  }

  // ============ MUTE SELF ============

  @SubscribeMessage('voice:mute-self')
  async handleMuteSelf(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; muted: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      await this.prisma.voiceParticipant.update({
        where: {
          roomId_userId: { roomId: data.roomId, userId },
        },
        data: { isMuted: data.muted },
      });

      this.server.to(`voice:${data.roomId}`).emit('voice:self-muted', {
        userId,
        muted: data.muted,
      });

      this.logger.log(
        `User ${userId} ${data.muted ? 'muted' : 'unmuted'} self in ${data.roomId}`,
      );
    } catch (error) {
      this.logger.error('Error muting self:', error);
      client.emit('voice:error', { message: 'Failed to mute self' });
    }
  }

  // ============ FETCH MESSAGE HISTORY ============

  @SubscribeMessage('voice:fetch-messages')
  async handleFetchMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; limit?: number; before?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('voice:error', { message: 'Unauthenticated' });
      return;
    }

    try {
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
      });

      if (!room) {
        client.emit('voice:error', { message: 'Room not found' });
        return;
      }

      const where: any = {
        chatId: data.roomId,
        isDeleted: false,
      };

      if (data.before) {
        const beforeMessage = await this.prisma.message.findUnique({
          where: { id: data.before },
          select: { createdAt: true },
        });
        if (beforeMessage) {
          where.createdAt = { lt: beforeMessage.createdAt };
        }
      }

      const messages = await this.prisma.message.findMany({
        where,
        take: data.limit || 50,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      client.emit('voice:messages', messages.reverse());
    } catch (error) {
      this.logger.error('Error fetching messages:', error);
      client.emit('voice:error', { message: 'Failed to fetch messages' });
    }
  }
}
