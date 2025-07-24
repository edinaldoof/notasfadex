
import { 
  FiscalNote as PrismaFiscalNote, 
  NoteHistoryEvent as PrismaNoteHistoryEvent, 
  HistoryType,
  InvoiceStatus,
  InvoiceType,
  Role
} from '@prisma/client';

// Re-export Prisma types to be used across the application
export { HistoryType, InvoiceStatus, InvoiceType, Role };

export interface NoteHistoryEvent extends PrismaNoteHistoryEvent {}

export interface FiscalNote extends PrismaFiscalNote {
  history?: NoteHistoryEvent[];
  attestedBy?: string | null;
  attestedAt?: Date | null;
  observation?: string | null;
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
}
