-- CreateTable
CREATE TABLE "TradingViewWebhook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "defaultAssetClass" "AssetClass" NOT NULL DEFAULT 'EQUITY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTriggeredAt" TIMESTAMP(3),

    CONSTRAINT "TradingViewWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradingViewWebhook_tokenHash_key" ON "TradingViewWebhook"("tokenHash");

-- CreateIndex
CREATE INDEX "TradingViewWebhook_userId_idx" ON "TradingViewWebhook"("userId");

-- AddForeignKey
ALTER TABLE "TradingViewWebhook" ADD CONSTRAINT "TradingViewWebhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingViewWebhook" ADD CONSTRAINT "TradingViewWebhook_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
