-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('PENDENTE', 'ATESTADA', 'EXPIRADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('SERVICO', 'PRODUTO');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PDF', 'XML', 'JPG', 'PNG', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('OWNER', 'MANAGER', 'MEMBER', 'VIEWER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PermissionType_new" AS ENUM ('NOTE_CREATE', 'NOTE_READ', 'NOTE_UPDATE', 'NOTE_DELETE', 'USER_MANAGE');
ALTER TABLE "UserPermission" ALTER COLUMN "permission" TYPE "PermissionType_new" USING ("permission"::text::"PermissionType_new");
ALTER TYPE "PermissionType" RENAME TO "PermissionType_old";
ALTER TYPE "PermissionType_new" RENAME TO "PermissionType";
DROP TYPE "PermissionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "FiscalNote" DROP CONSTRAINT "FiscalNote_attestedById_fkey";

-- DropForeignKey
ALTER TABLE "FiscalNote" DROP CONSTRAINT "FiscalNote_userId_fkey";

-- DropForeignKey
ALTER TABLE "NoteHistoryEvent" DROP CONSTRAINT "NoteHistoryEvent_fiscalNoteId_fkey";

-- DropForeignKey
ALTER TABLE "NoteHistoryEvent" DROP CONSTRAINT "NoteHistoryEvent_userId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- DropTable
DROP TABLE "FiscalNote";

-- DropTable
DROP TABLE "NoteHistoryEvent";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "InvoiceType";

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attestationDeadline" TIMESTAMP(3),
    "status" "NoteStatus" NOT NULL DEFAULT 'PENDENTE',
    "type" "NoteType" NOT NULL DEFAULT 'SERVICO',
    "fileType" "FileType" NOT NULL DEFAULT 'PDF',
    "fileName" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "totalValue" DOUBLE PRECISION,
    "hasWithholdingTax" BOOLEAN NOT NULL DEFAULT false,
    "projectTitle" TEXT,
    "projectAccountNumber" TEXT NOT NULL,
    "coordinatorName" TEXT NOT NULL,
    "coordinatorEmail" TEXT NOT NULL,
    "ccEmailList" TEXT,
    "attestedAt" TIMESTAMP(3),
    "attestedDriveFileId" TEXT,
    "attestedById" TEXT,
    "reportFileName" TEXT,
    "reportDriveFileId" TEXT,
    "observation" TEXT,
    "providerName" TEXT,
    "providerDocument" TEXT,
    "clientName" TEXT,
    "clientDocument" TEXT,
    "noteNumber" TEXT,
    "userId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteHistory" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "HistoryType" NOT NULL,
    "details" TEXT NOT NULL,
    "userName" TEXT,
    "noteId" TEXT NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "NoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_userId_idx" ON "Note"("userId");

-- CreateIndex
CREATE INDEX "Note_attestedById_idx" ON "Note"("attestedById");

-- CreateIndex
CREATE INDEX "Note_status_idx" ON "Note"("status");

-- CreateIndex
CREATE INDEX "Note_isDeleted_idx" ON "Note"("isDeleted");

-- CreateIndex
CREATE INDEX "Note_projectAccountNumber_idx" ON "Note"("projectAccountNumber");

-- CreateIndex
CREATE INDEX "NoteHistory_noteId_idx" ON "NoteHistory"("noteId");

-- CreateIndex
CREATE INDEX "NoteHistory_authorId_idx" ON "NoteHistory"("authorId");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_attestedById_fkey" FOREIGN KEY ("attestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteHistory" ADD CONSTRAINT "NoteHistory_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteHistory" ADD CONSTRAINT "NoteHistory_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
