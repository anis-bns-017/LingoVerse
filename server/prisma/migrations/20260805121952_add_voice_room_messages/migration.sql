-- CreateTable
CREATE TABLE "VoiceRoomMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceRoomMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceRoomMessage_roomId_idx" ON "VoiceRoomMessage"("roomId");

-- CreateIndex
CREATE INDEX "VoiceRoomMessage_senderId_idx" ON "VoiceRoomMessage"("senderId");

-- AddForeignKey
ALTER TABLE "VoiceRoomMessage" ADD CONSTRAINT "VoiceRoomMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceRoomMessage" ADD CONSTRAINT "VoiceRoomMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
