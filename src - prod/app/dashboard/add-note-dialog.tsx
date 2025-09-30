

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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileUp, FileText, Briefcase, Mail, User, ShieldCheck, Building, Receipt, Banknote, Check, ChevronsUpDown, Copy, FileSignature, Paperclip } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { extractNoteData } from '@/app/dashboard/notas/actions';
import { addNote, checkExistingNote } from '@/app/dashboard/actions';
import { getExistingAccountNumbers } from '@/app/dashboard/actions';
import { cn, maskCnpj } from '@/lib/utils'; 
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
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const [existingAccounts, setExistingAccounts] = useState<string[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  
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
      descricaoServicos: "",
      prestadorRazaoSocial: "",
      prestadorCnpj: "",
      tomadorRazaoSocial: "",
      tomadorCnpj: "",
      numeroNota: "",
      dataEmissao: "",
      valorTotal: "",
    }
  });

  const formatCurrencyForDisplay = (value: string | number | undefined): string => {
    if (value === undefined || value === null) return '';
    let stringValue = String(value);

    // Remove tudo que não é dígito
    let digitsOnly = stringValue.replace(/\D/g, '');
    if (!digitsOnly) return '';

    // Remove zeros à esquerda
    digitsOnly = digitsOnly.replace(/^0+/, '');

    // Adiciona padding de zeros se necessário
    if (digitsOnly.length < 3) {
      digitsOnly = digitsOnly.padStart(3, '0');
    }
    
    // Insere a vírgula
    let formattedValue = digitsOnly.slice(0, -2) + ',' + digitsOnly.slice(-2);
    
    // Adiciona pontos de milhar
    formattedValue = formattedValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return formattedValue;
  }

  const handleValorTotalBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyForDisplay(e.target.value);
    form.setValue('valorTotal', formatted, { shouldValidate: true });
  }

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
        if ((key === 'prestadorCnpj' || key === 'tomadorCnpj') && typeof value === 'string') {
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
    if (data.numeroNota && data.projectAccountNumber) {
        const isDuplicate = await checkExistingNote({
            numeroNota: data.numeroNota,
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


  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setFileName(null);
      setReportFileName(null);
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
                                            if (extractedData.descricaoServicos) form.setValue('descricaoServicos', extractedData.descricaoServicos);
                                            if (extractedData.prestadorRazaoSocial) form.setValue('prestadorRazaoSocial', extractedData.prestadorRazaoSocial);
                                            if (extractedData.prestadorCnpj) form.setValue('prestadorCnpj', maskCnpj(extractedData.prestadorCnpj));
                                            if (extractedData.tomadorRazaoSocial) form.setValue('tomadorRazaoSocial', extractedData.tomadorRazaoSocial);
                                            if (extractedData.tomadorCnpj) form.setValue('tomadorCnpj', maskCnpj(extractedData.tomadorCnpj));
                                            if (extractedData.numeroNota) form.setValue('numeroNota', extractedData.numeroNota);
                                            if (extractedData.dataEmissao) form.setValue('dataEmissao', extractedData.dataEmissao);
                                            if (extractedData.valorTotal) {
                                              form.setValue('valorTotal', formatCurrencyForDisplay(extractedData.valorTotal));
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
                            name="projectTitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><FileSignature className='w-4 h-4 text-slate-400' />Título do Projeto</FormLabel>
                                <FormControl>
                                  <Input placeholder='Ex: 1111-1 - INOVA UFPI - FADEX' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                                control={form.control}
                                name="projectAccountNumber"
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel className='flex items-center gap-2 text-slate-300'><Banknote className='w-4 h-4 text-slate-400' />Conta Corrente do Projeto</FormLabel>
                                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                         <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                          >
                                            {field.value || "Selecione ou digite..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command
                                          filter={(value, search) => {
                                            if (value.includes(search)) return 1
                                            return 0
                                          }}
                                        >
                                          <CommandInput
                                            placeholder="Buscar ou digitar nova conta..."
                                            value={field.value}
                                            onValueChange={(currentValue) => {
                                              form.setValue('projectAccountNumber', currentValue, { shouldValidate: true });
                                            }}
                                          />
                                          <CommandList>
                                            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                                            <CommandGroup>
                                              {existingAccounts.map((account) => (
                                                <CommandItem
                                                  key={account}
                                                  value={account}
                                                  onSelect={(currentValue) => {
                                                    form.setValue("projectAccountNumber", currentValue, { shouldValidate: true });
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
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                      </div>
                  </div>

                  <div>
                     <Label className="block text-sm font-medium text-slate-300 mb-2">4. Responsável pelo Atesto</Label>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-lg border border-border'>
                           <FormField
                            control={form.control}
                            name="coordinatorName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className='flex items-center gap-2 text-slate-300'><User className='w-4 h-4 text-slate-400' />Nome do Coordenador</FormLabel>
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
                                  <Input type="email" placeholder='email@exemplo.com' {...field} />
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
                            name="descricaoServicos"
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
                            name="valorTotal"
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
                            name="numeroNota"
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
                            name="dataEmissao"
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
                            name="prestadorRazaoSocial"
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
                            name="prestadorCnpj"
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
                            name="tomadorRazaoSocial"
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
                            name="tomadorCnpj"
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
