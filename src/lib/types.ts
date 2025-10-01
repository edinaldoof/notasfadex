
import { 
  FiscalNote as PrismaFiscalNote, 
  NoteHistoryEvent as PrismaNoteHistoryEvent, 
  HistoryType,
  InvoiceStatus as PrismaInvoiceStatus,
  InvoiceType,
  Role,
  User as PrismaUser,
  PermissionType as PrismaPermissionType,
  Tutorial as PrismaTutorial,
  TutorialType as PrismaTutorialType,
  Settings as PrismaSettings,
  SqlServerSettings as PrismaSqlServerSettings,
  EmailTemplate as PrismaEmailTemplate,
} from '@prisma/client';

export const InvoiceStatus = { ...PrismaInvoiceStatus };
export type InvoiceStatus = PrismaInvoiceStatus;

export const PermissionType = PrismaPermissionType;
export type PermissionType = PrismaPermissionType;

export const TutorialType = PrismaTutorialType;
export type TutorialType = PrismaTutorialType;


export { HistoryType, InvoiceType, Role };

export type Settings = PrismaSettings;
export type SqlServerSettings = PrismaSqlServerSettings;
export type EmailTemplate = PrismaEmailTemplate;


export interface NoteHistoryEvent extends PrismaNoteHistoryEvent {
  author?: Partial<PrismaUser> | null;
}

export interface FiscalNote extends Omit<PrismaFiscalNote, 'amount'> {
  amount: number | null;
  history?: NoteHistoryEvent[];
  user?: Partial<PrismaUser>; // Relação 'user' da nota
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
    ccEmails?: string | null;
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
    ccEmails?: string | null;
    noteDescription: string;
    numeroNota: string | null;
    projectTitle: string | null;
    daysRemaining: number;
}


export interface EmailTemplateParts {
  subject: string;
  body: string;
}


export type TemplateType = 'ATTESTATION_REQUEST' | 'ATTESTATION_REMINDER' | 'ATTESTATION_CONFIRMATION' | 'NOTE_EXPIRED' | 'ATTESTATION_CONFIRMATION_COORDINATOR' | 'NOTE_REJECTED';

export type Tutorial = PrismaTutorial;
