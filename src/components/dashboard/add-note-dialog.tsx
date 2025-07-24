
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Calendar as CalendarIcon } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addNote } from '@/app/dashboard/notas/actions';
import { extractNoteData } from '@/ai/flows/extract-note-data-flow';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const addNoteFormSchema = z.object({
  prestadorRazaoSocial: z.string().optional(),
  prestadorCnpj: z.string().optional(),
  tomadorRazaoSocial: z.string().optional(),
  tomadorCnpj: z.string().optional(),
  numeroNota: z.string().optional(),
  dataEmissao: z.string().optional(),
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

const fileToDataURI = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
};


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

  const originalFileOnChange = form.register('file').onChange;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await originalFileOnChange(event);

    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setIsExtracting(true);
      try {
        const dataUri = await fileToDataURI(file);
        const extractedData = await extractNoteData({ documentUri: dataUri });
        
        if (extractedData.prestadorRazaoSocial) form.setValue('prestadorRazaoSocial', extractedData.prestadorRazaoSocial);
        if (extractedData.prestadorCnpj) form.setValue('prestadorCnpj', extractedData.prestadorCnpj);
        if (extractedData.tomadorRazaoSocial) form.setValue('tomadorRazaoSocial', extractedData.tomadorRazaoSocial);
        if (extractedData.tomadorCnpj) form.setValue('tomadorCnpj', extractedData.tomadorCnpj);
        if (extractedData.numeroNota) form.setValue('numeroNota', extractedData.numeroNota);
        if (extractedData.dataEmissao) form.setValue('dataEmissao', extractedData.dataEmissao);
        if (extractedData.valorTotal) form.setValue('valorTotal', String(extractedData.valorTotal));
        if (extractedData.descricaoServicos) form.setValue('descricaoServicos', extractedData.descricaoServicos);
        
        toast({
          title: "Extração Concluída",
          description: "Os dados da nota foram preenchidos.",
          variant: "default",
        });

      } catch (error) {
        console.error("Error extracting data:", error);
        toast({
          title: "Erro na Extração",
          description: "Não foi possível extrair os dados da nota. Por favor, preencha manualmente.",
          variant: "destructive",
        });
      } finally {
        setIsExtracting(false);
      }
    }
  };


  const onSubmit = async (data: AddNoteFormValues) => {
    if (!session?.user) {
      toast({
        title: "Erro de Autenticação",
        description: "Sua sessão não foi encontrada. Por favor, faça login novamente.",
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData();

    // Format date to ISO string for server action
    const submittedData = {
        ...data,
        issueDate: data.issueDate.toISOString(),
    }

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
            toast({
                title: "Sucesso!",
                description: "Nota fiscal adicionada.",
            });
            form.reset();
            setFileName(null);
            onOpenChange(false);
            onNoteAdded();
        } else {
             toast({
                title: "Erro",
                description: result.message || "Não foi possível adicionar a nota.",
                variant: 'destructive'
            });
        }
    } catch(error) {
         toast({
            title: "Erro no Servidor",
            description: "Ocorreu um erro inesperado. Tente novamente mais tarde.",
            variant: 'destructive'
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({
        descricaoServicos: "",
        issueDate: new Date(),
        prestadorRazaoSocial: '',
        prestadorCnpj: '',
        tomadorRazaoSocial: '',
        tomadorCnpj: '',
        numeroNota: '',
        dataEmissao: '',
        valorTotal: undefined,
        file: undefined,
      });
      setFileName(null);
    }
    onOpenChange(isOpen);
  };

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
                            {...form.register('file')}
                            onChange={handleFileChange}
                            disabled={isExtracting || isSubmitting}
                         />
                        </>
                    )}
                </div>
                 {form.formState.errors.file && <p className="text-xs text-red-400 mt-1">{form.formState.errors.file.message as string}</p>}
            </div>

            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", (isExtracting || isSubmitting) && "opacity-50 pointer-events-none")}>
                <div>
                    <Label htmlFor="descricaoServicos" className="block text-sm font-medium text-slate-300 mb-2">Descrição dos Serviços</Label>
                    <Input
                        id="descricaoServicos"
                        type="text"
                        placeholder="Ex: Consultoria em TI"
                        className={inputStyles}
                        {...form.register('descricaoServicos')}
                    />
                    {form.formState.errors.descricaoServicos && <p className="text-xs text-red-400 mt-1">{form.formState.errors.descricaoServicos.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="numeroNota" className="block text-sm font-medium text-slate-300 mb-2">Número da Nota</Label>
                    <Input
                        id="numeroNota"
                        type="text"
                        placeholder="Nº da nota fiscal"
                        className={inputStyles}
                         {...form.register('numeroNota')}
                    />
                </div>
                <div>
                    <Label htmlFor="prestadorRazaoSocial" className="block text-sm font-medium text-slate-300 mb-2">Razão Social do Prestador</Label>
                    <Input
                        id="prestadorRazaoSocial"
                        type="text"
                        placeholder="Nome da empresa prestadora"
                        className={inputStyles}
                         {...form.register('prestadorRazaoSocial')}
                    />
                </div>
                <div>
                    <Label htmlFor="prestadorCnpj" className="block text-sm font-medium text-slate-300 mb-2">CNPJ do Prestador</Label>
                    <Input
                        id="prestadorCnpj"
                        type="text"
                        placeholder="CNPJ da empresa prestadora"
                        className={inputStyles}
                         {...form.register('prestadorCnpj')}
                    />
                </div>
                 <div>
                    <Label htmlFor="tomadorRazaoSocial" className="block text-sm font-medium text-slate-300 mb-2">Razão Social do Tomador</Label>
                    <Input
                        id="tomadorRazaoSocial"
                        type="text"
                        placeholder="Nome da empresa tomadora"
                        className={inputStyles}
                         {...form.register('tomadorRazaoSocial')}
                    />
                </div>
                <div>
                    <Label htmlFor="tomadorCnpj" className="block text-sm font-medium text-slate-300 mb-2">CNPJ do Tomador</Label>
                    <Input
                        id="tomadorCnpj"
                        type="text"
                        placeholder="CNPJ da empresa tomadora"
                        className={inputStyles}
                         {...form.register('tomadorCnpj')}
                    />
                </div>
                
                 <div>
                    <Label htmlFor="dataEmissao" className="block text-sm font-medium text-slate-300 mb-2">Data de Emissão (Extraída)</Label>
                    <Input
                        id="dataEmissao"
                        type="text"
                        className={cn(inputStyles, "bg-slate-800/50 cursor-not-allowed")}
                         {...form.register('dataEmissao')}
                         readOnly
                    />
                </div>
                <div>
                    <Label htmlFor="valorTotal" className="block text-sm font-medium text-slate-300 mb-2">Valor Total (R$)</Label>
                    <Input
                        id="valorTotal"
                        type="text"
                        placeholder="0,00"
                        className={inputStyles}
                        {...form.register('valorTotal')}
                    />
                </div>

                <hr className="md:col-span-2 border-slate-700/50"/>

                 <div className="md:col-span-2">
                    <p className='text-sm text-slate-400 mb-4'>Preencha os campos abaixo para controle interno.</p>
                </div>
                
                 <div className="md:col-span-2">
                    <Label htmlFor="issueDate" className="block text-sm font-medium text-slate-300 mb-2">Data do Envio para Atesto</Label>
                    <Controller
                        control={form.control}
                        name="issueDate"
                        render={({ field }) => (
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-slate-800/80 border-slate-700/50 hover:bg-slate-800 hover:text-white",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                    locale={ptBR}
                                />
                                </PopoverContent>
                            </Popover>
                        )}
                    />
                     {form.formState.errors.issueDate && <p className="text-xs text-red-400 mt-1">{form.formState.errors.issueDate.message}</p>}
                </div>
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
