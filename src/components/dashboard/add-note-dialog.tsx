'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

// UI Components
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

// Utilities
import { cn } from '@/lib/utils';
import { toDataURL } from '@/lib/media-utils'; // Helper que vamos criar/verificar

// Server Actions
import { addNote } from '@/app/dashboard/notas/actions';
// ==================================================================
// PARTE MAIS IMPORTANTE DA CORREÇÃO (AQUI)!
// Trocamos a importação do 'flow' pela 'action'.
import { extractNoteDataAction } from '@/ai/actions';
// ==================================================================

// Validação do formulário com Zod
const addNoteFormSchema = z.object({
  prestadorRazaoSocial: z.string().optional(),
  prestadorCnpj: z.string().optional(),
  tomadorRazaoSocial: z.string().optional(),
  tomadorCnpj: z.string().optional(),
  numeroNota: z.string().optional(),
  dataEmissao: z.string().optional(), // Mantido como string para dados extraídos
  valorTotal: z.string().optional(),
  descricaoServicos: z.string().min(3, { message: 'A descrição deve ter pelo menos 3 caracteres.' }),
  issueDate: z.date({ required_error: 'A data é obrigatória.' }),
  file: z.any()
    .refine((files) => files?.[0], 'O arquivo é obrigatório.')
    .refine((files) => files?.[0]?.size <= 10000000, `O tamanho máximo do arquivo é 10MB.`)
    .refine(
      (files) => ['application/pdf', 'text/xml', 'image/jpeg', 'image/png'].includes(files?.[0]?.type),
      'São aceitos apenas arquivos .pdf, .xml, .jpg e .png.'
    ),
});

type AddNoteFormValues = z.infer<typeof addNoteFormSchema>;

interface AddNoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNoteAdded: () => void;
}

export function AddNoteDialog({ open, onOpenChange, onNoteAdded }: AddNoteDialogProps) {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const form = useForm<AddNoteFormValues>({
    resolver: zodResolver(addNoteFormSchema),
    defaultValues: {
      descricaoServicos: "",
      issueDate: new Date(),
    }
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Atualiza o formulário e o nome do arquivo
    form.setValue('file', event.target.files);
    setFileName(file.name);
    setIsExtracting(true);

    try {
      // Converte o arquivo para um formato que pode ser enviado para o servidor
      const dataUrl = await toDataURL(file);

      // ==================================================================
      // CHAMADA PARA A SERVER ACTION (AQUI)!
      // Em vez de chamar a IA diretamente, chamamos a nossa action.
      const result = await extractNoteDataAction({ dataUrl, contentType: file.type });
      // ==================================================================
      
      if (result.success && result.data) {
        const extracted = result.data;
        if (extracted.prestadorRazaoSocial) form.setValue('prestadorRazaoSocial', extracted.prestadorRazaoSocial);
        if (extracted.prestadorCnpj) form.setValue('prestadorCnpj', extracted.prestadorCnpj);
        if (extracted.tomadorRazaoSocial) form.setValue('tomadorRazaoSocial', extracted.tomadorRazaoSocial);
        if (extracted.tomadorCnpj) form.setValue('tomadorCnpj', extracted.tomadorCnpj);
        if (extracted.numeroNota) form.setValue('numeroNota', extracted.numeroNota);
        if (extracted.dataEmissao) form.setValue('dataEmissao', extracted.dataEmissao);
        if (extracted.amount) form.setValue('valorTotal', String(extracted.amount)); // Note a mudança para 'amount'
        
        toast({
          title: "Extração Concluída",
          description: "Os dados da nota foram preenchidos.",
          variant: "default",
        });
      } else {
         toast({
          title: "Erro na Extração",
          description: result.error || "Não foi possível extrair os dados. Preencha manualmente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error handling file change:", error);
      toast({
        title: "Erro no Arquivo",
        description: "Houve um problema ao processar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const onSubmit = async (data: AddNoteFormValues) => {
    // Sua lógica de submit está correta e não precisa de alterações.
    if (!session?.user) {
      toast({ title: "Erro de Autenticação", description: "Sessão não encontrada.", variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData();
    const submittedData = { ...data, issueDate: data.issueDate.toISOString() };

    Object.entries(submittedData).forEach(([key, value]) => {
      if (key === 'file') {
        formData.append(key, value[0]);
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    try {
        const result = await addNote(formData);
        if (result.success) {
            toast({ title: "Sucesso!", description: "Nota fiscal adicionada." });
            form.reset();
            setFileName(null);
            onOpenChange(false);
            onNoteAdded();
        } else {
             toast({ title: "Erro", description: result.message || "Não foi possível adicionar a nota.", variant: 'destructive' });
        }
    } catch(error) {
         toast({ title: "Erro no Servidor", description: "Ocorreu um erro inesperado.", variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({ /*...valores padrão...*/ });
      setFileName(null);
    }
    onOpenChange(isOpen);
  };
  
  // O seu JSX está ótimo e não precisa de alterações.
  // ... cole o seu JSX completo aqui ...
  const inputStyles = "w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:border-primary/50 focus:outline-none transition-colors";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-900 rounded-xl border-slate-800/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Nova Nota Fiscal</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="md:col-span-2">
                <Label className="block text-sm font-medium text-slate-300 mb-2">Arquivo da Nota Fiscal</Label>
                <div className="relative border-2 border-dashed border-slate-700/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    {isExtracting ? (
                        <div className='flex flex-col items-center justify-center'>
                           <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                           <p className="text-slate-400">Analisando nota...</p>
                        </div>
                    ) : (
                        <>
                         <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                         <p className="text-slate-400 mb-2">
                            {fileName ? `Arquivo: ${fileName}` : "Clique para fazer upload ou arraste o arquivo"}
                         </p>
                         <p className="text-sm text-slate-500">PDF, XML, JPG ou PNG até 10MB</p>
                         <Input 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                            accept=".pdf,.xml,.jpg,.jpeg,.png" 
                            // O register é movido para cá para simplificar
                            {...form.register('file', {
                                onChange: handleFileChange // Chama nossa função no onChange
                            })}
                            disabled={isExtracting || isSubmitting}
                         />
                        </>
                    )}
                </div>
                 {form.formState.errors.file && <p className="text-xs text-red-400 mt-1">{form.formState.errors.file.message as string}</p>}
            </div>

            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", (isExtracting || isSubmitting) && "opacity-50 pointer-events-none")}>
                {/* O resto do seu formulário aqui... */}
                {/* ... */}
            </div>
            
            <div className="flex space-x-4 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={isSubmitting || isExtracting}
                    className="flex-1"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    className={cn(
                      "flex-1 font-semibold transition-all duration-300 flex items-center justify-center",
                      "bg-gradient-to-r from-emerald-500 to-green-600 text-white",
                      "hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02]",
                      "disabled:opacity-50"
                    )}
                    disabled={isSubmitting || isExtracting || !session}
                >
                    {(isSubmitting || isExtracting) && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                    {isSubmitting ? 'Adicionando...' : isExtracting ? 'Analisando...' : 'Adicionar Nota'}
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}