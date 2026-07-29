import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class SubmitExerciseDto {
  @IsString()
  exerciseId: string;

  @IsArray()
  answers: any[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GetExercisesDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  type?: 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'writing' | 'speaking';

  @IsOptional()
  @IsString()
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  @IsOptional()
  @IsString()
  limit?: string;
}