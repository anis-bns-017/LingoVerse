-- CreateTable
CREATE TABLE "VoiceTranscription" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "text" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "speaker" TEXT,
    "confidence" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceTranscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceTranslation" (
    "id" TEXT NOT NULL,
    "transcriptionId" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceClap" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "clapCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceClap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSpeakerQueue" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceSpeakerQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceRoomInvite" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 10,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceRoomInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceRoomAnalytics" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "totalListeners" INTEGER NOT NULL DEFAULT 0,
    "totalSpeakers" INTEGER NOT NULL DEFAULT 0,
    "averageListeners" INTEGER NOT NULL DEFAULT 0,
    "peakListeners" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "totalClaps" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retentionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceRoomAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSpeakerStats" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speakingTime" INTEGER NOT NULL DEFAULT 0,
    "timesSpoken" INTEGER NOT NULL DEFAULT 0,
    "clapsReceived" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "isStarSpeaker" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceSpeakerStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceTranscription_roomId_idx" ON "VoiceTranscription"("roomId");

-- CreateIndex
CREATE INDEX "VoiceTranscription_userId_idx" ON "VoiceTranscription"("userId");

-- CreateIndex
CREATE INDEX "VoiceTranscription_timestamp_idx" ON "VoiceTranscription"("timestamp");

-- CreateIndex
CREATE INDEX "VoiceTranscription_language_idx" ON "VoiceTranscription"("language");

-- CreateIndex
CREATE INDEX "VoiceTranslation_transcriptionId_idx" ON "VoiceTranslation"("transcriptionId");

-- CreateIndex
CREATE INDEX "VoiceTranslation_sourceLanguage_idx" ON "VoiceTranslation"("sourceLanguage");

-- CreateIndex
CREATE INDEX "VoiceTranslation_targetLanguage_idx" ON "VoiceTranslation"("targetLanguage");

-- CreateIndex
CREATE INDEX "VoiceClap_roomId_idx" ON "VoiceClap"("roomId");

-- CreateIndex
CREATE INDEX "VoiceClap_userId_idx" ON "VoiceClap"("userId");

-- CreateIndex
CREATE INDEX "VoiceClap_targetUserId_idx" ON "VoiceClap"("targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceClap_roomId_userId_targetUserId_key" ON "VoiceClap"("roomId", "userId", "targetUserId");

-- CreateIndex
CREATE INDEX "VoiceSpeakerQueue_roomId_idx" ON "VoiceSpeakerQueue"("roomId");

-- CreateIndex
CREATE INDEX "VoiceSpeakerQueue_userId_idx" ON "VoiceSpeakerQueue"("userId");

-- CreateIndex
CREATE INDEX "VoiceSpeakerQueue_position_idx" ON "VoiceSpeakerQueue"("position");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceSpeakerQueue_roomId_userId_key" ON "VoiceSpeakerQueue"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceRoomInvite_code_key" ON "VoiceRoomInvite"("code");

-- CreateIndex
CREATE INDEX "VoiceRoomInvite_roomId_idx" ON "VoiceRoomInvite"("roomId");

-- CreateIndex
CREATE INDEX "VoiceRoomInvite_code_idx" ON "VoiceRoomInvite"("code");

-- CreateIndex
CREATE INDEX "VoiceRoomAnalytics_roomId_idx" ON "VoiceRoomAnalytics"("roomId");

-- CreateIndex
CREATE INDEX "VoiceRoomAnalytics_timestamp_idx" ON "VoiceRoomAnalytics"("timestamp");

-- CreateIndex
CREATE INDEX "VoiceSpeakerStats_roomId_idx" ON "VoiceSpeakerStats"("roomId");

-- CreateIndex
CREATE INDEX "VoiceSpeakerStats_userId_idx" ON "VoiceSpeakerStats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceSpeakerStats_roomId_userId_key" ON "VoiceSpeakerStats"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "VoiceTranscription" ADD CONSTRAINT "VoiceTranscription_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceTranscription" ADD CONSTRAINT "VoiceTranscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceTranslation" ADD CONSTRAINT "VoiceTranslation_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "VoiceTranscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceClap" ADD CONSTRAINT "VoiceClap_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceClap" ADD CONSTRAINT "VoiceClap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceClap" ADD CONSTRAINT "VoiceClap_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSpeakerQueue" ADD CONSTRAINT "VoiceSpeakerQueue_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSpeakerQueue" ADD CONSTRAINT "VoiceSpeakerQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSpeakerQueue" ADD CONSTRAINT "VoiceSpeakerQueue_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceRoomInvite" ADD CONSTRAINT "VoiceRoomInvite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceRoomInvite" ADD CONSTRAINT "VoiceRoomInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceRoomAnalytics" ADD CONSTRAINT "VoiceRoomAnalytics_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSpeakerStats" ADD CONSTRAINT "VoiceSpeakerStats_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSpeakerStats" ADD CONSTRAINT "VoiceSpeakerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
