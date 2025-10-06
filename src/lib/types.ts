import { 
  Note as PrismaNote,
  NoteHistory as PrismaNoteHistory,
  HistoryType,
  NoteStatus as PrismaNoteStatus,
  NoteType,
  Role,
  User as PrismaUser,
  PermissionType as PrismaPermissionType,
  Tutorial as PrismaTutorial,
  TutorialType as PrismaTutorialType,
  Settings as PrismaSettings,
  SqlServerSettings as PrismaSqlServerSettings,
  EmailTemplate as PrismaEmailTemplate,
} from '@prisma/client';

export const NoteStatus = { ...PrismaNoteStatus };
export type NoteStatus = PrismaNoteStatus;

export const PermissionType = PrismaPermissionType;
export type PermissionType = PrismaPermissionType;

export const TutorialType = PrismaTutorialType;
export type TutorialType = PrismaTutorialType;


export { HistoryType, NoteType, Role };

export type Settings = PrismaSettings;
export type SqlServerSettings = PrismaSqlServerSettings;
export type EmailTemplate = PrismaEmailTemplate;


export interface NoteHistory extends PrismaNoteHistory {
  author?: Partial<PrismaUser> | null;
}

export interface Note extends PrismaNote {
  history?: NoteHistory[];
  user?: Partial<PrismaUser>;
  attestor?: Partial<PrismaUser> | null;
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
    noteNumber: string | null;
    projectTitle: string | null;
    projectAccountNumber: string;
    secureLink?: string;
}

export interface CoordinatorConfirmationEmailPayload {
    noteId: string;
    coordinatorName:string;
    coordinatorEmail: string;
    requesterEmail: string;
    noteDescription: string;
    attestedFileId: string;
    attestedFileName: string;
    attestationDate: Date;
    attestationObservation?: string | null;
    noteNumber: string | null;
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
    noteNumber: string | null;
    projectTitle: string | null;
    projectAccountNumber: string;
}

export interface EmailTemplateParts {
  subject: string;
  body: string;
}


export type TemplateType = 'ATTESTATION_REQUEST' | 'ATTESTATION_REMINDER' | 'ATTESTATION_CONFIRMATION' | 'NOTE_EXPIRED' | 'ATTESTATION_CONFIRMATION_COORDINATOR' | 'NOTE_REJECTED';

export type Tutorial = PrismaTutorial;

export interface Coordinator {
  name: string;
  email: string;
  isGeneral: boolean;
}

export interface ProjectDetails {
  projectTitle: string;
  coordinators: Coordinator[];
}