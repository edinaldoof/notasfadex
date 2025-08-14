

import { 
  FiscalNote as PrismaFiscalNote, 
  NoteHistoryEvent as PrismaNoteHistoryEvent, 
  HistoryType,
  InvoiceStatus as PrismaInvoiceStatus, // Renomeado para evitar conflito
  InvoiceType,
  Role,
  User as PrismaUser,
} from '@prisma/client';

// Adicionando 'REJEITADA' ao enum local
export const InvoiceStatus = { ...PrismaInvoiceStatus, REJEITADA: 'REJEITADA' } as const;
export type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus];

// NOVO: Status para a Ordem de Fornecimento
export enum StatusOF {
  RASCUNHO = 'RASCUNHO',
  AGUARDANDO_NOTA = 'AGUARDANDO_NOTA',
  NOTA_RECEBIDA = 'NOTA_RECEBIDA',
  ATRASADO = 'ATRASADO',
  CANCELADO = 'CANCELADO',
}


// Re-export Prisma types to be used across the application
export { HistoryType, InvoiceType, Role };

// ALTERADO: Adicionado 'author' opcional (a relação) e userName (string)
export interface NoteHistoryEvent extends PrismaNoteHistoryEvent {
  author?: Partial<PrismaUser> | null;
}

export interface FiscalNote extends Omit<PrismaFiscalNote, 'status'> {
  status: InvoiceStatus; // Usa o nosso enum customizado
  history?: NoteHistoryEvent[];
  attestedBy?: string | null;
  attestedAt?: Date | null;
  observation?: string | null;
  user?: Partial<PrismaUser>; // Include user for accessing email
  projectTitle?: string | null;
}

export interface SendEmailOptions {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachment?: {
    filename: string;
    contentType: string;
    content: string; // base64 encoded
  };
}

export interface AttestationEmailPayload {
    noteId: string;
    coordinatorName: string;
    coordinatorEmail: string;
    requesterName: string;
    requesterEmail: string;
    ccEmails?: string;
    noteDescription: string;
    driveFileId: string;
    fileName: string;
    fileType: string;
    numeroNota: string | null;
    projectTitle: string | null;
    projectAccountNumber: string;
    secureLink?: string; // Optional because it's generated within the action
}

export interface CoordinatorConfirmationEmailPayload {
    noteId: string;
    coordinatorName: string;
    coordinatorEmail: string;
    requesterEmail: string; // Add requester email to CC them
    noteDescription: string;
    attestedFileId: string;
    attestedFileName: string;
    attestationDate: Date;
    attestationObservation?: string | null;
    numeroNota: string | null;
    projectTitle: string | null;
    projectAccountNumber: string;
}

export interface RejectionEmailPayload {
    noteId: string;
    coordinatorName: string;
    requesterName: string;
    requesterEmail: string;
    noteDescription: string;
    rejectionReason: string;
    rejectionDate: Date;
    numeroNota: string | null;
    projectTitle: string | null;
    projectAccountNumber: string;
}

export interface EmailTemplateParts {
  subject: string;
  body: string;
}
