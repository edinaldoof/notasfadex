/*
  Warnings:

  - You are about to drop the column `user` on the `NoteHistoryEvent` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "HistoryType" ADD VALUE 'REJECTED';

-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'REJEITADA';

-- AlterTable
ALTER TABLE "NoteHistoryEvent" DROP COLUMN "user",
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "NoteHistoryEvent" ADD CONSTRAINT "NoteHistoryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
