import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LiveKitService } from './livekit.service';
import { CreateVoiceRoomDto, UpdateVoiceRoomDto } from './dto/voice.dto';

@Injectable()
export class VoiceService {
  constructor(
    private prisma: PrismaService,
    private liveKitService: LiveKitService,
  ) {}

  // ============ ROOMS ============

  async createRoom(userId: string, dto: CreateVoiceRoomDto) {
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
        type: dto.type,
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
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status === 'ENDED')
      throw new BadRequestException('Room has ended');

    const existing = await this.prisma.voiceParticipant.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
    });

    if (existing) {
      // Re-join: update leftAt to null
      return this.prisma.voiceParticipant.update({
        where: { id: existing.id },
        data: { leftAt: null },
      });
    }

    // Generate LiveKit token
    if (!room.liveKitRoomId)
      throw new BadRequestException('Room not properly initialized');
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

    return this.prisma.voiceParticipant.update({
      where: { id: participant.id },
      data: { role: role as any },
    });
  }

  // ============ STAGE ============

  async addToStage(userId: string, roomId: string, targetUserId: string) {
    const room = await this.prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: { stages: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.type !== 'STAGE')
      throw new BadRequestException('Not a stage room');

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
      include: { stages: true },
    });
    if (!room) throw new NotFoundException('Room not found');

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
    if (!participant)
      throw new ForbiddenException('Not a participant in this room');

    return this.prisma.recording.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
