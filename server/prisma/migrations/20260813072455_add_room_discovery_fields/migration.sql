-- AlterTable
ALTER TABLE "VoiceRoom" ADD COLUMN     "categories" TEXT[],
ADD COLUMN     "language" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "topics" TEXT[],
ADD COLUMN     "trendScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
