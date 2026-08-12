import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VoiceController } from './voice.controller';
import { UploadController } from '../upload/upload.controller';
import { VoiceService } from './voice.service';
import { VoiceGateway } from './voice.gateway';
import { LiveKitService } from './livekit.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [VoiceController, UploadController],
  providers: [VoiceService, VoiceGateway, LiveKitService, PrismaService],
  exports: [VoiceService],
})
export class VoiceModule {}
