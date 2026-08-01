/*
  Warnings:

  - You are about to drop the column `duration` on the `VoiceParticipant` table. All the data in the column will be lost.
  - The `role` column on the `VoiceParticipant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `hostId` on the `VoiceRoom` table. All the data in the column will be lost.
  - Added the required column `creatorId` to the `VoiceRoom` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('SPEAKER', 'LISTENER', 'STAGE_SPEAKER', 'MODERATOR');

-- DropForeignKey
ALTER TABLE "VoiceRoom" DROP CONSTRAINT "VoiceRoom_hostId_fkey";

-- DropIndex
DROP INDEX "VoiceParticipant_roomId_idx";

-- DropIndex
DROP INDEX "VoiceParticipant_userId_idx";

-- DropIndex
DROP INDEX "VoiceRoom_hostId_idx";

-- AlterTable
ALTER TABLE "VoiceParticipant" DROP COLUMN "duration",
ADD COLUMN     "isDeafened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMuted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "raisedHand" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "role",
ADD COLUMN     "role" "ParticipantRole" NOT NULL DEFAULT 'LISTENER';

-- AlterTable
ALTER TABLE "VoiceRoom" DROP COLUMN "hostId",
ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "isRecording" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liveKitRoomId" TEXT,
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ALTER COLUMN "maxParticipants" SET DEFAULT 50;

-- DropEnum
DROP TYPE "VoiceParticipantRole";

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "speakers" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceRoom" ADD CONSTRAINT "VoiceRoom_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
