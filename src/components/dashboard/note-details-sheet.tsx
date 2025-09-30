
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { FiscalNote, HistoryType } from '@/lib/types';
import { FileText, Stamp, PlusCircle, Undo2, Edit, User, Calendar, BadgeInfo, Hash, CircleDollarSign, Building, Mail, Banknote, FileType, Percent, Copy, Download, MessageSquare, FileSignature, Paperclip, Trash2, Undo as UndoIcon } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';

interface NoteDetailsSheetProps {
  note: FiscalNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getEventTypeConfig = (type: HistoryType) => {
    switch(type) {
        case 'CREATED':
            return { icon: PlusCircle, color: 'text-blue-400', title: 'Nota Criada' };
        case 'ATTESTED':
            return { icon: Stamp, color: 'text-green-400', title: 'Nota Atestada' };
        case 'REVERTED':
            return { icon: Undo2, color: 'text-amber-400', title: 'Atesto Desfeito' };
        case 'EDITED':
            return { icon: Edit, color: 'text-purple-400', title: 'Nota Editada' };
        case 'DELETED':
             return { icon: Trash2, color: 'text-slate-400', title: 'Movida para Lixeira' };
        case 'RESTORED':
             return { icon: UndoIcon, color: 'text-lime-400', title: 'Nota Restaurada' };
        default:
            return { icon: FileText, color: 'text-gray-400', title: 'Evento' };
    }
}

const formatTimelineDateTime = (date: Date) => {
    return new Date(date).toLocaleString('pt-BR', { timeZone: 'UTC' });
}

const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};


const DetailItem = ({ icon: Icon, label, value, fullWidth = false, children }: { icon: React.ElementType, label: string, value?: string | number | null | boolean, fullWidth?: boolean, children?: React.ReactNode }) => {
  if (!children && (value === null || value === undefined || value === '')) return null;
  
  const displayValue = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value;

  return (
    <div className={`flex items-start ${fullWidth ? 'col-span-2' : ''}`}>
      <Icon className="w-4 h-4 text-slate-400 mt-1 mr-3 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        {children ? (
          <div className="text-sm font-medium text-white break-words">{children}</div>
        ) : (
          <p className="text-sm font-medium text-white break-words">{String(displayValue)}</p>
        )}
      </div>
    </div>
  );
};


export function NoteDetailsSheet({ note, open, onOpenChange }: NoteDetailsSheetProps) {
  if (!note) return null;

  const sortedHistory = note.history ? [...note.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md sm:max-w-lg bg-slate-950/95 backdrop-blur-sm border-slate-800 text-white overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold flex items-center gap-3">
             <FileText className="w-8 h-8 text-primary" />
             Detalhes da Nota Fiscal
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            {note.projectTitle}
          </SheetDescription>
        </SheetHeader>
        
        <div className='space-y-8'>
            <div>
                <h3 className='text-lg font-semibold mb-4 text-slate-300'>Informações do Documento</h3>
                <div className='grid grid-cols-2 gap-x-4 gap-y-6 bg-slate-900/50 p-4 rounded-xl border border-border'>
                    <DetailItem icon={BadgeInfo} label="Status" value={note.status} />
                    <DetailItem icon={Hash} label="Nº da Nota" value={note.numeroNota} />
                    <DetailItem icon={FileType} label="Tipo de Nota" value={note.invoiceType} />
                    <DetailItem icon={Calendar} label="Data de Emissão (Extraída)" value={note.dataEmissao} />
                    <DetailItem icon={CircleDollarSign} label="Valor Total" value={formatCurrency(note.amount)} />
                    <DetailItem icon={Percent} label="Possui Retenção" value={note.hasWithholdingTax} />
                    <DetailItem icon={Download} label="Arquivo Original" fullWidth>
                        <Button asChild variant="link" className="p-0 h-auto text-sm text-primary hover:underline">
                            <a href={note.originalFileUrl} target="_blank" rel="noopener noreferrer">
                                Baixar {note.fileName}
                            </a>
                        </Button>
                    </DetailItem>
                    {note.reportFileUrl && (
                      <DetailItem icon={Paperclip} label="Relatório Anexo" fullWidth>
                          <Button asChild variant="link" className="p-0 h-auto text-sm text-primary hover:underline">
                              <a href={note.reportFileUrl} target="_blank" rel="noopener noreferrer">
                                  Baixar {note.reportFileName}
                              </a>
                          </Button>
                      </DetailItem>
                    )}
                    <DetailItem icon={FileText} label="Descrição dos Serviços" value={note.description} fullWidth />
                </div>
            </div>
            
            <div>
                <h3 className='text-lg font-semibold mb-4 text-slate-300'>Informações do Prestador</h3>
                <div className='grid grid-cols-2 gap-x-4 gap-y-6 bg-slate-900/50 p-4 rounded-xl border border-border'>
                    <DetailItem icon={Building} label="Razão Social" value={note.prestadorRazaoSocial} fullWidth/>
                    <DetailItem icon={Copy} label="CNPJ" value={note.prestadorCnpj} fullWidth/>
                </div>
            </div>

            <div>
                <h3 className='text-lg font-semibold mb-4 text-slate-300'>Informações do Tomador</h3>
                <div className='grid grid-cols-2 gap-x-4 gap-y-6 bg-slate-900/50 p-4 rounded-xl border border-border'>
                    <DetailItem icon={Building} label="Razão Social" value={note.tomadorRazaoSocial} fullWidth/>
                    <DetailItem icon={Copy} label="CNPJ" value={note.tomadorCnpj} fullWidth/>
                </div>
            </div>
            
            <div>
                <h3 className='text-lg font-semibold mb-4 text-slate-300'>Responsáveis e Projeto</h3>
                <div className='grid grid-cols-2 gap-x-4 gap-y-6 bg-slate-900/50 p-4 rounded-xl border border-border'>
                    <DetailItem icon={User} label="Analista" value={note.requester} />
                    <DetailItem icon={Calendar} label="Data de Envio" value={new Date(note.issueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} />
                    <DetailItem icon={FileSignature} label="Título do Projeto" value={note.projectTitle} />
                    <DetailItem icon={Banknote} label="Conta do Projeto" value={note.projectAccountNumber} />
                    <DetailItem icon={User} label="Coordenador (Ateste)" value={note.coordinatorName} fullWidth />
                    <DetailItem icon={Mail} label="E-mail do Coordenador" value={note.coordinatorEmail} fullWidth />
                </div>
            </div>

            {note.status === 'ATESTADA' && (
               <div>
                <h3 className='text-lg font-semibold mb-4 text-slate-300'>Informações do Ateste</h3>
                <div className='grid grid-cols-2 gap-x-4 gap-y-6 bg-slate-900/50 p-4 rounded-xl border border-border'>
                    <DetailItem icon={User} label="Atestado por" value={note.attestedBy} />
                    <DetailItem icon={Calendar} label="Data do Ateste" value={note.attestedAt ? new Date(note.attestedAt).toLocaleString('pt-BR', { timeZone: 'UTC' }) : '-'} />
                    <DetailItem icon={MessageSquare} label="Observação" value={note.observation} fullWidth />
                    <DetailItem icon={Download} label="Arquivo de Atesto" fullWidth>
                        {note.attestedFileUrl ? (
                            <Button asChild variant="link" className="p-0 h-auto text-sm text-primary hover:underline">
                                <a href={note.attestedFileUrl} target="_blank" rel="noopener noreferrer">
                                    Baixar arquivo anexado
                                </a>
                            </Button>
                        ) : (
                            <p className="text-sm font-medium text-slate-500">Nenhum arquivo anexado</p>
                        )}
                    </DetailItem>
                </div>
            </div>
            )}

            <Separator className="bg-border" />
            
            <div>
                <h3 className='text-lg font-semibold mb-4 text-slate-300'>Linha do Tempo da Nota</h3>
                {sortedHistory.length > 0 ? (
                    <div className="space-y-8 pl-4 border-l-2 border-border ml-3">
                         {sortedHistory.map((event, index) => {
                            const config = getEventTypeConfig(event.type);
                            const Icon = config.icon;
                            return (
                                <div key={index} className="relative flex items-start">
                                    <div className={`absolute -left-[23px] mt-1.5 flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border-2 ${config.color.replace('text-', 'border-')}`}>
                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                    </div>
                                    <div className="ml-8 w-full">
                                        <p className="font-bold text-white">{config.title}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {formatTimelineDateTime(new Date(event.date))}
                                        </p>
                                        <p className="text-sm text-slate-300 mt-2">
                                            {event.details}
                                        </p>
                                        <div className="flex items-center space-x-2 text-xs text-slate-500 mt-2">
                                            <User className="w-3 h-3"/>
                                            <span>{event.userName || "Sistema"}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-border">
                        <p className="text-slate-400">Nenhum evento registrado para esta nota.</p>
                    </div>
                )}
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
