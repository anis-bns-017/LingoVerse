import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
 
import { CreateVocabularyDto, ReviewVocabularyDto } from './dto/vocabulary.dto';
import { CreateFlashcardDto, ReviewFlashcardDto } from './dto/flashcard.dto';
import { SubmitExerciseDto } from './dto/exercise.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LearningService {
  constructor(private prisma: PrismaService) {}

  // ============ VOCABULARY ============
  async getVocabulary(params: {
    language?: string;
    difficulty?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { language, difficulty, search, limit = 50, offset = 0 } = params;

    const where: any = {};
    if (language) where.language = language;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.OR = [
        { word: { contains: search, mode: 'insensitive' } },
        { translation: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.vocabulary.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { word: 'asc' },
      }),
      this.prisma.vocabulary.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async createVocabulary(data: CreateVocabularyDto) {
    const existing = await this.prisma.vocabulary.findUnique({
      where: {
        word_language: {
          word: data.word,
          language: data.language,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Vocabulary word already exists for this language',
      );
    }

    return this.prisma.vocabulary.create({
      data: {
        word: data.word,
        translation: data.translation,
        language: data.language,
        exampleSentence: data.exampleSentence,
        audioUrl: data.audioUrl,
        difficulty: (data.difficulty || 'BEGINNER') as any,
      },
    });
  }

  async reviewVocabulary(userId: string, data: ReviewVocabularyDto) {
    const vocabulary = await this.prisma.vocabulary.findUnique({
      where: { id: data.vocabularyId },
    });

    if (!vocabulary) {
      throw new NotFoundException('Vocabulary not found');
    }

    const difficultyMap = { easy: 4, medium: 2, hard: 0 };
    const easeFactor = difficultyMap[data.difficulty] || 2;

    const existingReview = await this.prisma.flashcardReview.findFirst({
      where: {
        vocabularyId: data.vocabularyId,
        userId,
      },
    });

    if (existingReview) {
      const newInterval = this.calculateInterval(
        existingReview.interval,
        easeFactor,
        existingReview.easeFactor,
      );

      return this.prisma.flashcardReview.update({
        where: { id: existingReview.id },
        data: {
          easeFactor: easeFactor,
          interval: newInterval,
          lastReviewedAt: new Date(),
          dueAt: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000),
          reviewCount: existingReview.reviewCount + 1,
        },
      });
    }

    return this.prisma.flashcardReview.create({
      data: {
        flashcardId: data.vocabularyId,
        userId,
        easeFactor: 2.5,
        interval: 1,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reviewCount: 1,
      },
    });
  }

  // ============ FLASHCARDS ============
  async getFlashcards(
    userId: string,
    params: { language?: string; dueOnly?: boolean },
  ) {
    const { language, dueOnly } = params;

    const where: any = {
      userId,
    };

    if (language) {
      where.flashcard = { language };
    }

    if (dueOnly) {
      where.dueAt = { lte: new Date() };
    }

    return this.prisma.flashcardReview.findMany({
      where,
      include: {
        flashcard: true,
        vocabulary: true,
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  async createFlashcard(userId: string, data: CreateFlashcardDto) {
    return this.prisma.flashcard.create({
      data: {
        front: data.front,
        back: data.back,
        language: data.language,
        userId,
      },
    });
  }

  async reviewFlashcard(userId: string, data: ReviewFlashcardDto) {
    const flashcard = await this.prisma.flashcard.findUnique({
      where: { id: data.flashcardId },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found');
    }

    const difficultyMap = { easy: 4, medium: 2, hard: 0 };
    const easeFactor = difficultyMap[data.difficulty] || 2;

    const existingReview = await this.prisma.flashcardReview.findFirst({
      where: {
        flashcardId: data.flashcardId,
        userId,
      },
    });

    if (existingReview) {
      const newInterval = this.calculateInterval(
        existingReview.interval,
        easeFactor,
        existingReview.easeFactor,
      );

      return this.prisma.flashcardReview.update({
        where: { id: existingReview.id },
        data: {
          easeFactor: easeFactor,
          interval: newInterval,
          lastReviewedAt: new Date(),
          dueAt: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000),
          reviewCount: existingReview.reviewCount + 1,
        },
      });
    }

    return this.prisma.flashcardReview.create({
      data: {
        flashcardId: data.flashcardId,
        userId,
        easeFactor: 2.5,
        interval: 1,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reviewCount: 1,
      },
    });
  }

  // ============ GRAMMAR ============
  async getGrammar(params: {
    language?: string;
    level?: string;
    limit?: number;
  }) {
    const { language, level, limit = 20 } = params;

    const where: any = {};
    if (language) where.language = language;
    if (level) where.level = level;

    return this.prisma.grammarRule.findMany({
      where,
      take: limit,
      orderBy: { title: 'asc' },
    });
  }

  // ============ EXERCISES ============
  async getExercises(params: {
    language?: string;
    type?: string;
    difficulty?: string;
    limit?: number;
  }) {
    const { language, type, difficulty, limit = 20 } = params;

    const where: any = {};
    if (language) where.language = language;
    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;

    return this.prisma.exercise.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitExercise(userId: string, data: SubmitExerciseDto) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: data.exerciseId },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Simple scoring - placeholder
    const result = {
      exerciseId: exercise.id,
      userId,
      score: Math.floor(Math.random() * 40) + 60,
      passed: true,
      feedback: 'Good job! Keep practicing.',
      metadata: data.metadata || {},
    };

    await this.updateProgress(userId, exercise.language, exercise.type);
    await this.awardXP(userId, 10);

    return result;
  }

  // ============ PROGRESS ============
  async getProgress(userId: string) {
    const progress = await this.prisma.progress.findMany({
      where: { userId },
    });

    const streak = await this.prisma.streak.findUnique({
      where: { userId },
    });

    const totalXP = await this.prisma.xpTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    return {
      progress,
      streak: streak?.currentStreak || 0,
      totalXP: totalXP._sum.amount || 0,
    };
  }

  async updateProgress(userId: string, language: string, skill: string) {
    const existing = await this.prisma.progress.findFirst({
      where: {
        userId,
      },
    });

    if (existing) {
      return this.prisma.progress.update({
        where: { id: existing.id },
        data: {
          completionRate: existing.completionRate + 1,
        },
      });
    }

    return this.prisma.progress.create({
      data: {
        userId,
        type: "VOCABULARY",
        completionRate: 1,
      },
    });
  }

  async awardXP(userId: string, amount: number) {
    await this.prisma.profile.update({
      where: { userId },
      data: {
        xp: { increment: amount },
      },
    });

    return this.prisma.xpTransaction.create({
      data: {
        userId,
        amount,
        reason: 'EXERCISE_COMPLETED' as any,
      },
    });
  }

  // ============ HELPERS ============
  private calculateInterval(
    currentInterval: number,
    easeFactor: number,
    currentEase: number,
  ): number {
    const newEase = Math.max(
      1.3,
      currentEase + (0.1 - (5 - easeFactor) * (0.08 + (5 - easeFactor) * 0.02)),
    );
    let newInterval = currentInterval * newEase;

    if (easeFactor >= 3) {
      newInterval = Math.max(1, newInterval);
    } else {
      newInterval = 1;
    }

    return Math.round(newInterval);
  }
}