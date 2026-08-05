-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "communityId" TEXT,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "chatId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Message_communityId_idx" ON "Message"("communityId");

-- CreateIndex
CREATE INDEX "Message_isPinned_idx" ON "Message"("isPinned");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
