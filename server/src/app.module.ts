import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { SettingsModule } from './settings/settings.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { VoiceModule } from './voice/voice.module';
import { ChatModule } from './chat/chat.module';
import { LearningModule } from './learning/learning.module';
import { CommunitiesModule } from './communities/communities.module';
import { FriendsModule } from './friends/friends.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    ProfileModule,
    SettingsModule,
    LearningModule,
    FriendsModule,
    ChatModule,
    VoiceModule,
    CommunitiesModule,
  ],
  providers: [PrismaService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
