
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Loader2, Upload, FileText, Briefcase, Mail, User, ShieldCheck, Building, Receipt, Banknote, Check, ChevronsUpDown, Copy, FileSignature, Paperclip, Save, SquarePen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateNote } from './actions';
import { getProjectAccounts } from '@/app/dashboard/actions';
import { cn, maskCnpj, parseBRLMoneyToFloat } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FiscalNote, InvoiceType } from '@/lib/types';


const invoiceTypes = [
  { value: "SERVICO", label: "Serviço" },
  { value: "PRODUTO", label: "Produto" },
] as const;

const emailRegex = /^(?![_.-])(?!.*[_.-]{2})[a-zA-Z0-9_.-]+(?<![_.-])@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
const emailListRegex = /^$|^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(, *([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))*$/;

const editNoteFormSchema = z.object({
  invoiceType: z.nativeEnum(InvoiceType),
  hasWithholdingTax: z.preprocess((val) => val === 'on' || val === 'true' || val === true, z.boolean()),
  projectTitle: z.string().min(1, 'O título do projeto é obrigatório.'),
  coordinatorName: z.string().min(1, 'O nome do coordenador é obrigatório.'),
  coordinatorEmail: z.string().regex(emailRegex, { message: 'Formato de e-mail inválido.' }),
  projectAccountNumber: z.string().min(1, 'A conta do projeto é obrigatória.'),
  ccEmails: z.string().regex(emailListRegex, { message: 'Forneça uma lista de e-mails válidos, separados por vírgula.' }).optional(),
  description: z.string().min(1, 'A descrição é obrigatória.'),
  prestadorCnpj: z.string().optional(),
  tomadorRazaoSocial: z.string().optional(),
  tomadorCnpj: z.string().optional(),
  numeroNota: z.string().optional(),
  dataEmissao: z.string().optional(),
  amount: z.string().optional(),
  prestadorRazaoSocial: z.string().optional(),
  file: z.any().optional(),
  reportFile: z.any().optional(),
});

type EditNoteFormValues = z.infer<typeof editNoteFormSchema>;

interface EditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: FiscalNote | null;
  onNoteEdited: () => void;
}

export function EditNoteDialog({ open, onOpenChange, note, onNoteEdited }: EditNoteDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const [projectAccounts, setProjectAccounts] = useState<{ label: string; value: string }[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const form = useForm<EditNoteFormValues>({
    resolver: zodResolver(editNoteFormSchema),
  });

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
                    description: "Não foi possível carregar as contas de projeto.",
                    variant: "destructive",
                });
            }
        }
    }

    if (open && note) {
        form.reset({
            ...note,
            description: note.description ?? '',
            ccEmails: note.ccEmails ?? '',
            amount: note.amount ? note.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
            prestadorCnpj: note.prestadorCnpj ? maskCnpj(note.prestadorCnpj) : '',
            tomadorCnpj: note.tomadorCnpj ? maskCnpj(note.tomadorCnpj) : '',
        });
        setFileName(note.fileName);
        setReportFileName(note.reportFileName);
        fetchAccounts();
    }
  }, [note, open, form, toast]);

  const onSubmit = async (data: EditNoteFormValues) => {
    if (!note) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('noteId', note.id);

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

    try {
      const result = await updateNote(formData);
      if (result.success) {
        toast({ title: 'Sucesso!', description: 'Nota atualizada com sucesso.' });
        onNoteEdited();
        onOpenChange(false);
      } else {
        toast({ title: 'Erro', description: result.message || 'Não foi possível atualizar a nota.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erro no Servidor', description: 'Ocorreu um erro inesperado.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleValorTotalBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = parseBRLMoneyToFloat(value);
    const formatted = numericValue !== null 
        ? numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';
    form.setValue('amount', formatted, { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 rounded-xl border-slate-800/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <SquarePen className='w-6 h-6 text-primary' />
            Editar Nota Fiscal
          </DialogTitle>
          <DialogDescription>
            Modifique as informações da nota e, se necessário, substitua os anexos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
                name="file"
                control={form.control}
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="block text-sm font-medium text-slate-300 mb-2">Anexo da Nota (opcional para substituir)</FormLabel>
                    <FormControl>
                      <div className="relative border-2 border-dashed border-slate-700/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-slate-400 mb-2">{fileName ? `Atual: ${fileName}` : "Clique para substituir"}</p>
                          <p className="text-sm text-slate-500">Arraste um novo arquivo aqui para substituí-lo</p>
                          <Input 
                              type="file" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                              accept=".pdf,.xml,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                  field.onChange(e.target.files);
                                  setFileName(e.target.files?.[0]?.name || note?.fileName || null);
                              }}
                              disabled={isSubmitting}
                          />
                      </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="reportFile"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center gap-2 text-slate-300">
                    <Paperclip className="w-4 h-4" />
                    Relatório Anexo (opcional para substituir)
                    </FormLabel>
                    <FormControl>
                    <div className="relative border-2 border-dashed border-slate-700/50 rounded-lg p-4 text-center hover:border-primary/50 transition-colors mt-2">
                        <p className="text-slate-400 mb-1 text-sm">
                        {reportFileName ? `Atual: ${reportFileName}` : "Clique ou arraste o novo relatório"}
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
            
            <Separator />

            <div className="space-y-6">
                 <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Descrição</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem> <FormLabel>Valor Total (R$)</FormLabel> <FormControl><Input {...field} onBlur={handleValorTotalBlur} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="numeroNota" render={({ field }) => ( <FormItem> <FormLabel>Número da Nota</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="dataEmissao" render={({ field }) => ( <FormItem> <FormLabel>Data de Emissão</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="prestadorRazaoSocial" render={({ field }) => ( <FormItem> <FormLabel>Razão Social do Prestador</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="prestadorCnpj" render={({ field }) => ( <FormItem> <FormLabel>CNPJ do Prestador</FormLabel> <FormControl><Input {...field} onChange={(e) => field.onChange(maskCnpj(e.target.value))} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="tomadorRazaoSocial" render={({ field }) => ( <FormItem> <FormLabel>Razão Social do Tomador</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="tomadorCnpj" render={({ field }) => ( <FormItem> <FormLabel>CNPJ do Tomador</FormLabel> <FormControl><Input {...field} onChange={(e) => field.onChange(maskCnpj(e.target.value))} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="projectTitle" render={({ field }) => ( <FormItem> <FormLabel>Título do Projeto</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    
                    <FormField
                        control={form.control}
                        name="projectAccountNumber"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Conta do Projeto</FormLabel>
                             <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
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
                                      : "Selecione ou digite..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                  <CommandInput 
                                    placeholder="Buscar conta..."
                                    value={field.value}
                                    onValueChange={(currentValue) => form.setValue('projectAccountNumber', currentValue, { shouldValidate: true })}
                                  />
                                  <CommandList>
                                    <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                                    <CommandGroup>
                                      {projectAccounts.map((account) => (
                                        <CommandItem
                                          value={account.value}
                                          key={account.value}
                                          onSelect={(currentValue) => {
                                            form.setValue("projectAccountNumber", currentValue === field.value ? "" : currentValue, { shouldValidate: true });
                                            setComboboxOpen(false);
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
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    <FormField control={form.control} name="coordinatorName" render={({ field }) => ( <FormItem> <FormLabel>Nome do Coordenador</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="coordinatorEmail" render={({ field }) => ( <FormItem> <FormLabel>E-mail do Coordenador</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <div className="md:col-span-2">
                        <FormField control={form.control} name="ccEmails" render={({ field }) => ( <FormItem> <FormLabel>E-mails em Cópia (CC)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    </div>
                    <FormField control={form.control} name="invoiceType" render={({ field }) => ( <FormItem> <FormLabel>Tipo de Nota</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl> <SelectTrigger><SelectValue /></SelectTrigger> </FormControl> <SelectContent> {invoiceTypes.map(it => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="hasWithholdingTax" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-7"> <div className="space-y-0.5"> <FormLabel>Possui Retenção de Impostos?</FormLabel> </div> <FormControl> <Switch checked={field.value} onCheckedChange={field.onChange} /> </FormControl> </FormItem> )} />
                </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
