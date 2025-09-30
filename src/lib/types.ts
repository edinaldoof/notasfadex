
import { 
  FiscalNote as PrismaFiscalNote, 
  NoteHistoryEvent as PrismaNoteHistoryEvent, 
  HistoryType,
  InvoiceStatus as PrismaInvoiceStatus,
  InvoiceType,
  Role,
  User as PrismaUser,
  PermissionType as PrismaPermissionType,
  Prisma,
} from '@prisma/client';

export const InvoiceStatus = { ...PrismaInvoiceStatus };
export type InvoiceStatus = PrismaInvoiceStatus;

export const PermissionType = PrismaPermissionType;
export type PermissionType = PrismaPermissionType;


export { HistoryType, InvoiceType, Role };


export interface NoteHistoryEvent extends PrismaNoteHistoryEvent {
  author?: Partial<PrismaUser> | null;
  userName?: string | null;
}

export interface FiscalNote extends Omit<PrismaFiscalNote, 'amount'> {
  amount: number | null;
  history?: NoteHistoryEvent[];
  user?: Partial<PrismaUser>; 
}

export interface SendEmailOptions {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachment?: {
    filename: string;
    contentType: string;
    content: string;
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
    secureLink?: string;
}

export interface CoordinatorConfirmationEmailPayload {
    noteId: string;
    coordinatorName: string;
    coordinatorEmail: string;
    requesterEmail: string;
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

export interface ReminderEmailPayload {
    noteId: string;
    coordinatorName: string;
    coordinatorEmail: string;
    requesterEmail: string;
    noteDescription: string;
    numeroNota: string | null;
    projectTitle: string | null;
    daysRemaining: number;
}

export interface EmailTemplateParts {
  subject: string;
  body: string;
}

// ===================================
// Tipos para Módulo de Solicitação (Ordem de Fornecimento)
// ===================================

export enum StatusOF {
  RASCUNHO = 'RASCUNHO',
  AGUARDANDO_CONFIRMACAO = 'AGUARDANDO_CONFIRMACAO',
  AGUARDANDO_NOTA = 'AGUARDANDO_NOTA',
  NF_RECEBIDA = 'NF_RECEBIDA',
  ATRASADO = 'ATRASADO',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO',
}
export type TemplateType = 'ATTESTATION_REQUEST' | 'ATTESTATION_REMINDER' | 'ATTESTATION_CONFIRMATION' | 'NOTE_EXPIRED' | 'ATTESTATION_CONFIRMATION_COORDINATOR' | 'NOTE_REJECTED' | 'OF_ENVIO' | 'OF_LEMBRETE_CONFIRMACAO' | 'OF_CONFIRMACAO_INTERNA' | 'OF_LEMBRETE_NF' | 'OF_CANCELADA';
