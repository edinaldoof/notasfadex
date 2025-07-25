import { Layers, ShieldAlert, FileCheck, CircleHelp, ExternalLink } from 'lucide-react';
import { verifyAttestationToken } from '@/lib/token-utils';
import prisma from '@/lib/prisma';
import AttestationForm from './_components/attestation-form';
import Link from 'next/link';

interface AttestationPageProps {
  params: {
    token: string;
  };
}

async function getNoteFromToken(token: string) {
    try {
        const decoded = verifyAttestationToken(token);
        if (!decoded) return { error: 'Token inválido ou expirado.' };

        const note = await prisma.fiscalNote.findUnique({
            where: { id: decoded.noteId },
        });

        if (!note) return { error: 'Nota fiscal não encontrada.' };
        if (note.status !== 'PENDENTE') return { error: 'Esta nota fiscal não está mais pendente de ateste.'};

        return { note };
    } catch (err) {
        if (err instanceof Error && err.name === 'TokenExpiredError') {
             return { error: 'Este link de ateste expirou.' };
        }
        if (err instanceof Error && err.name === 'JsonWebTokenError') {
             return { error: 'Este link de ateste é inválido.' };
        }
        console.error("Error verifying token:", err);
        return { error: 'Ocorreu um erro ao verificar o link.' };
    }
}

export default async function AttestationPage({ params }: AttestationPageProps) {
  const { token } = params;
  const { note, error } = await getNoteFromToken(token);

  if (error || !note) {
    return (
        <main className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
            <div className="w-full max-w-lg text-center bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
                 <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-6" />
                 <h1 className="text-3xl font-bold text-white mb-2">Acesso Inválido</h1>
                 <p className="text-slate-400 text-lg">{error || 'Não foi possível carregar as informações da nota.'}</p>
                  <Link href="/" className="inline-block mt-8 text-primary hover:underline">
                    Voltar para a página inicial
                </Link>
            </div>
        </main>
    );
  }

  const downloadUrl = note.originalFileUrl.startsWith('/api') 
    ? `${note.originalFileUrl}?token=${token}` 
    : note.originalFileUrl;

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
       <div className="w-full max-w-4xl mx-auto">
            <div className="flex justify-center mb-8">
                <div className="flex items-center space-x-4">
                    <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-200 shadow-lg">
                        <Layers className="w-8 h-8 text-slate-800" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                            Ateste de Nota Fiscal
                        </h1>
                        <p className="text-base text-slate-400 font-medium">Plataforma Notas Fadex</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Coluna de Informações */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                       <FileCheck className="w-8 h-8 text-primary" />
                       Detalhes para Revisão
                    </h2>
                    <div className="space-y-4 text-slate-300">
                        <InfoItem label="Solicitante" value={note.requester} />
                        <InfoItem label="Conta do Projeto" value={note.projectAccountNumber} />
                        <InfoItem label="Nº da Nota" value={note.numeroNota || 'Não extraído'} />
                        <InfoItem label="Valor" value={note.amount ? `R$ ${note.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não extraído'} />
                        <InfoItem label="Data de Envio" value={new Date(note.issueDate).toLocaleDateString('pt-BR')} />
                        <InfoItem label="Descrição" value={note.description} />
                    </div>
                     <div className="mt-8">
                        <a 
                            href={downloadUrl}
                            download
                            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90"
                        >
                            Baixar Nota Original para Assinatura
                        </a>
                    </div>
                </div>

                {/* Coluna do Formulário */}
                 <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/80 shadow-lg">
                     <h2 className="text-2xl font-semibold mb-2">Confirmar Ateste</h2>
                     <p className='text-slate-400 mb-6'>Preencha seu nome e anexe o documento assinado.</p>
                     
                     <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 flex items-start space-x-3 mb-6">
                        <CircleHelp className="w-10 h-10 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className='font-bold text-blue-300'>Precisa assinar o documento?</h3>
                            <p className="text-blue-300/90 text-sm">
                                Use o portal do gov.br para assinar seu PDF gratuitamente.
                            </p>
                             <a 
                                href="https://www.gov.br/governodigital/pt-br/identidade/assinatura-eletronica" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className='inline-flex items-center gap-2 mt-2 text-sm text-white font-semibold hover:underline'
                            >
                                Acessar Assinador GOV.BR <ExternalLink className='w-4 h-4' />
                            </a>
                        </div>
                     </div>
                     <AttestationForm token={token} />
                </div>
            </div>
       </div>
    </main>
  );
}

const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <div className='border-b border-slate-700 pb-2'>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
    </div>
);
