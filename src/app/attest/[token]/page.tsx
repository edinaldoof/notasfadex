import { 
  Layers, 
  ShieldAlert, 
  FileCheck, 
  CircleHelp, 
  ExternalLink,
  Download,
  Calendar,
  DollarSign,
  FileText,
  User as UserIcon,
  Hash
} from 'lucide-react';
import { verifyAttestationToken } from '@/lib/token-utils';
import prisma from '@/lib/prisma';
import AttestationForm from './_components/attestation-form';
import Link from 'next/link';
import { Suspense } from 'react';

interface AttestationPageProps {
  params: {
    token: string;
  };
}

interface FiscalNote {
  id: string;
  requester: string;
  projectAccountNumber: string;
  numeroNota: string | null;
  amount: number | null;
  issueDate: Date;
  description: string;
  originalFileUrl: string;
  status: string;
}

async function getNoteFromToken(token: string): Promise<{
  note?: FiscalNote;
  error?: string;
}> {
  try {
    if (!token || typeof token !== 'string') {
      return { error: 'Token não fornecido ou inválido.' };
    }

    const decoded = verifyAttestationToken(token);
    if (!decoded || !decoded.noteId) {
      return { error: 'Token inválido ou expirado.' };
    }

    const note = await prisma.fiscalNote.findUnique({
      where: { id: decoded.noteId },
      select: {
        id: true,
        requester: true,
        projectAccountNumber: true,
        numeroNota: true,
        amount: true,
        issueDate: true,
        description: true,
        originalFileUrl: true,
        status: true,
      },
    });

    if (!note) {
      return { error: 'Nota fiscal não encontrada.' };
    }

    if (note.status !== 'PENDENTE') {
      return { error: 'Esta nota fiscal não está mais pendente de ateste.' };
    }

    return { note };
  } catch (err) {
    console.error('Error verifying token:', err);
    
    if (err instanceof Error) {
      if (err.name === 'TokenExpiredError') {
        return { error: 'Este link de ateste expirou.' };
      }
      if (err.name === 'JsonWebTokenError') {
        return { error: 'Este link de ateste é inválido.' };
      }
    }
    
    return { error: 'Ocorreu um erro ao verificar o link.' };
  }
}

function formatCurrency(amount: number | null): string {
  if (!amount) return 'Não extraído';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

function ErrorPage({ error }: { error: string }) {
  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="w-full max-w-lg text-center bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
        <ShieldAlert 
          className="w-16 h-16 text-destructive mx-auto mb-6" 
          aria-hidden="true"
        />
        <h1 className="text-3xl font-bold text-white mb-2">Acesso Inválido</h1>
        <p className="text-slate-400 text-lg" role="alert">
          {error}
        </p>
        <Link 
          href="/" 
          className="inline-block mt-8 text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800 rounded"
        >
          Voltar para a página inicial
        </Link>
      </div>
    </main>
  );
}

function LoadingPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="w-full max-w-lg text-center bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
        <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">Carregando...</h1>
        <p className="text-slate-400">Verificando informações da nota fiscal</p>
      </div>
    </main>
  );
}

const InfoItem = ({ 
  icon: Icon, 
  label, 
  value, 
  className = '' 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string; 
  value: string;
  className?: string;
}) => (
  <div className={`border-b border-slate-700 pb-3 last:border-b-0 ${className}`}>
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" />
      <p className="text-sm text-slate-400 font-medium">{label}</p>
    </div>
    <p className="text-lg font-semibold text-white ml-6" title={value}>
      {value}
    </p>
  </div>
);

const DownloadButton = ({ 
  downloadUrl, 
  fileName 
}: { 
  downloadUrl: string; 
  fileName: string;
}) => (
  <a 
    href={downloadUrl}
    download={fileName}
    className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800"
    aria-label={`Baixar ${fileName}`}
  >
    <Download className="w-5 h-5 mr-2" aria-hidden="true" />
    Baixar Nota Original para Assinatura
  </a>
);

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

export default async function AttestationPage({ params }: AttestationPageProps) {
  const { token } = params;
  
  if (!token) {
    return <ErrorPage error="Token não fornecido." />;
  }

  const { note, error } = await getNoteFromToken(token);

  if (error || !note) {
    return <ErrorPage error={error || 'Não foi possível carregar as informações da nota.'} />;
  }

  const downloadUrl = note.originalFileUrl.startsWith('/api') 
    ? `${note.originalFileUrl}?token=${token}` 
    : note.originalFileUrl;

  const fileName = `nota_fiscal_${note.numeroNota || note.id}.pdf`;

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 sm:px-6 md:px-8">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header */}
          <header className="flex justify-center mb-12">
            <div className="flex items-center space-x-4">
              <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-200 shadow-lg">
                <Layers className="w-8 h-8 text-slate-800" aria-hidden="true" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Ateste de Nota Fiscal
                </h1>
                <p className="text-base text-slate-400 font-medium">
                  Plataforma Notas Fadex
                </p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Coluna de Informações */}
            <section 
              className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm"
              aria-labelledby="note-details-heading"
            >
              <h2 
                id="note-details-heading"
                className="text-2xl font-semibold mb-6 flex items-center gap-3"
              >
                <FileCheck className="w-8 h-8 text-primary" aria-hidden="true" />
                Detalhes para Revisão
              </h2>
              
              <div className="space-y-4 text-slate-300 mb-8">
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
                  value={note.numeroNota || 'Não extraído'} 
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
              
              <DownloadButton 
                downloadUrl={downloadUrl} 
                fileName={fileName}
              />
            </section>

            {/* Coluna do Formulário */}
            <section 
              className="bg-slate-800 p-6 rounded-2xl border border-slate-700/80 shadow-lg backdrop-blur-sm"
              aria-labelledby="attestation-form-heading"
            >
              <h2 
                id="attestation-form-heading"
                className="text-2xl font-semibold mb-2"
              >
                Confirmar Ateste
              </h2>
              <p className="text-slate-400 mb-6">
                Preencha seu nome e anexe o documento assinado.
              </p>
              
              <div className="mb-6">
                <GovBrSignatureInfo />
              </div>
              
              <Suspense fallback={<LoadingPage />}>
                <AttestationForm token={token} />
              </Suspense>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}