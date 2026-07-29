import { IsString, IsOptional, IsArray } from 'class-validator';

export class GetVocabularyDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

export class CreateVocabularyDto {
  @IsString()
  word: string;

  @IsString()
  translation: string;

  @IsString()
  language: string;

  @IsOptional()
  @IsString()
  exampleSentence?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;
}

export class ReviewVocabularyDto {
  @IsString()
  vocabularyId: string;

  @IsString()
  difficulty: 'easy' | 'medium' | 'hard';
}