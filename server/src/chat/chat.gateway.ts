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

  private userSockets: Map<string, string[]> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // 1. Get cookies from handshake headers
      // 1. Get cookies from handshake headers
      const cookieHeader = client.handshake.headers.cookie;

      if (!cookieHeader) {
        client.disconnect();
        return;
      }

      // 2. Parse cookies (Cast to 'any' to bypass TS module resolution error)
      const cookies = (cookie as any).parse(cookieHeader);
      const token = cookies.accessToken;

      if (!token) {
        client.disconnect();
        return;
      }

      // 3. Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // 4. Store socket
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);

      // 5. Join all chat rooms
      const chats = await this.prisma.chat.findMany({
        where: {
          participants: {
            some: {
              userId,
            },
          },
        },
        select: {
          id: true,
        },
      });

      for (const chat of chats) {
        await client.join(`chat:${chat.id}`);
      }

      // 6. Broadcast online status
      this.server.emit('user:online', {
        userId,
        online: true,
      });

      console.log(`User ${userId} connected via socket ${client.id}`);
    } catch (error) {
      console.error('WebSocket connection error:', error);
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

          this.server.emit('user:offline', {
            userId,
          });
        } else {
          this.userSockets.set(userId, sockets);
        }
      }
    }

    console.log(`Client ${client.id} disconnected`);
  }

  // ==========================
  // MESSAGE
  // ==========================

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

    try {
      const message = await this.chatService.sendMessage(userId, {
        chatId: data.chatId,
        content: data.content,
        type: data.type,
        mediaUrl: data.mediaUrl,
        fileUrl: data.fileUrl,
        replyToId: data.replyToId,
      });

      this.server.to(`chat:${data.chatId}`).emit('message:new', message);
    } catch (error: any) {
      client.emit('message:error', {
        error: error.message,
      });
    }
  }

  // ==========================
  // TYPING
  // ==========================

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = client.data.userId;

    if (!userId) return;

    client.to(`chat:${data.chatId}`).emit('typing:start', {
      userId,
      chatId: data.chatId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = client.data.userId;

    if (!userId) return;

    client.to(`chat:${data.chatId}`).emit('typing:stop', {
      userId,
      chatId: data.chatId,
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

    if (!userId) return;

    try {
      await this.chatService.markMessageRead(
        userId,
        data.chatId,
        data.messageId,
      );

      client.to(`chat:${data.chatId}`).emit('message:read', {
        userId,
        messageId: data.messageId,
      });
    } catch {
      // Ignore errors
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

    if (!userId) return;

    try {
      const reaction = await this.chatService.addReaction(
        userId,
        data.messageId,
        data.emoji,
      );

      const message = await this.prisma.message.findUnique({
        where: {
          id: data.messageId,
        },
        select: {
          chatId: true,
        },
      });

      if (message) {
        this.server.to(`chat:${message.chatId}`).emit('reaction:new', reaction);
      }
    } catch {
      // Ignore errors
    }
  }
}
