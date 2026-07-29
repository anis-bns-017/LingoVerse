import { Injectable } from '@nestjs/common';
import { Theme } from '@prisma/client';
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
        theme: Theme.SYSTEM,
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
      await this.createDefaultSettings(userId);
    }

    return this.prisma.settings.update({
      where: { userId },
      data: dto,
    });
  }
}
