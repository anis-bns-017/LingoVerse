import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettingsByUserId(userId: string) {
    const settings = await this.prisma.settings.findUnique({
      where: { userId },
    });
    if (!settings) {
      // Create default settings if none exist
      return this.createDefaultSettings(userId);
    }
    return settings;
  }

  async createDefaultSettings(userId: string) {
    return this.prisma.settings.create({
      data: {
        userId,
        emailNotifications: true,
        pushNotifications: true,
        soundEffects: true,
        theme: 'system',
        language: 'en',
        shareActivityWithFriends: true,
        showOnlineStatus: true,
      },
    });
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const existing = await this.prisma.settings.findUnique({
      where: { userId },
    });
    if (!existing) {
      // Create if doesn't exist
      const defaults = await this.createDefaultSettings(userId);
      return this.prisma.settings.update({
        where: { userId },
        data: dto,
      });
    }

    return this.prisma.settings.update({
      where: { userId },
      data: dto,
    });
  }
}