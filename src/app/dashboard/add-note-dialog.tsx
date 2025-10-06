'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../../../components/ui/form";
import { ScrollArea } from "../../../../components/ui/scroll-area";


import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Loader2, Upload, FileUp, FileText, Briefcase, Mail, User, ShieldCheck, Building, Receipt, Banknote, Check, ChevronsUpDown, Copy, FileSignature, Paperclip, PlusCircle, Star } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../../../../hooks/use-toast';
import { extractNoteData } from '@/app/dashboard/notas/actions';
import { addNote } from '@/app/dashboard/notas/actions';
import { checkExistingNote } from '@/app/dashboard/notas/actions';
import { getProjectAccounts, getProjectDetails } from '@/app/dashboard/actions';
import { cn, maskCnpj, parseBRLMoneyToFloat } from '../../../lib/utils';
import { Button } from '../../../../components/ui/button';
import { useSession } from 'next-auth/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Switch } from '../../../../components/ui/switch';
import { Separator } from '../../../../components/ui/separator';
import type { Coordinator } from '../../../lib/types';

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
  projectTitle: z.string().min(1, 'O título do projeto é obrigatório.'),
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
  
  reportFile: z.any().optional(),

  description: z.string().min(1, 'A descrição é obrigatória.'),
  providerName: z.string().optional(),
  providerDocument: z.string().optional(),
  clientName: z.string().optional(),
  clientDocument: z.string().optional(),
  noteNumber: z.string().optional(),
  issuedAt: z.string().optional(),
  totalValue: z.string().optional(),
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
  const [isFetchingDetails, startFetchingDetailsTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const [projectAccounts, setProjectAccounts] = useState<{ label: string; value: string }[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  const form = useForm<AddNoteFormValues>({
    resolver: zodResolver(addNoteFormSchema),
    defaultValues: {
      invoiceType: "SERVICO",
      hasWithholdingTax: false,
      projectTitle: "",
      coordinatorName: "",
      coordinatorEmail: "",
      projectAccountNumber: "",
      ccEmails: "",
      file: undefined,
      reportFile: undefined,
      description: "",
      providerName: "",
      providerDocument: "",
      clientName: "",
      clientDocument: "",
      noteNumber: "",
      issuedAt: "",
      totalValue: "",
    }
  });

  const formatCurrencyForDisplay = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '';
  
    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  
    let digitsOnly = String(value).replace(/\D/g, '');
    if (!digitsOnly) return '';
  
    digitsOnly = digitsOnly.padStart(3, '0');
    
    let formattedValue = digitsOnly.slice(0, -2) + ',' + digitsOnly.slice(-2);
    
    if (formattedValue.length > 6) {
        formattedValue = formattedValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
  
    return formattedValue;
  }

  const handleValorTotalBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyForDisplay(e.target.value);
    form.setValue('totalValue', formatted, { shouldValidate: true });
  }

  useEffect(() => {
    async function fetchAccounts() {
        if (open) {
            try {
                const accounts = await getProjectAccounts();
                setProjectAccounts(accounts);
            } catch (error) {
                console.error("Failed to fetch project accounts:", error);
                toast({
                    title: "Erro ao buscar contas",
                    description: "Não foi possível carregar as contas de projeto. Usando dados locais.",
                    variant: "destructive",
                });
            }
        }
    }
    fetchAccounts();
  }, [open, toast]);

  const proceedWithSubmit = async (forceCreate = false) => {
    setIsSubmitting(true);
    const data = form.getValues();
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'file' && value?.[0]) {
        formData.append(key, value[0]);
      } else if (key === 'reportFile' && value?.[0]) {
        formData.append('reportFile', value[0]);
      } else if (value !== undefined && value !== null) {
        if ((key === 'providerDocument' || key === 'clientDocument') && typeof value === 'string') {
          formData.append(key, value.replace(/\D/g, ''));
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    formData.set('totalValue', String(parseBRLMoneyToFloat(data.totalValue)));

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
            setReportFileName(null);
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
    setIsSubmitting(true);
    if (data.noteNumber && data.projectAccountNumber) {
        const isDuplicate = await checkExistingNote({
            noteNumber: data.noteNumber,
            projectAccountNumber: data.projectAccountNumber,
        });

        if (isDuplicate) {
            setShowDuplicateWarning(true);
            setIsSubmitting(false); // Stop submission until user confirms
            return;
        }
    }
    await proceedWithSubmit();
  };

  const handleAccountSelect = (accountValue: string) => {
    form.setValue("projectAccountNumber", accountValue, { shouldValidate: true });
    setComboboxOpen(false);
    startFetchingDetailsTransition(async () => {
        try {
            const details = await getProjectDetails(accountValue);
            if (details) {
                form.setValue("projectTitle", details.projectTitle || '');
                setCoordinators(details.coordinators || []);
                toast({
                    title: "Detalhes do Projeto Carregados",
                    description: `Título e ${details.coordinators.length} coordenador(es) foram encontrados.`,
                });
            } else {
              setCoordinators([]);
            }
        } catch (error) {
            console.error("Failed to fetch project details:", error);
            toast({
                title: "Erro ao buscar Detalhes",
                description: "Não foi possível buscar os detalhes do projeto para esta conta.",
                variant: "destructive",
            });
        }
    });
  }

  const handleCoordinatorSelect = (coordinatorEmail: string) => {
    const selectedCoordinator = coordinators.find(c => c.email === coordinatorEmail);
    if (selectedCoordinator) {
      form.setValue('coordinatorName', selectedCoordinator.name);
      form.setValue('coordinatorEmail', selectedCoordinator.email);
    }
  }


  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setFileName(null);
      setReportFileName(null);
      setCoordinators([]);
    }
    onOpenChange(isOpen);
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-slate-900 rounded-xl border-slate-800/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <FileUp className='w-6 h-6 text-primary' />
              Nova Nota Fiscal para Atesto
            </DialogTitle>
             <DialogDescription>
              Faça o upload do arquivo, revise os dados extraídos e envie para o coordenador responsável.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="file"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-slate-300 mb-2">1. Upload do Arquivo (PDF, XML, JPG)</FormLabel>
                      <FormControl>
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
                                      onChange={async (e) => {
                                        field.onChange(e.target.files);
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setFileName(file.name);
                                          setIsExtracting(true);
                                          try {
                                            const dataUri = await fileToDataURI(file);
                                            const extractedData = await extractNoteData({ documentUri: dataUri });
                                            
                                            if (extractedData.type) form.setValue('invoiceType', extractedData.type);
                                            if (extractedData.description) form.setValue('description', extractedData.description);
                                            if (extractedData.providerName) form.setValue('providerName', extractedData.providerName);
                                            if (extractedData.providerDocument) form.setValue('providerDocument', maskCnpj(extractedData.providerDocument));
                                            if (extractedData.clientName) form.setValue('clientName', extractedData.clientName);
                                            if (extractedData.clientDocument) form.setValue('clientDocument', maskCnpj(extractedData.clientDocument));
                                            if (extractedData.noteNumber) form.setValue('noteNumber', extractedData.noteNumber);
                                            if (extractedData.issuedAt) form.setValue('issuedAt', extractedData.issuedAt);
                                            if (extractedData.totalValue) {
                                              form.setValue('totalValue', formatCurrencyForDisplay(extractedData.totalValue));
                                            }
                                            
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
                                      }}
                                      disabled={isExtracting || isSubmitting}
                                   />
                                  </>
                              )}
                          </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
              <div className={cn("space-y-6", (isExtracting || isSubmitting) && "opacity-50 pointer-events-none")}>
                  <div>
                     <Label className="block text-sm font-medium text-slate-300 mb-2">2. Detalhes da Nota e Retenção</Label>
                     <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-lg border border-border'>
                          <FormField
                            control={form.control}
                            name="invoiceType"
                            render={({ field }) => (
                               <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><Briefcase className='w-4 h-4 text-slate-400' />Tipo de Nota</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger id='invoiceType'>
                                            <SelectValue placeholder="Selecione o tipo de nota" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {invoiceTypes.map(pt => (
                                            <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                               </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="hasWithholdingTax"
                            render={({ field }) => (
                              <FormItem className='flex items-center justify-between space-x-3 bg-slate-900/50 p-3 rounded-md h-full'>
                                <FormLabel className="flex items-center gap-2 text-slate-300 cursor-pointer mb-0">
                                    Possui Retenção de Impostos?
                                </FormLabel>
                                <FormControl>
                                  <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                     </div>
                  </div>

                   <div>
                     <Label className="block text-sm font-medium text-slate-300 mb-2">3. Detalhes Financeiros do Projeto</Label>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-lg border border-border'>
                           <FormField
                            control={form.control}
                            name="projectAccountNumber"
                            render={({ field }) => {
                              const filteredAccounts = searchValue
                                ? projectAccounts.filter(account => 
                                    account.label.toLowerCase().includes(searchValue.toLowerCase())
                                  )
                                : projectAccounts;

                              return (
                                <FormItem className="flex flex-col">
                                  <FormLabel className='flex items-center gap-2 text-slate-300'><Banknote className='w-4 h-4 text-slate-400' />Conta Corrente do Projeto</FormLabel>
                                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                      <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                              "w-full justify-between",
                                              !field.value && "text-muted-foreground"
                                            )}
                                          >
                                            {field.value
                                              ? projectAccounts.find(
                                                  (account) => account.value === field.value
                                                )?.label
                                              : "Selecione a conta..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                          <CommandInput
                                            placeholder="Buscar conta..."
                                            value={searchValue}
                                            onValueChange={setSearchValue}
                                          />
                                          <CommandList>
                                            <ScrollArea className="h-72">
                                              <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                                              <CommandGroup>
                                                {filteredAccounts.map((account) => (
                                                  <CommandItem
                                                    value={account.label}
                                                    key={account.value}
                                                    onSelect={() => {
                                                      handleAccountSelect(account.value);
                                                      setSearchValue("");
                                                    }}
                                                  >
                                                    <Check
                                                      className={cn(
                                                        "mr-2 h-4 w-4",
                                                        account.value === field.value
                                                          ? "opacity-100"
                                                          : "opacity-0"
                                                      )}
                                                    />
                                                    {account.label}
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            </ScrollArea>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                           <FormField
                            control={form.control}
                            name="projectTitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><FileSignature className='w-4 h-4 text-slate-400' />Título do Projeto</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input placeholder='Selecione uma conta para carregar' {...field} disabled={isFetchingDetails} />
                                    {isFetchingDetails && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      </div>
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-slate-300 mb-2">4. Responsável pelo Atesto</Label>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-lg border border-border'>
                        <FormItem>
                            <FormLabel className='flex items-center gap-2 text-slate-300'><User className='w-4 h-4 text-slate-400' />Coordenador Responsável</FormLabel>
                             <Select onValueChange={handleCoordinatorSelect} disabled={isFetchingDetails || coordinators.length === 0}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={coordinators.length > 0 ? "Selecione um coordenador" : "Selecione uma conta primeiro"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {coordinators.filter(c => c.email).map(c => (
                                        <SelectItem key={c.email || c.name} value={c.email!}>
                                            <div className='flex items-center gap-2'>
                                                {c.isGeneral && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                                                <span>{c.name.toUpperCase()}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormItem>
                        
                         <FormField
                            control={form.control}
                            name="coordinatorName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'>Nome do Coordenador</FormLabel>
                                <FormControl>
                                <Input placeholder='Nome completo' {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="coordinatorEmail"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><Mail className='w-4 h-4 text-slate-400' />E-mail do Coordenador</FormLabel>
                                <FormControl>
                                <Input placeholder='email@exemplo.com' {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        
                        <div className="md:col-span-2">
                            <FormField
                                control={form.control}
                                name="ccEmails"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='flex items-center gap-2 text-slate-300'><Copy className='w-4 h-4 text-slate-400' />Enviar Cópia para (CC)</FormLabel>
                                    <FormControl>
                                    <Input placeholder='email1@exemplo.com,email2@exemplo.com' {...field} />
                                    </FormControl>
                                    <FormDescription>
                                    O seu e-mail será incluído automaticamente. Separe múltiplos e-mails por vírgula.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                  <div className='bg-slate-800/30 p-4 rounded-lg border border-border space-y-4'>
                     <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <FileText className='w-4 h-4' />
                      5. Dados Extraídos da Nota (revise se necessário)
                     </p>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><FileText className='w-4 h-4 text-slate-400' />Descrição</FormLabel>
                                <FormControl>
                                  <Input placeholder='Descrição dos serviços/produtos' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="totalValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><Banknote className='w-4 h-4 text-slate-400' />Valor Total (R$)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder='0,00' 
                                    {...field}
                                    onBlur={handleValorTotalBlur}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="noteNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><Receipt className='w-4 h-4 text-slate-400' />Número da Nota</FormLabel>
                                <FormControl>
                                  <Input placeholder='Número' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="issuedAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><Briefcase className='w-4 h-4 text-slate-400' />Data de Emissão (Extraída)</FormLabel>
                                <FormControl>
                                  <Input placeholder='DD/MM/AAAA' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="providerName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><Building className='w-4 h-4 text-slate-400' />Razão Social do Prestador</FormLabel>
                                <FormControl>
                                  <Input placeholder='Nome da empresa prestadora' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="providerDocument"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><Copy className='w-4 h-4 text-slate-400' />CNPJ do Prestador</FormLabel>
                                <FormControl>
                                  <Input placeholder='00.000.000/0000-00' {...field} onChange={(e) => field.onChange(maskCnpj(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><Building className='w-4 h-4 text-slate-400' />Razão Social do Tomador</FormLabel>
                                <FormControl>
                                  <Input placeholder='Sua empresa' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientDocument"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><Copy className='w-4 h-4 text-slate-400' />CNPJ do Tomador</FormLabel>
                                <FormControl>
                                  <Input placeholder='00.000.000/0000-00' {...field} onChange={(e) => field.onChange(maskCnpj(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="reportFile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-300">
                          <Paperclip className="w-4 h-4" />
                          Anexar Relatório (Opcional)
                        </FormLabel>
                        <FormControl>
                          <div className="relative border-2 border-dashed border-slate-700/50 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                            <p className="text-slate-400 mb-1 text-sm">
                              {reportFileName ? `Arquivo: ${reportFileName}` : "Clique ou arraste o relatório"}
                            </p>
                            <Input
                              type="file"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                field.onChange(e.target.files);
                                const file = e.target.files?.[0];
                                if (file) {
                                  setReportFileName(file.name);
                                }
                              }}
                              disabled={isSubmitting}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      {isSubmitting ? 'Enviando...' : isExtracting ? 'Analisando...' : 'Enviar para Atesto'}
                  </Button>
              </div>
            </form>
          </Form>
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
