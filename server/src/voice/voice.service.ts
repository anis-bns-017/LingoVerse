import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LiveKitService } from './livekit.service';
import { CreateVoiceRoomDto, UpdateVoiceRoomDto } from './dto/voice.dto';
import { MessageType } from '@prisma/client';

@Injectable()
export class VoiceService {
  constructor(
    private prisma: PrismaService,
    private liveKitService: LiveKitService,
  ) {}

  // ============ ROOMS ============

  async createRoom(userId: string, dto: CreateVoiceRoomDto) {
    // Validate max participants
    if (
      dto.maxParticipants &&
      (dto.maxParticipants < 2 || dto.maxParticipants > 100)
    ) {
      throw new BadRequestException(
        'Max participants must be between 2 and 100',
      );
    }

    // Create LiveKit room
    const liveKitRoomId = await this.liveKitService.createRoom(
      `${dto.name}-${Date.now()}`,
      dto.maxParticipants || 50,
    );

    // Create database record
    const room = await this.prisma.voiceRoom.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type || 'OPEN',
        creatorId: userId,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        maxParticipants: dto.maxParticipants || 50,
        liveKitRoomId,
        status: dto.scheduledFor ? 'WAITING' : 'ACTIVE',
      },
    });

    // Add creator as participant
    await this.prisma.voiceParticipant.create({
      data: {
        roomId: room.id,
        userId,
        role: 'SPEAKER',
      },
    });

    // Create stage for STAGE type rooms
    if (dto.type === 'STAGE') {
      await this.prisma.stage.create({
        data: {
          roomId: room.id,
          name: 'Main Stage',
          speakers: [],
        },
      });
    }

    return this.getRoomById(room.id, userId);
  }

  async getRoomById(roomId: string, userId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
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
        recordings: true,
        stages: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async getRooms(userId: string, filters?: { type?: string; status?: string }) {
    const where: any = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;

    return this.prisma.voiceRoom.findMany({
      where,
      include: {
        participants: {
          where: { leftAt: null },
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
        creator: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRoom(userId: string, roomId: string, dto: UpdateVoiceRoomDto) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });

    if (!room) throw new NotFoundException('Room not found');
    if (room.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can update this room');
    }

    return this.prisma.voiceRoom.update({
      where: { id: roomId },
      data: {
        name: dto.name,
        description: dto.description,
        isRecording: dto.isRecording,
        maxParticipants: dto.maxParticipants,
      },
    });
  }

  async endRoom(userId: string, roomId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can end this room');
    }

    // End LiveKit room
    if (room.liveKitRoomId) {
      await this.liveKitService.endRoom(room.liveKitRoomId);
    }

    // Update database
    return this.prisma.voiceRoom.update({
      where: { id: roomId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });
  }

  // ============ PARTICIPANTS ============

  async joinRoom(userId: string, roomId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          where: { leftAt: null },
        },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status === 'ENDED') {
      throw new BadRequestException('Room has ended');
    }

    // Check participant limit
    if (room.participants.length >= room.maxParticipants) {
      throw new BadRequestException('Room is full');
    }

    const existing = await this.prisma.voiceParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
    });

    if (existing) {
      // Re-join: update leftAt to null
      await this.prisma.voiceParticipant.update({
        where: { id: existing.id },
        data: { leftAt: null, joinedAt: new Date() },
      });

      // Generate new token
      if (!room.liveKitRoomId) {
        throw new BadRequestException('Room not properly initialized');
      }
      const token = await this.liveKitService.getParticipantToken(
        room.liveKitRoomId,
        userId,
        userId,
      );

      return { token, participant: existing };
    }

    // Generate LiveKit token
    if (!room.liveKitRoomId) {
      throw new BadRequestException('Room not properly initialized');
    }
    const token = await this.liveKitService.getParticipantToken(
      room.liveKitRoomId,
      userId,
      userId,
    );

    // Add to database
    const participant = await this.prisma.voiceParticipant.create({
      data: {
        roomId,
        userId,
        role: room.type === 'STAGE' ? 'LISTENER' : 'SPEAKER',
      },
    });

    return { token, participant };
  }

  async leaveRoom(userId: string, roomId: string) {
    const participant = await this.prisma.voiceParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
    });
    if (!participant) throw new NotFoundException('Not in room');

    return this.prisma.voiceParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
    });
  }

  async updateParticipantRole(
    userId: string,
    roomId: string,
    targetUserId: string,
    role: string,
  ) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new NotFoundException('Room not found');

    // Check permissions
    const isCreator = room.creatorId === userId;
    const isModerator = room.participants.some(
      (p) => p.userId === userId && p.role === 'MODERATOR',
    );
    if (!isCreator && !isModerator) {
      throw new ForbiddenException(
        'Only creator or moderator can change roles',
      );
    }

    const participant = await this.prisma.voiceParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId: targetUserId },
      },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    // Prevent demoting creator
    if (targetUserId === room.creatorId) {
      throw new ForbiddenException("Cannot change the creator's role");
    }

    return this.prisma.voiceParticipant.update({
      where: { id: participant.id },
      data: { role: role as any },
    });
  }

  // ============ STAGE ============

  async addToStage(userId: string, roomId: string, targetUserId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: {
        stages: true,
        participants: {
          where: { userId: targetUserId },
        },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.type !== 'STAGE') {
      throw new BadRequestException('Not a stage room');
    }

    // Check if user is creator or moderator
    const isCreator = room.creatorId === userId;
    const isModerator = room.participants.some(
      (p) => p.userId === userId && p.role === 'MODERATOR',
    );
    if (!isCreator && !isModerator) {
      throw new ForbiddenException(
        'Only creator or moderator can add to stage',
      );
    }

    const stage = room.stages[0];
    if (!stage) throw new NotFoundException('Stage not found');

    const speakers = stage.speakers || [];
    if (speakers.includes(targetUserId)) {
      throw new BadRequestException('User already on stage');
    }

    // Check max speakers (e.g., 5)
    if (speakers.length >= 5) {
      throw new BadRequestException('Stage is full');
    }

    // Update participant role
    await this.prisma.voiceParticipant.update({
      where: {
        roomId_userId: { roomId, userId: targetUserId },
      },
      data: { role: 'STAGE_SPEAKER' },
    });

    return this.prisma.stage.update({
      where: { id: stage.id },
      data: {
        speakers: {
          push: targetUserId,
        },
      },
    });
  }

  async removeFromStage(userId: string, roomId: string, targetUserId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: {
        stages: true,
        participants: true,
      },
    });
    if (!room) throw new NotFoundException('Room not found');

    // Check if user is creator or moderator
    const isCreator = room.creatorId === userId;
    const isModerator = room.participants.some(
      (p) => p.userId === userId && p.role === 'MODERATOR',
    );
    if (!isCreator && !isModerator) {
      throw new ForbiddenException(
        'Only creator or moderator can remove from stage',
      );
    }

    const stage = room.stages[0];
    if (!stage) throw new NotFoundException('Stage not found');

    const speakers = stage.speakers.filter((id) => id !== targetUserId);

    // Update participant role back to LISTENER
    await this.prisma.voiceParticipant.update({
      where: {
        roomId_userId: { roomId, userId: targetUserId },
      },
      data: { role: 'LISTENER' },
    });

    return this.prisma.stage.update({
      where: { id: stage.id },
      data: { speakers },
    });
  }

  // ============ RECORDINGS ============

  async startRecording(userId: string, roomId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');

    // Only creator can start recording
    if (room.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can start recording');
    }

    if (room.isRecording) {
      throw new BadRequestException('Recording is already in progress');
    }

    // Start LiveKit recording
    if (room.liveKitRoomId) {
      await this.liveKitService.startRecording(room.liveKitRoomId);
    }

    // Update database
    return this.prisma.voiceRoom.update({
      where: { id: roomId },
      data: { isRecording: true },
    });
  }

  async stopRecording(userId: string, roomId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');

    // Only creator can stop recording
    if (room.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can stop recording');
    }

    if (!room.isRecording) {
      throw new BadRequestException('No recording in progress');
    }

    // Stop LiveKit recording
    if (room.liveKitRoomId) {
      await this.liveKitService.stopRecording(room.liveKitRoomId);
    }

    // Update database
    return this.prisma.voiceRoom.update({
      where: { id: roomId },
      data: { isRecording: false },
    });
  }

  async getRecordings(roomId: string, userId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');

    const participant = await this.prisma.voiceParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
    });
    if (!participant) {
      throw new ForbiddenException('Not a participant in this room');
    }

    return this.prisma.recording.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ CHAT MESSAGES (FOR VOICE ROOMS) ============

  async getVoiceRoomMessages(
    userId: string,
    roomId: string,
    limit: number = 50,
    before?: string,
  ) {
    // Verify user is a participant
    const participant = await this.prisma.voiceParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this room');
    }

    const where: any = {
      chatId: roomId,
      isDeleted: false,
    };

    if (before) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where,
      take: limit,
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
        attachments: true,
        translations: true,
      },
    });

    return messages.reverse();
  }

  async sendVoiceRoomMessage(
    userId: string,
    roomId: string,
    content: string,
    type: string = 'TEXT',
    mediaUrl?: string,
    fileUrl?: string,
    replyToId?: string,
  ) {
    // Verify user is a participant
    const participant = await this.prisma.voiceParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this room');
    }

    // Verify room exists and is active
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status === 'ENDED') {
      throw new BadRequestException('Room has ended');
    }

    // Validate reply
    if (replyToId) {
      const replyMessage = await this.prisma.message.findUnique({
        where: { id: replyToId },
        select: { chatId: true },
      });
      if (!replyMessage || replyMessage.chatId !== roomId) {
        throw new BadRequestException('Invalid reply message');
      }
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        chatId: roomId,
        senderId: userId,
        content,
        type: (type as MessageType) || MessageType.TEXT,
        mediaUrl,
        fileUrl,
        replyToId,
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
        attachments: true,
        translations: true,
      },
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

  // ============ DELETE VOICE ROOM MESSAGE ============

  async deleteVoiceRoomMessage(
    userId: string,
    roomId: string,
    messageId: string,
  ) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.chatId !== roomId) {
      throw new BadRequestException('Message does not belong to this room');
    }

    // Check permissions
    const isCreator = room.creatorId === userId;
    const isSender = message.senderId === userId;

    if (!isCreator && !isSender) {
      throw new ForbiddenException(
        'You do not have permission to delete this message',
      );
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: 'This message was deleted',
        deletedAt: new Date(),
      },
    });
  }

  // ============ GET ROOM PARTICIPANTS ============

  async getRoomParticipants(roomId: string, userId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');

    // Verify user is a participant
    const participant = await this.prisma.voiceParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this room');
    }

    return this.prisma.voiceParticipant.findMany({
      where: {
        roomId,
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
  }

  // ============ CHECK USER STATUS ============

  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.voiceParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
      select: { leftAt: true },
    });
    return !!participant && participant.leftAt === null;
  }

  async getActiveParticipants(roomId: string) {
    return this.prisma.voiceParticipant.findMany({
      where: {
        roomId,
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
  }
}
