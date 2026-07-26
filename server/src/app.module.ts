import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { SettingsModule } from './settings/settings.module'; // 👈 ADD THIS
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    ProfileModule,
    SettingsModule, // 👈 ADD THIS
  ],
  providers: [PrismaService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}