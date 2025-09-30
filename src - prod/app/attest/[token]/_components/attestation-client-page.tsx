
'use client';

import { 
  Layers, 
  FileCheck, 
  CircleHelp, 
  ExternalLink,
  Download,
  Calendar,
  DollarSign,
  FileText,
  User as UserIcon,
  Hash,
  XCircle,
  CheckCircle,
  FileSignature,
  Paperclip,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { RejectionDialog } from './rejection-dialog';
import AttestationForm from './attestation-form';
import type { FiscalNote } from '@/lib/types';
import { NotePreviewDialog } from '@/components/dashboard/note-preview-dialog';
import { Prisma } from '@prisma/client';


type SubmissionStatus = 'pending' | 'attested' | 'rejected';

interface AttestationClientPageProps {
  initialNote: FiscalNote;
  token: string;
}

function formatCurrency(amount: Prisma.Decimal | null): string {
  if (amount === null || amount === undefined) return 'Não extraído';
  const numberAmount = typeof amount === 'number' ? amount : amount.toNumber();
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numberAmount);
}

function formatDate(date: Date | string): string {
    if (!date) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(date));
}


const InfoItem = ({ 
  icon: Icon, 
  label, 
  value, 
  className = '' 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string; 
  value?: string | null;
  className?: string;
}) => (
  <div className={`border-b border-slate-700 pb-3 last:border-b-0 ${className}`}>
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" />
      <p className="text-sm text-slate-400 font-medium">{label}</p>
    </div>
    <p className="text-lg font-semibold text-white ml-6" title={value || ''}>
      {value || 'Não informado'}
    </p>
  </div>
);

const ActionButton = ({
  onClick,
  text,
  icon: Icon,
  variant = 'primary',
  href
}: {
  onClick?: () => void;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'primary' | 'secondary';
  href?: string;
}) => {
  const commonClasses = "w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800";
  const primaryClasses = "text-white bg-primary hover:bg-primary/90 focus:ring-primary";
  const secondaryClasses = "text-slate-300 bg-slate-700/50 hover:bg-slate-700 border-slate-600 focus:ring-slate-500";
  
  const buttonContent = (
      <>
        <Icon className="w-5 h-5 mr-2" aria-hidden="true" />
        {text}
      </>
  );
  
  if (href) {
    return (
      <a href={href} download className={`${commonClasses} ${variant === 'primary' ? primaryClasses : secondaryClasses}`}>
        {buttonContent}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={`${commonClasses} ${variant === 'primary' ? primaryClasses : secondaryClasses}`}>
      {buttonContent}
    </button>
  );
};


const GovBrSignatureInfo = () => (
  <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
    <div className="flex items-start space-x-3">
      <CircleHelp className="w-6 h-6 text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <h3 className="font-bold text-blue-300 mb-2">Precisa assinar o documento?</h3>
        <p className="text-blue-300/90 text-sm mb-3">
          Use o portal do gov.br para assinar seu PDF gratuitamente e de forma segura.
        </p>
        <a 
          href="https://www.gov.br/governodigital/pt-br/identidade/assinatura-eletronica" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-white font-semibold hover:underline transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-blue-900 rounded"
          aria-label="Acessar Assinador GOV.BR (abre em nova aba)"
        >
          Acessar Assinador GOV.BR 
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  </div>
);

const SuccessScreen = ({ title, message, icon }: { title: string; message: string; icon: React.ReactNode }) => {
    const [countdown, setCountdown] = useState(15);
    
    useEffect(() => {
        if (countdown === 0) {
            // Em um cenário real, você poderia usar o router para redirecionar.
            // Como a janela pode ser fechada, apenas paramos o contador.
            return;
        }

        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown]);
    
    return (
        <div 
            className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl animate-in fade-in-50"
            role="alert"
            aria-live="polite"
        >
            {icon}
            <h2 className="text-2xl font-bold text-white mt-4">{title}</h2>
            <p className="text-slate-300 mt-2 max-w-sm">
                {message}
            </p>
            <div className="mt-8 space-y-3">
                <p className="text-sm text-slate-500">
                   Esta janela pode ser fechada. Você será redirecionado em {countdown} segundos caso permaneça.
                </p>
                 <Link 
                  href="/" 
                  className="inline-block text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800 rounded"
                >
                  Voltar para a página inicial agora
                </Link>
            </div>
        </div>
    );
};


export default function AttestationClientPage({ initialNote, token }: AttestationClientPageProps) {
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('pending');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const note = initialNote;

  const originalFileUrl = note?.originalFileUrl.startsWith('/api') 
    ? `${note.originalFileUrl}?token=${token}` 
    : note?.originalFileUrl || '';

  const reportFileUrl = note?.reportFileUrl?.startsWith('/api') 
    ? `${note.reportFileUrl}?token=${token}` 
    : note?.reportFileUrl || '';

  return (
    <>
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header */}
          <header className="flex justify-center mb-8 sm:mb-12">
            <div className="flex items-center space-x-4">
              <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-200 shadow-lg">
                 <img src="/favicon.ico" alt="Fadex Logo" className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Ateste de Nota Fiscal
                </h1>
                <p className="text-sm sm:text-base text-slate-400 font-medium">
                  Plataforma Notas Fadex
                </p>
              </div>
            </div>
          </header>

          {submissionStatus === 'pending' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Coluna de Informações */}
              <section 
                className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm"
                aria-labelledby="note-details-heading"
              >
                <h2 
                  id="note-details-heading"
                  className="text-xl sm:text-2xl font-semibold mb-6 flex items-center gap-3"
                >
                  <FileCheck className="w-8 h-8 text-primary" aria-hidden="true" />
                  Detalhes para Revisão
                </h2>
                
                <div className="space-y-4 text-slate-300 mb-8">
                   <InfoItem 
                    icon={FileSignature}
                    label="Título do Projeto" 
                    value={note.projectTitle} 
                  />
                  <InfoItem 
                    icon={UserIcon}
                    label="Solicitante" 
                    value={note.requester} 
                  />
                  <InfoItem 
                    icon={Hash}
                    label="Conta do Projeto" 
                    value={note.projectAccountNumber} 
                  />
                  <InfoItem 
                    icon={FileText}
                    label="Nº da Nota" 
                    value={note.numeroNota} 
                  />
                  <InfoItem 
                    icon={DollarSign}
                    label="Valor" 
                    value={formatCurrency(note.amount)} 
                  />
                  <InfoItem 
                    icon={Calendar}
                    label="Data de Envio" 
                    value={formatDate(note.issueDate)} 
                  />
                  <InfoItem 
                    icon={FileText}
                    label="Descrição" 
                    value={note.description}
                    className="pb-0"
                  />
                </div>
                
                <div className="space-y-3">
                  <ActionButton 
                    onClick={() => setIsPreviewOpen(true)}
                    text="Visualizar Nota Original"
                    icon={Eye}
                    variant="secondary"
                  />
                   <ActionButton 
                    href={originalFileUrl}
                    text="Baixar para Assinatura"
                    icon={Download}
                    variant="primary"
                  />
                  {note.reportFileUrl && (
                     <ActionButton 
                        href={reportFileUrl}
                        text="Baixar Relatório Anexo"
                        icon={Paperclip}
                        variant="secondary"
                     />
                  )}
                </div>

              </section>

              {/* Coluna do Formulário */}
              <section 
                className="bg-slate-800 p-6 rounded-2xl border border-slate-700/80 shadow-lg backdrop-blur-sm"
                aria-labelledby="attestation-form-heading"
              >
                <h2 
                  id="attestation-form-heading"
                  className="text-xl sm:text-2xl font-semibold mb-2"
                >
                  Confirmar Ateste
                </h2>
                <p className="text-slate-400 mb-6">
                  Preencha seu nome e anexe o documento assinado.
                </p>
                
                <div className="mb-6">
                  <GovBrSignatureInfo />
                </div>
                
                <AttestationForm token={token} onSuccess={() => setSubmissionStatus('attested')} />

                <div className="mt-6 text-center">
                   <RejectionDialog token={token} noteId={note.id} requesterEmail={note.creator?.email} onSuccess={() => setSubmissionStatus('rejected')} />
                </div>
              </section>
            </div>
          ) : submissionStatus === 'attested' ? (
              <SuccessScreen 
                  title="Atesto Registrado com Sucesso!"
                  message="Sua confirmação foi processada e a nota fiscal foi atestada. Um e-mail de confirmação foi enviado. Agradecemos sua colaboração."
                  icon={<CheckCircle className="w-16 h-16 text-green-400" />}
              />
          ) : submissionStatus === 'rejected' ? (
              <SuccessScreen 
                  title="Nota Rejeitada!"
                  message="A rejeição foi registrada com sucesso e o solicitante original foi notificado por e-mail para tomar as devidas providências."
                  icon={<XCircle className="w-16 h-16 text-destructive" />}
              />
          ) : null}
        </div>
      </div>
    </main>

    <NotePreviewDialog 
        open={isPreviewOpen} 
        onOpenChange={setIsPreviewOpen}
        fileUrl={originalFileUrl}
        fileName={note.fileName || 'documento'}
    />
    </>
  );
}
