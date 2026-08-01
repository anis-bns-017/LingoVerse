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
import * as cookie from 'cookie';
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
  server: Server;

  private roomParticipants: Map<string, Set<string>> = new Map(); // roomId -> Set of userIds

  constructor(
    private jwtService: JwtService,
    private voiceService: VoiceService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers.cookie;
      if (!cookieHeader) {
        client.disconnect();
        return;
      }

      const cookies = (cookie as any).parse(cookieHeader);
      const token = cookies['accessToken'];
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      const userId = payload.sub;
      client.data.userId = userId;
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    // Remove from all rooms
    for (const [roomId, participants] of this.roomParticipants) {
      if (participants.has(userId)) {
        participants.delete(userId);
        if (participants.size === 0) {
          this.roomParticipants.delete(roomId);
        }
        this.server.to(`voice:${roomId}`).emit('participant:left', { userId });
      }
    }
  }

  @SubscribeMessage('voice:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: data.roomId },
    });
    if (!room) {
      client.emit('voice:error', { message: 'Room not found' });
      return;
    }

    // Add to LiveKit is handled via REST call; here we just join the socket room
    await client.join(`voice:${data.roomId}`);

    // Track participant
    if (!this.roomParticipants.has(data.roomId)) {
      this.roomParticipants.set(data.roomId, new Set());
    }
    this.roomParticipants.get(data.roomId)!.add(userId);

    // Notify others
    client.to(`voice:${data.roomId}`).emit('participant:joined', { userId });

    // Send current participants list
    const participants = Array.from(
      this.roomParticipants.get(data.roomId) || [],
    );
    client.emit('voice:participants', { participants });
  }

  @SubscribeMessage('voice:leave')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    await client.leave(`voice:${data.roomId}`);
    const participants = this.roomParticipants.get(data.roomId);
    if (participants) {
      participants.delete(userId);
      if (participants.size === 0) {
        this.roomParticipants.delete(data.roomId);
      }
    }
    client.to(`voice:${data.roomId}`).emit('participant:left', { userId });
  }

  @SubscribeMessage('voice:raise-hand')
  async handleRaiseHand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; raise: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // Update database (optional, could just emit)
    // Emit to all in room
    this.server.to(`voice:${data.roomId}`).emit('voice:hand-raised', {
      userId,
      raised: data.raise,
    });
  }

  @SubscribeMessage('voice:mute')
  async handleMute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; muted: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // Update participant's mute status
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
  }
}
