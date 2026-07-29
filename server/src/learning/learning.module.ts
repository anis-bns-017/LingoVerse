import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { PrismaService } from '../prisma.service';


@Module({
  controllers: [LearningController],
  providers: [LearningService, PrismaService],
  exports: [LearningService],
})
export class LearningModule {}
