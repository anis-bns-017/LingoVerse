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
import { PrismaService } from '../prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
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

      // Join rooms for all chats the user is part of
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
      }

      // Emit online status
      this.server.emit('user:online', { userId, online: true });

      console.log(`User ${userId} connected (${client.id})`);
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      const index = sockets.indexOf(client.id);
      if (index > -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
          this.server.emit('user:offline', { userId, online: false });
        } else {
          this.userSockets.set(userId, sockets);
        }
      }
    }
    console.log(`Client ${client.id} disconnected`);
  }

  // ============ MESSAGES ============

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      chatId: string;
      content: string;
      type?: string;
      mediaUrl?: string;
      fileUrl?: string;
      replyToId?: string;
    },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // We'll call the service to save the message, then broadcast
    // But for simplicity, we'll use the service from controller? Actually we can inject ChatService.
    // We'll implement a service method to save and return message, then emit.
    // But we need to avoid circular dependency. We'll use ChatService via injection.
    // I'll add ChatService to the constructor and use it.
    // For brevity, I'll show the pattern:
    // const message = await this.chatService.sendMessage(userId, data);
    // this.server.to(`chat:${data.chatId}`).emit('message:new', message);
  }

  // ============ TYPING ============

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    client
      .to(`chat:${data.chatId}`)
      .emit('typing:start', { userId, chatId: data.chatId });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    client
      .to(`chat:${data.chatId}`)
      .emit('typing:stop', { userId, chatId: data.chatId });
  }

  // ============ READ RECEIPTS ============

  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; messageId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    // Mark read via service
    // this.chatService.markMessageRead(userId, data.chatId, data.messageId);
    // Broadcast to others
    client
      .to(`chat:${data.chatId}`)
      .emit('message:read', { userId, messageId: data.messageId });
  }

  // ============ REACTIONS ============

  @SubscribeMessage('reaction:add')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    // const reaction = await this.chatService.addReaction(userId, data.messageId, data.emoji);
    // this.server.to(`chat:${reaction.message.chatId}`).emit('reaction:new', reaction);
  }
}
