-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "dedupeKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");
