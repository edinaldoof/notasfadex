/*
  Warnings:

  - The primary key for the `EmailTemplate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `category` on the `FiscalNote` table. All the data in the column will be lost.
  - The required column `id` was added to the `EmailTemplate` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `EmailTemplate` table without a default value. This is not possible if the table is not empty.
  - Made the column `attestationDeadline` on table `FiscalNote` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "NoteHistoryEvent" DROP CONSTRAINT "NoteHistoryEvent_fiscalNoteId_fkey";

-- DropIndex
DROP INDEX "FiscalNote_driveFileId_key";

-- DropIndex
DROP INDEX "VerificationToken_token_key";

-- AlterTable
ALTER TABLE "EmailTemplate" DROP CONSTRAINT "EmailTemplate_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "FiscalNote" DROP COLUMN "category",
ADD COLUMN     "projectTitle" TEXT,
ALTER COLUMN "attestationDeadline" SET NOT NULL;

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "reminderFrequencyInDays" SET DEFAULT 3;

-- AddForeignKey
ALTER TABLE "NoteHistoryEvent" ADD CONSTRAINT "NoteHistoryEvent_fiscalNoteId_fkey" FOREIGN KEY ("fiscalNoteId") REFERENCES "FiscalNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
