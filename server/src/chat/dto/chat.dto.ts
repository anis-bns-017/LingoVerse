import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  IsObject,
  IsBoolean,
} from 'class-validator';

export class CreateChatDto {
  @IsEnum(['PRIVATE', 'GROUP'])
  type: 'PRIVATE' | 'GROUP';

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @IsUUID(4, { each: true })
  participantIds: string[];
}

export class SendMessageDto {
  @IsString()
  chatId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum([
    'TEXT',
    'IMAGE',
    'VIDEO',
    'AUDIO',
    'FILE',
    'VOICE_NOTE',
    'GIF',
    'STICKER',
  ])
  type?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsUUID(4)
  replyToId?: string;
}

export class GetMessagesDto {
  @IsString()
  chatId: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  before?: string; // message id
}

export class MarkReadDto {
  @IsString()
  chatId: string;

  @IsString()
  messageId: string;
}

export class TypingDto {
  @IsString()
  chatId: string;

  @IsBoolean()
  isTyping: boolean;
}

export class AddReactionDto {
  @IsString()
  messageId: string;

  @IsString()
  emoji: string;
}

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsArray()
  @IsUUID(4, { each: true })
  participantIds: string[];
}

export class AddParticipantsDto {
  @IsArray()
  @IsUUID(4, { each: true })
  userIds: string[];
}

export class RemoveParticipantDto {
  @IsUUID(4)
  userId: string;
}
