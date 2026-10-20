-- CreateTable
CREATE TABLE "QuoteRender" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRender_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteRender_quoteId_idx" ON "QuoteRender"("quoteId");

-- AddForeignKey
ALTER TABLE "QuoteRender" ADD CONSTRAINT "QuoteRender_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
