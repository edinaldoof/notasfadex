/*
  Warnings:

  - Made the column `userId` on table `NoteHistoryEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "NoteHistoryEvent" DROP CONSTRAINT "NoteHistoryEvent_fiscalNoteId_fkey";

-- DropForeignKey
ALTER TABLE "NoteHistoryEvent" DROP CONSTRAINT "NoteHistoryEvent_userId_fkey";

-- AlterTable
ALTER TABLE "NoteHistoryEvent" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "FiscalNote" ADD CONSTRAINT "FiscalNote_attestedById_fkey" FOREIGN KEY ("attestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteHistoryEvent" ADD CONSTRAINT "NoteHistoryEvent_fiscalNoteId_fkey" FOREIGN KEY ("fiscalNoteId") REFERENCES "FiscalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteHistoryEvent" ADD CONSTRAINT "NoteHistoryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
