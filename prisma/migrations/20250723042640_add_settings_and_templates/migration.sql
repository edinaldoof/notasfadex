-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MANAGER', 'OWNER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDENTE', 'ATESTADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "HistoryType" AS ENUM ('CREATED', 'ATTESTED', 'REVERTED', 'EDITED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SERVICO', 'PRODUTO');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalNote" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDENTE',
    "amount" DOUBLE PRECISION,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalFileUrl" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "category" TEXT,
    "attestedFileUrl" TEXT,
    "attestedDriveFileId" TEXT,
    "attestedAt" TIMESTAMP(3),
    "observation" TEXT,
    "attestedById" TEXT,
    "attestedBy" TEXT,
    "userId" TEXT NOT NULL,
    "projectAccountNumber" TEXT NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL DEFAULT 'SERVICO',
    "hasWithholdingTax" BOOLEAN NOT NULL DEFAULT false,
    "coordinatorName" TEXT NOT NULL,
    "coordinatorEmail" TEXT NOT NULL,
    "attestationDeadline" TIMESTAMP(3),
    "prestadorRazaoSocial" TEXT,
    "prestadorCnpj" TEXT,
    "tomadorRazaoSocial" TEXT,
    "tomadorCnpj" TEXT,
    "numeroNota" TEXT,
    "dataEmissao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteHistoryEvent" (
    "id" TEXT NOT NULL,
    "fiscalNoteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "HistoryType" NOT NULL,
    "user" TEXT NOT NULL,
    "details" TEXT NOT NULL,

    CONSTRAINT "NoteHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "attestationDeadlineInDays" INTEGER NOT NULL DEFAULT 30,
    "reminderFrequencyInDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("type")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalNote_driveFileId_key" ON "FiscalNote"("driveFileId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_type_key" ON "EmailTemplate"("type");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalNote" ADD CONSTRAINT "FiscalNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteHistoryEvent" ADD CONSTRAINT "NoteHistoryEvent_fiscalNoteId_fkey" FOREIGN KEY ("fiscalNoteId") REFERENCES "FiscalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
