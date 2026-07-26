import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfileByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Ensure profile exists
    const existing = await this.prisma.profile.findUnique({ where: { userId } });
    if (!existing) {
      throw new NotFoundException('Profile not found');
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        country: dto.country,
        nativeLanguage: dto.nativeLanguage,
        learningLanguages: dto.learningLanguages,
        interests: dto.interests,
        goals: dto.goals,
        bio: dto.bio,
      },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    });
  }
}