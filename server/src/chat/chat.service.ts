import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateChatDto, SendMessageDto, GetMessagesDto } from './dto/chat.dto';
import { ChatType } from '@prisma/client';
import { MessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ============ CHATS ============

  async getUserChats(userId: string) {
    return this.prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getChatById(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!chat) throw new NotFoundException('Chat not found');

    const isParticipant = chat.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw new ForbiddenException('You are not a participant in this chat');

    return chat;
  }

  async createPrivateChat(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot create a chat with yourself');
    }

    // Check if private chat already exists
    const existing = await this.prisma.chat.findFirst({
      where: {
        type: 'PRIVATE',
        participants: {
          every: {
            userId: { in: [userId, otherUserId] },
          },
        },
      },
    });

    if (existing) return existing;

    return this.prisma.chat.create({
      data: {
        type: 'PRIVATE',
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async createGroupChat(userId: string, data: CreateChatDto) {
    const participantIds = [...new Set([userId, ...data.participantIds])];

    return this.prisma.chat.create({
      data: {
        type: 'GROUP',
        name: data.name || 'Group Chat',
        participants: {
          create: participantIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async addParticipants(chatId: string, userId: string, userIds: string[]) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.type !== 'GROUP') throw new BadRequestException('Only group chats can have participants added');

    const isAdmin = chat.participants.some((p) => p.userId === userId && p.role === 'ADMIN');
    if (!isAdmin) throw new ForbiddenException('Only admins can add participants');

    // Filter out existing participants
    const existingIds = chat.participants.map((p) => p.userId);
    const newIds = userIds.filter((id) => !existingIds.includes(id));

    if (newIds.length === 0) return chat;

    return this.prisma.chat.update({
      where: { id: chatId },
      data: {
        participants: {
          create: newIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async removeParticipant(chatId: string, userId: string, targetUserId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.type !== 'GROUP') throw new BadRequestException('Only group chats can remove participants');

    const isAdmin = chat.participants.some((p) => p.userId === userId && p.role === 'ADMIN');
    if (!isAdmin && userId !== targetUserId) {
      throw new ForbiddenException('Only admins or the user themselves can remove a participant');
    }

    await this.prisma.chatParticipant.delete({
      where: {
        chatId_userId: {
          chatId,
          userId: targetUserId,
        },
      },
    });

    return this.getChatById(chatId, userId);
  }

  // ============ MESSAGES ============

  async getMessages(userId: string, dto: GetMessagesDto) {
    const { chatId, limit = '50', before } = dto;
    const take = parseInt(limit, 10) || 50;

    // Verify user is participant
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });

    if (!participant) throw new ForbiddenException('You are not a participant in this chat');

    const where: any = { chatId };
    if (before) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    return this.prisma.message.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
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
        attachments: true,
        translations: true,
      },
    });
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    const { chatId, content, type, mediaUrl, fileUrl, replyToId } = dto;

    // Verify user is participant
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });

    if (!participant) throw new ForbiddenException('You are not a participant in this chat');

    // If replyTo, check that message exists
    if (replyToId) {
      const replyMessage = await this.prisma.message.findUnique({
        where: { id: replyToId },
        select: { chatId: true },
      });
      if (!replyMessage || replyMessage.chatId !== chatId) {
        throw new BadRequestException('Invalid reply message');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content,
        type: type as MessageType || MessageType.TEXT,
        mediaUrl,
        fileUrl,
        replyToId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
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
        attachments: true,
        translations: true,
      },
    });

    // Update chat updatedAt
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Create read receipt for sender
    await this.prisma.readReceipt.create({
      data: {
        messageId: message.id,
        userId,
        readAt: new Date(),
      },
    });

    return message;
  }

  async markMessageRead(userId: string, chatId: string, messageId: string) {
    // Verify user is participant
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });

    if (!participant) throw new ForbiddenException('You are not a participant in this chat');

    const receipt = await this.prisma.readReceipt.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    if (!receipt) {
      return this.prisma.readReceipt.create({
        data: {
          messageId,
          userId,
        },
      });
    }

    return receipt;
  }

  async addReaction(userId: string, messageId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { chatId: true },
    });

    if (!message) throw new NotFoundException('Message not found');

    // Verify user is participant in the chat
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId: message.chatId,
          userId,
        },
      },
    });

    if (!participant) throw new ForbiddenException('You are not a participant in this chat');

    const existing = await this.prisma.reaction.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        // Remove reaction if same emoji (toggle)
        await this.prisma.reaction.delete({
          where: { id: existing.id },
        });
        return { removed: true };
      } else {
        // Update emoji
        return this.prisma.reaction.update({
          where: { id: existing.id },
          data: { emoji },
        });
      }
    }

    return this.prisma.reaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    });
  }

  // ============ TYPING INDICATORS (Handled in Gateway) ============

  // ============ READ RECEIPTS ============

  async getReadReceipts(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { chatId: true },
    });

    if (!message) throw new NotFoundException('Message not found');

    // Verify user is participant
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId: message.chatId,
          userId,
        },
      },
    });

    if (!participant) throw new ForbiddenException('You are not a participant in this chat');

    return this.prisma.readReceipt.findMany({
      where: { messageId },
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
  }

  // ============ SEARCH ============

  async searchMessages(userId: string, chatId: string, query: string) {
    // Verify user is participant
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });

    if (!participant) throw new ForbiddenException('You are not a participant in this chat');

    return this.prisma.message.findMany({
      where: {
        chatId,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: 20,
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
  }
}