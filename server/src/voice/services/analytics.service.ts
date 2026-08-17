
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private roomAnalytics: Map<string, any> = new Map();

  constructor(private prisma: PrismaService) {}

  async startRoomAnalytics(roomId: string) {
    this.roomAnalytics.set(roomId, {
      startTime: Date.now(),
      totalListeners: 0,
      totalSpeakers: 0,
      peakListeners: 0,
      claps: 0,
      engagement: [],
    });

    // Create initial analytics record
    await this.prisma.voiceRoomAnalytics.create({
      data: {
        roomId,
        totalListeners: 0,
        totalSpeakers: 0,
        averageListeners: 0,
        peakListeners: 0,
        totalDuration: 0,
        totalClaps: 0,
        engagementRate: 0,
        retentionRate: 0,
      },
    });
  }

  async trackParticipantJoin(roomId: string, userId: string) {
    const analytics = this.roomAnalytics.get(roomId);
    if (analytics) {
      analytics.totalListeners++;
      const current = await this.prisma.voiceParticipant.count({
        where: { roomId, leftAt: null },
      });
      if (current > analytics.peakListeners) {
        analytics.peakListeners = current;
      }
      analytics.engagement.push({
        userId,
        action: 'join',
        timestamp: Date.now(),
      });

      // Update analytics in DB
      await this.prisma.voiceRoomAnalytics.updateMany({
        where: { roomId },
        data: {
          totalListeners: analytics.totalListeners,
          peakListeners: analytics.peakListeners,
        },
      });
    }
  }

  async trackParticipantLeave(roomId: string, userId: string) {
    const analytics = this.roomAnalytics.get(roomId);
    if (analytics) {
      analytics.engagement.push({
        userId,
        action: 'leave',
        timestamp: Date.now(),
      });
    }
  }

  async endRoomAnalytics(roomId: string) {
    const analytics = this.roomAnalytics.get(roomId);
    if (analytics) {
      const duration = (Date.now() - analytics.startTime) / 1000;
      const engagementRate = analytics.totalListeners > 0 
        ? (analytics.engagement.filter(e => e.action === 'join').length / analytics.totalListeners) * 100
        : 0;

      await this.prisma.voiceRoomAnalytics.updateMany({
        where: { roomId },
        data: {
          totalDuration: duration,
          engagementRate,
          retentionRate: engagementRate * 0.8, // Simplified retention
        },
      });

      this.roomAnalytics.delete(roomId);
    }
  }

  async getLiveRoomStats(roomId: string) {
    const analytics = this.roomAnalytics.get(roomId);
    if (!analytics) {
      return null;
    }

    const currentParticipants = await this.prisma.voiceParticipant.count({
      where: { roomId, leftAt: null },
    });

    const speakers = await this.prisma.voiceParticipant.count({
      where: { 
        roomId, 
        leftAt: null,
        role: {
          in: ['SPEAKER', 'STAGE_SPEAKER'],
        },
      },
    });

    return {
      totalListeners: analytics.totalListeners,
      currentListeners: currentParticipants - speakers,
      currentSpeakers: speakers,
      peakListeners: analytics.peakListeners,
      totalClaps: analytics.claps,
      duration: (Date.now() - analytics.startTime) / 1000,
    };
  }

  async getRoomAnalytics(roomId: string) {
    return this.prisma.voiceRoomAnalytics.findMany({
      where: { roomId },
      orderBy: { timestamp: 'desc' },
      take: 30,
    });
  }

  async getSpeakerStats(roomId: string) {
    return this.prisma.voiceSpeakerStats.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { speakingTime: 'desc' },
    });
  }

  async updateSpeakerStats(roomId: string, userId: string, duration: number) {
    const stats = await this.prisma.voiceSpeakerStats.findFirst({
      where: { roomId, userId },
    });

    if (stats) {
      await this.prisma.voiceSpeakerStats.update({
        where: { id: stats.id },
        data: {
          speakingTime: { increment: duration },
          timesSpoken: { increment: 1 },
        },
      });
    } else {
      await this.prisma.voiceSpeakerStats.create({
        data: {
          roomId,
          userId,
          speakingTime: duration,
          timesSpoken: 1,
        },
      });
    }
  }
}