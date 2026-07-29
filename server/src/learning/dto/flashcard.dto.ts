import { IsString, IsOptional } from 'class-validator';

export class CreateFlashcardDto {
  @IsString()
  front: string;

  @IsString()
  back: string;

  @IsString()
  language: string;
}

export class ReviewFlashcardDto {
  @IsString()
  flashcardId: string;

  @IsString()
  difficulty: 'easy' | 'medium' | 'hard';
}

export class GetFlashcardsDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  dueOnly?: string;
}