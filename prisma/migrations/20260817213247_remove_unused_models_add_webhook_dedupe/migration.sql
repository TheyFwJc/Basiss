/*
  Warnings:

  - You are about to drop the `EquitySnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TradeTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EquitySnapshot" DROP CONSTRAINT "EquitySnapshot_tradingAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_userId_fkey";

-- DropForeignKey
ALTER TABLE "TradeTag" DROP CONSTRAINT "TradeTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "TradeTag" DROP CONSTRAINT "TradeTag_tradeId_fkey";

-- DropTable
DROP TABLE "EquitySnapshot";

-- DropTable
DROP TABLE "Tag";

-- DropTable
DROP TABLE "TradeTag";

-- CreateTable
CREATE TABLE "TradingViewWebhookEvent" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradingViewWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradingViewWebhookEvent_webhookId_idx" ON "TradingViewWebhookEvent"("webhookId");
