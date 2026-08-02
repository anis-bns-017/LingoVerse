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
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VoiceService } from './voice.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'voice',
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private roomParticipants: Map<string, Set<string>> = new Map(); // roomId -> Set of userIds

  constructor(
    private jwtService: JwtService,
    private voiceService: VoiceService,
    private prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
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
        this.logger.warn('No access token in cookies, disconnecting');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(String(token), {
        secret: process.env.JWT_SECRET,
      }) as { sub: string };

      const userId = payload.sub;
      client.data.userId = userId;
      this.logger.log(`User ${userId} connected with socket ${client.id}`);
    } catch (error) {
      this.logger.error('Authentication error', String(error));
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      this.logger.log(`Client ${client.id} disconnected without userId`);
      return;
    }

    this.logger.log(`User ${userId} disconnected (${client.id})`);

    for (const [roomId, participants] of this.roomParticipants.entries()) {
      if (participants.has(userId)) {
        participants.delete(userId);
        if (participants.size === 0) {
          this.roomParticipants.delete(roomId);
        }
        this.server.to(`voice:${roomId}`).emit('participant:left', { userId });
        this.logger.debug(`User ${userId} left room ${roomId}`);
      }
    }
  }

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

    if (!data?.roomId) {
      this.logger.warn(`voice:join called without roomId by user ${userId}`);
      client.emit('voice:error', { message: 'roomId is required' });
      return;
    }

    try {
      // 1. Verify room exists in DB
      const room = await this.prisma.voiceRoom.findUnique({
        where: { id: data.roomId },
        select: { id: true, status: true },
      });

      if (!room) {
        this.logger.warn(`Room ${data.roomId} not found for user ${userId}`);
        client.emit('voice:error', { message: 'Room not found' });
        return;
      }

      if (room.status === 'ENDED') {
        client.emit('voice:error', { message: 'Room has ended' });
        return;
      }

      // 2. Join the socket room
      await client.join(`voice:${data.roomId}`);

      // 3. Track participant in memory
      if (!this.roomParticipants.has(data.roomId)) {
        this.roomParticipants.set(data.roomId, new Set());
      }
      this.roomParticipants.get(data.roomId)!.add(userId);

      // 4. Send current participants list to the joining client
      const participants = Array.from(
        this.roomParticipants.get(data.roomId) || [],
      );
      client.emit('voice:participants', { participants });

      // 5. Notify others in the room
      client.to(`voice:${data.roomId}`).emit('participant:joined', { userId });

      // 6. Confirm join to the client
      client.emit('voice:joined', { roomId: data.roomId, userId });

      this.logger.log(`User ${userId} joined room ${data.roomId}`);
    } catch (error) {
      this.logger.error(`Error in voice:join for user ${userId}`, error);
      client.emit('voice:error', { message: 'Internal server error' });
    }
  }

  @SubscribeMessage('voice:leave')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    if (!data?.roomId) return;

    try {
      await client.leave(`voice:${data.roomId}`);
      const participants = this.roomParticipants.get(data.roomId);
      if (participants) {
        participants.delete(userId);
        if (participants.size === 0) {
          this.roomParticipants.delete(data.roomId);
        }
      }
      client.to(`voice:${data.roomId}`).emit('participant:left', { userId });
      this.logger.log(`User ${userId} left room ${data.roomId}`);
    } catch (error) {
      this.logger.error(`Error in voice:leave for user ${userId}`, error);
    }
  }

  @SubscribeMessage('voice:raise-hand')
  handleRaiseHand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; raise: boolean },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    if (!data?.roomId) return;

    try {
      this.server.to(`voice:${data.roomId}`).emit('voice:hand-raised', {
        userId,
        raised: data.raise,
      });
      this.logger.debug(
        `User ${userId} ${data.raise ? 'raised' : 'lowered'} hand in ${data.roomId}`,
      );
    } catch (error) {
      this.logger.error(`Error in voice:raise-hand`, error);
    }
  }

  @SubscribeMessage('voice:mute')
  async handleMute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; muted: boolean },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    if (!data?.roomId) return;

    try {
      await this.prisma.voiceParticipant.update({
        where: {
          roomId_userId: { roomId: data.roomId, userId },
        },
        data: { isMuted: data.muted },
      });

      this.server.to(`voice:${data.roomId}`).emit('voice:muted', {
        userId,
        muted: data.muted,
      });
      this.logger.debug(
        `User ${userId} ${data.muted ? 'muted' : 'unmuted'} in ${data.roomId}`,
      );
    } catch (error) {
      this.logger.error(`Error in voice:mute`, String(error));
    }
  }
}
