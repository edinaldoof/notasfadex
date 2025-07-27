'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileUp, FileText, Briefcase, Mail, User, ShieldCheck, Building, Receipt, Banknote, Check, ChevronsUpDown, Copy } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { extractNoteData } from '@/app/dashboard/notas/actions';
import { addNote, checkExistingNote } from '@/app/dashboard/actions';
import { getExistingAccountNumbers } from '@/app/dashboard/actions';
import { cn, maskCnpj, maskProjectAccount } from '@/lib/utils'; 
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const invoiceTypes = [
  { value: "SERVICO", label: "Serviço" },
  { value: "PRODUTO", label: "Produto" },
] as const;

// Regex robusto para validação de e-mail
const emailRegex = /^(?![_.-])(?!.*[_.-]{2})[a-zA-Z0-9_.-]+(?<![_.-])@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
const emailListRegex = /^$|^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(, *([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))*$/;


const addNoteFormSchema = z.object({
  invoiceType: z.enum(["PRODUTO", "SERVICO"], { required_error: 'O tipo de nota é obrigatório.' }),
  hasWithholdingTax: z.boolean().default(false),
  coordinatorName: z.string().min(3, { message: 'O nome do coordenador é obrigatório.' }),
  coordinatorEmail: z.string().regex(emailRegex, { message: 'Formato de e-mail inválido.' }),
  projectAccountNumber: z.string().min(1, 'A conta do projeto é obrigatória.'),
  ccEmails: z.string().regex(emailListRegex, { message: 'Forneça uma lista de e-mails válidos, separados por vírgula.' }).optional(),
  
  file: z.any()
    .refine((files) => files?.[0], 'O arquivo da nota é obrigatório.')
    .refine((files) => files?.[0]?.size <= 10000000, `O tamanho máximo do arquivo é 10MB.`)
    .refine(
      (files) => ['application/pdf', 'text/xml', 'image/jpeg', 'image/png'].includes(files?.[0]?.type),
      'São aceitos apenas arquivos .pdf, .xml, .jpg e .png.'
    ),
  
  descricaoServicos: z.string().min(1, 'A descrição é obrigatória.'),
  prestadorRazaoSocial: z.string().optional(),
  prestadorCnpj: z.string().optional(),
  tomadorRazaoSocial: z.string().optional(),
  tomadorCnpj: z.string().optional(),
  numeroNota: z.string().optional(),
  dataEmissao: z.string().optional(),
  valorTotal: z.string().optional(),
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
  const [existingAccounts, setExistingAccounts] = useState<string[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  
  const form = useForm<AddNoteFormValues>({
    resolver: zodResolver(addNoteFormSchema),
    defaultValues: {
        hasWithholdingTax: false,
    }
  });

  useEffect(() => {
    async function fetchAccounts() {
        if (open) {
            try {
                const accounts = await getExistingAccountNumbers();
                setExistingAccounts(accounts);
            } catch (error) {
                console.error("Failed to fetch existing accounts:", error);
            }
        }
    }
    fetchAccounts();
  }, [open]);

  const originalFileOnChange = form.register('file').onChange;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await originalFileOnChange(event);

    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setIsExtracting(true);
      try {
        const dataUri = await fileToDataURI(file);
        // We now call the server action that wraps the extraction
        const extractedData = await extractNoteData({ documentUri: dataUri });
        
        if (extractedData.type) form.setValue('invoiceType', extractedData.type);
        if (extractedData.descricaoServicos) form.setValue('descricaoServicos', extractedData.descricaoServicos);
        if (extractedData.prestadorRazaoSocial) form.setValue('prestadorRazaoSocial', extractedData.prestadorRazaoSocial);
        if (extractedData.prestadorCnpj) form.setValue('prestadorCnpj', maskCnpj(extractedData.prestadorCnpj));
        if (extractedData.tomadorRazaoSocial) form.setValue('tomadorRazaoSocial', extractedData.tomadorRazaoSocial);
        if (extractedData.tomadorCnpj) form.setValue('tomadorCnpj', maskCnpj(extractedData.tomadorCnpj));
        if (extractedData.numeroNota) form.setValue('numeroNota', extractedData.numeroNota);
        if (extractedData.dataEmissao) form.setValue('dataEmissao', extractedData.dataEmissao);
        if (extractedData.valorTotal) form.setValue('valorTotal', String(extractedData.valorTotal));
        
        toast({
          title: "Extração Concluída",
          description: `Dados extraídos. Tipo de nota identificado: ${extractedData.type || 'N/A'}. Revise os campos.`,
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Não foi possível analisar o arquivo. Por favor, preencha os dados manualmente.";
        toast({
          title: "Erro na Extração",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsExtracting(false);
      }
    }
  };


  const proceedWithSubmit = async (forceCreate = false) => {
    setIsSubmitting(true);
    const data = form.getValues();
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'file' && value?.[0]) {
        formData.append(key, value[0]);
      } else if (value !== undefined && value !== null) {
        // Desmascarar CNPJ e conta antes de enviar
        if ((key === 'prestadorCnpj' || key === 'tomadorCnpj' || key === 'projectAccountNumber') && typeof value === 'string') {
          formData.append(key, value.replace(/\D/g, ''));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    if (forceCreate) {
        formData.append('forceCreate', 'true');
    }

    try {
        const result = await addNote(formData);
        if (result.success) {
            toast({
                title: "Sucesso!",
                description: "Nota fiscal enviada para atesto.",
            });
            form.reset();
            setFileName(null);
            onOpenChange(false);
            onNoteAdded();
        } else {
             toast({
                title: "Erro ao adicionar",
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
        setShowDuplicateWarning(false);
    }
  }

  const onSubmit = async (data: AddNoteFormValues) => {
    if (data.numeroNota && data.projectAccountNumber) {
        const isDuplicate = await checkExistingNote({
            numeroNota: data.numeroNota,
            projectAccountNumber: data.projectAccountNumber,
        });

        if (isDuplicate) {
            setShowDuplicateWarning(true);
            return;
        }
    }
    await proceedWithSubmit();
  };


  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setFileName(null);
    }
    onOpenChange(isOpen);
  };
  
  const FormField = ({ id, label, icon: Icon, children, error, className }: { id: string, label: string, icon: React.ElementType, children: React.ReactNode, error?: string, className?: string }) => (
    <div className={cn('space-y-2', className)}>
        <Label htmlFor={id} className='flex items-center gap-2 text-slate-300'>
            <Icon className='w-4 h-4 text-slate-400' />
            {label}
        </Label>
        {children}
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: "prestadorCnpj" | "tomadorCnpj") => {
    const { value } = e.target;
    form.setValue(fieldName, maskCnpj(value));
  };
  
  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    form.setValue('projectAccountNumber', maskProjectAccount(value), { shouldValidate: true });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-slate-900 rounded-xl border-slate-800/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <FileUp className='w-6 h-6 text-primary' />
              Nova Nota Fiscal para Ateste
            </DialogTitle>
             <DialogDescription>
              Faça o upload do arquivo, revise os dados extraídos e envie para o coordenador responsável.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div>
                  <Label className="block text-sm font-medium text-slate-300 mb-2">1. Upload do Arquivo (PDF, XML, JPG)</Label>
                  <div className="relative border-2 border-dashed border-slate-700/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      {isExtracting ? (
                          <div className='flex flex-col items-center justify-center'>
                             <Loader2 className='w-8 h-8 text-primary animate-spin mx-auto mb-2' />
                             <p className="text-slate-400">Analisando nota...</p>
                          </div>
                      ) : (
                          <>
                           <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                           <p className="text-slate-400 mb-2">
                              {fileName ? `Arquivo: ${fileName}` : "Clique ou arraste o arquivo aqui"}
                           </p>
                           <p className="text-sm text-slate-500">Tamanho máximo de 10MB</p>
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
              
              <div className={cn("space-y-6", (isExtracting || isSubmitting) && "opacity-50 pointer-events-none")}>
                  <div>
                     <Label className="block text-sm font-medium text-slate-300 mb-2">2. Detalhes da Nota e Retenção</Label>
                     <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-lg border border-border'>
                          <FormField id='invoiceType' label='Tipo de Nota' icon={Briefcase} error={form.formState.errors.invoiceType?.message}>
                             <Controller
                                  control={form.control}
                                  name="invoiceType"
                                  render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger id='invoiceType'>
                                          <SelectValue placeholder="Selecione o tipo de nota" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {invoiceTypes.map(pt => (
                                              <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                                  )}
                              />
                          </FormField>
                          <div className='flex items-center space-x-3 bg-slate-900/50 p-3 rounded-md'>
                              <Label htmlFor="hasWithholdingTax" className="flex items-center gap-2 text-slate-300 cursor-pointer">
                                  Possui Retenção de Impostos?
                              </Label>
                               <Controller
                                  control={form.control}
                                  name="hasWithholdingTax"
                                  render={({ field }) => (
                                      <Switch
                                          id="hasWithholdingTax"
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                      />
                                  )}
                              />
                          </div>
                     </div>
                  </div>

                   <div>
                     <Label className="block text-sm font-medium text-slate-300 mb-2">3. Detalhes Financeiros do Projeto</Label>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-lg border border-border'>
                           <FormField id='projectAccountNumber' label='Conta Corrente do Projeto' icon={Banknote} error={form.formState.errors.projectAccountNumber?.message}>
                              <Controller
                                control={form.control}
                                name="projectAccountNumber"
                                render={({ field }) => (
                                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={comboboxOpen}
                                        className="w-full justify-between"
                                      >
                                        {field.value
                                          ? existingAccounts.find(
                                              (account) => account === field.value
                                            ) || field.value
                                          : "Selecione ou digite uma conta..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                      <Command>
                                        <CommandInput 
                                          placeholder="Buscar ou digitar nova conta..." 
                                          value={field.value}
                                          onValueChange={(currentValue) => form.setValue('projectAccountNumber', maskProjectAccount(currentValue))}
                                        />
                                        <CommandList>
                                          <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                                          <CommandGroup>
                                            {existingAccounts.map((account) => (
                                              <CommandItem
                                                key={account}
                                                value={account}
                                                onSelect={(currentValue) => {
                                                  form.setValue("projectAccountNumber", currentValue === field.value ? "" : currentValue, { shouldValidate: true });
                                                  setComboboxOpen(false);
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    "mr-2 h-4 w-4",
                                                    field.value === account ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                {account}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              />
                           </FormField>
                      </div>
                  </div>


                  <div>
                     <Label className="block text-sm font-medium text-slate-300 mb-2">4. Responsável pelo Ateste</Label>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-lg border border-border'>
                           <FormField id='coordinatorName' label='Nome do Coordenador' icon={User} error={form.formState.errors.coordinatorName?.message}>
                              <Input id='coordinatorName' placeholder='Nome completo' {...form.register('coordinatorName')} />
                           </FormField>
                           <FormField id='coordinatorEmail' label='E-mail do Coordenador' icon={Mail} error={form.formState.errors.coordinatorEmail?.message}>
                              <Input id='coordinatorEmail' type="email" placeholder='email@exemplo.com' {...form.register('coordinatorEmail')} />
                           </FormField>
                           <div className="md:col-span-2">
                               <FormField id='ccEmails' label='Enviar Cópia para (CC)' icon={Copy} error={form.formState.errors.ccEmails?.message}>
                                  <Input 
                                      id='ccEmails' 
                                      placeholder='email1@exemplo.com,email2@exemplo.com' 
                                      {...form.register('ccEmails')} 
                                  />
                                  <p className='text-xs text-slate-500 mt-1'>
                                      O seu e-mail será incluído automaticamente. Separe múltiplos e-mails por vírgula.
                                  </p>
                               </FormField>
                           </div>
                      </div>
                  </div>

                  <div className='bg-slate-800/30 p-4 rounded-lg border border-border space-y-4'>
                     <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <FileText className='w-4 h-4' />
                      5. Dados Extraídos da Nota (revise se necessário)
                     </p>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                           <FormField id='descricaoServicos' label='Descrição' icon={FileText} error={form.formState.errors.descricaoServicos?.message}>
                              <Input id='descricaoServicos' placeholder='Descrição dos serviços/produtos' {...form.register('descricaoServicos')} />
                           </FormField>
                            <FormField id='valorTotal' label='Valor Total (R$)' icon={Receipt}>
                              <Input id='valorTotal' placeholder='0,00' {...form.register('valorTotal')} />
                           </FormField>
                           <FormField id='numeroNota' label='Número da Nota' icon={FileText}>
                              <Input id='numeroNota' placeholder='Número' {...form.register('numeroNota')} />
                           </FormField>
                           <FormField id='dataEmissao' label='Data de Emissão (Extraída)' icon={FileText}>
                              <Input id='dataEmissao' placeholder='DD/MM/AAAA' {...form.register('dataEmissao')} />
                           </FormField>
                           <FormField id='prestadorRazaoSocial' label='Razão Social do Prestador' icon={Building}>
                              <Input id='prestadorRazaoSocial' placeholder='Nome da empresa prestadora' {...form.register('prestadorRazaoSocial')} />
                           </FormField>
                           <FormField id='prestadorCnpj' label='CNPJ do Prestador' icon={Building}>
                             <Controller
                                  control={form.control}
                                  name="prestadorCnpj"
                                  render={({ field }) => (
                                      <Input 
                                          {...field}
                                          id='prestadorCnpj' 
                                          placeholder='00.000.000/0000-00' 
                                          onChange={(e) => handleCnpjChange(e, "prestadorCnpj")}
                                      />
                                  )}
                              />
                           </FormField>
                           <FormField id='tomadorRazaoSocial' label='Razão Social do Tomador' icon={Building}>
                              <Input id='tomadorRazaoSocial' placeholder='Sua empresa' {...form.register('tomadorRazaoSocial')} />
                           </FormField>
                           <FormField id='tomadorCnpj' label='CNPJ do Tomador' icon={Building}>
                               <Controller
                                  control={form.control}
                                  name="tomadorCnpj"
                                  render={({ field }) => (
                                      <Input 
                                          {...field}
                                          id='tomadorCnpj' 
                                          placeholder='00.000.000/0000-00' 
                                          onChange={(e) => handleCnpjChange(e, "tomadorCnpj")}
                                      />
                                  )}
                              />
                           </FormField>
                      </div>
                  </div>
              </div>

              <Separator />
              
              <div className="flex justify-end space-x-4 pt-4">
                  <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      disabled={isSubmitting || isExtracting}
                  >
                      Cancelar
                  </Button>
                  <Button
                      type="submit"
                      className="flex items-center gap-2"
                      disabled={isSubmitting || isExtracting || !session}
                  >
                      {(isSubmitting || isExtracting) ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                      {isSubmitting ? 'Enviando...' : isExtracting ? 'Analisando...' : 'Enviar para Ateste'}
                  </Button>
              </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Nota Fiscal Duplicada</AlertDialogTitle>
                <AlertDialogDescription>
                    Já existe uma nota fiscal com o mesmo número para esta conta de projeto. 
                    Tem certeza de que deseja adicionar esta nota mesmo assim?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsSubmitting(false)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => proceedWithSubmit(true)}>
                    Sim, Continuar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
