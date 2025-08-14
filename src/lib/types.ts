
import { 
  FiscalNote as PrismaFiscalNote, 
  NoteHistoryEvent as PrismaNoteHistoryEvent, 
  HistoryType,
  InvoiceStatus as PrismaInvoiceStatus, // Renomeado para evitar conflito
  InvoiceType,
  Role,
  User as PrismaUser,
  EmailTemplate as PrismaEmailTemplate,
} from '@prisma/client';

// Adicionando 'REJEITADA' ao enum local
export const InvoiceStatus = { ...PrismaInvoiceStatus, REJEITADA: 'REJEITADA' } as const;
export type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus];

// NOVO: Status para a Ordem de Fornecimento
export enum StatusOF {
  RASCUNHO = 'RASCUNHO',
  AGUARDANDO_CONFIRMACAO = 'AGUARDANDO_CONFIRMACAO',
  AGUARDANDO_NOTA = 'AGUARDANDO_NOTA',
  NOTA_RECEBIDA = 'NOTA_RECEBIDA',
  ATRASADO = 'ATRASADO',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO',
}

// NOVO: Tipos de Email para o fluxo de Solicitação
export const TemplateType = {
  // Ateste
  ATTESTATION_REQUEST: 'ATTESTATION_REQUEST',
  ATTESTATION_REMINDER: 'ATTESTATION_REMINDER',
  ATTESTATION_CONFIRMATION: 'ATTESTATION_CONFIRMATION',
  NOTE_EXPIRED: 'NOTE_EXPIRED',
  ATTESTATION_CONFIRMATION_COORDINATOR: 'ATTESTATION_CONFIRMATION_COORDINATOR',
  NOTE_REJECTED: 'NOTE_REJECTED',
  // Solicitação
  OF_ENVIO: 'OF_ENVIO',
  OF_LEMBRETE_CONFIRMACAO: 'OF_LEMBRETE_CONFIRMACAO',
  OF_CONFIRMACAO_INTERNA: 'OF_CONFIRMACAO_INTERNA',
  OF_LEMBRETE_NF: 'OF_LEMBRETE_NF',
  OF_CANCELADA: 'OF_CANCELADA',
} as const;
export type TemplateType = typeof TemplateType[keyof typeof TemplateType];


// Re-export Prisma types to be used across the application
export { HistoryType, InvoiceType, Role };

export interface EmailTemplate extends PrismaEmailTemplate {
  type: TemplateType;
}

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
  reportFileName?: string | null;
  reportFileUrl?: string | null;
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
    requesterEmail: string; // Add a requester email to CC them
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
