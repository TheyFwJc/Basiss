-- AlterTable
ALTER TABLE "User" ADD COLUMN     "welcomedAt" TIMESTAMP(3);

-- Backfill: existing users have already been "welcomed" by definition —
-- only users created after this migration should see the first-run screen.
UPDATE "User" SET "welcomedAt" = "createdAt" WHERE "welcomedAt" IS NULL;
