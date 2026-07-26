import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ProfileController],
  providers: [ProfileService, PrismaService],
  exports: [ProfileService],
})
export class ProfileModule {}