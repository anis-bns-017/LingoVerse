-- AlterTable
ALTER TABLE "VoiceRoomMessage" ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "replyToId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'TEXT';

-- AddForeignKey
ALTER TABLE "VoiceRoomMessage" ADD CONSTRAINT "VoiceRoomMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "VoiceRoomMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
