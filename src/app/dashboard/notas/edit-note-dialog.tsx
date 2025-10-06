
'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../../components/ui/dialog';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../../components/ui/form";
import { Input } from '../../../../components/ui/input';
import {
  Loader2, Upload, SquarePen, Paperclip, Check, ChevronsUpDown, Star
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../../../../hooks/use-toast';
import { updateNote } from './actions';
import { getProjectAccounts, getProjectDetails } from '@/app/dashboard/actions';
import { cn, maskCnpj, parseBRLMoneyToFloat } from '../../../lib/utils';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Switch } from '../../../../components/ui/switch';
import { Separator } from '../../../../components/ui/separator';
import { Note, Coordinator } from '../../../lib/types';

// Tipos e constantes
const invoiceTypes = [
  { value: "SERVICO", label: "Serviço" },
  { value: "PRODUTO", label: "Produto" },
] as const;

const emailRegex = /^(?![_.-])(?!.*[_.-]{2})[a-zA-Z0-9_.-]+(?<![_.-])@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
const emailListRegex = /^$|^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(, *([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))*$/;

const editNoteFormSchema = z.object({
  invoiceType: z.enum(["SERVICO", "PRODUTO"]),
  hasWithholdingTax: z.preprocess(
    (val) => val === 'on' || val === 'true' || val === true,
    z.boolean()
  ),
  projectTitle: z.string().min(1, 'O título do projeto é obrigatório.'),
  coordinatorName: z.string().min(1, 'O nome do coordenador é obrigatório.'),
  coordinatorEmail: z.string().regex(emailRegex, { message: 'Formato de e-mail inválido.' }),
  projectAccountNumber: z.string().min(1, 'A conta do projeto é obrigatória.'),
  ccEmails: z.string().regex(emailListRegex, { message: 'Forneça e-mails válidos, separados por vírgula.' }).optional(),
  description: z.string().min(1, 'A descrição é obrigatória.'),
  providerDocument: z.string().optional(),
  clientName: z.string().optional(),
  clientDocument: z.string().optional(),
  noteNumber: z.string().optional(),
  issuedAt: z.string().optional(),
  totalValue: z.string().optional(),
  providerName: z.string().optional(),
  file: z.any().optional(),
  reportFile: z.any().optional(),
});

type EditNoteFormValues = z.infer<typeof editNoteFormSchema>;

interface EditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  onNoteEdited: () => void;
}

export function EditNoteDialog({ open, onOpenChange, note, onNoteEdited }: EditNoteDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isFetchingDetails, startFetchDetailsTransition] = useTransition();

  const [fileName, setFileName] = useState<string | null>(null);
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const [projectAccounts, setProjectAccounts] = useState<{ label: string; value: string }[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);

  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const form = useForm<EditNoteFormValues>({
    resolver: zodResolver(editNoteFormSchema),
    defaultValues: {
      invoiceType: "SERVICO",
      hasWithholdingTax: false,
      projectTitle: "",
      coordinatorName: "",
      coordinatorEmail: "",
      projectAccountNumber: "",
      ccEmails: "",
      description: "",
      providerDocument: "",
      clientName: "",
      clientDocument: "",
      noteNumber: "",
      issuedAt: "",
      totalValue: "",
      providerName: "",
      file: undefined,
      reportFile: undefined,
    }
  });

  const coordinatorEmailValue = form.watch('coordinatorEmail');

  const handleAccountSelect = (accountValue: string) => {
    form.setValue("projectAccountNumber", accountValue, { shouldValidate: true });
    setComboboxOpen(false);
    setSearchValue("");

    startFetchDetailsTransition(() => {
      void (async () => {
        try {
          const details = await getProjectDetails(accountValue);
          if (details) {
            form.setValue("projectTitle", details.projectTitle || "");
            setCoordinators(details.coordinators || []);
            toast({
              title: "Detalhes do Projeto",
              description: `Título e ${details.coordinators?.length ?? 0} coordenador(es) carregados.`,
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
      })();
    });
  };

  const handleCoordinatorSelect = (coordinatorEmail: string) => {
    const selectedCoordinator = coordinators.find(c => c.email === coordinatorEmail);
    if (selectedCoordinator) {
      form.setValue('coordinatorName', selectedCoordinator.name);
      form.setValue('coordinatorEmail', selectedCoordinator.email);
    }
  };

  useEffect(() => {
    async function fetchAccounts() {
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

    if (open) {
      fetchAccounts();
    }

    if (open && note) {
      form.reset({
        ...note,
        // mapeamentos/coerções para o form
        description: note.description ?? '',
        ccEmails: note.ccEmails ?? '',
        totalValue: typeof note.totalValue === 'number'
          ? note.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : (note.totalValue as any) ?? '',
        providerDocument: note.providerDocument ? maskCnpj(note.providerDocument) : '',
        clientDocument: note.clientDocument ? maskCnpj(note.clientDocument) : '',
      });
      setFileName(note.fileName ?? null);
      setReportFileName(note.reportFileName ?? null);

      if (note.projectAccountNumber) {
        // busca detalhes do projeto vinculado
        handleAccountSelect(note.projectAccountNumber);
      } else {
        setCoordinators([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, open]);

  const onSubmit = async (data: EditNoteFormValues) => {
    if (!note) return;

    startSubmitTransition(() => {
      void (async () => {
        const formData = new FormData();
        formData.append('noteId', String(note.id));

        const { file, reportFile, ...restOfData } = data;

        Object.entries(restOfData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });

        if (file?.[0]) {
            formData.append('file', file[0]);
        }
        if (reportFile?.[0]) {
            formData.append('reportFile', reportFile[0]);
        }
        
        try {
          const result = await updateNote(formData);
          if (result?.success) {
            toast({ title: 'Sucesso!', description: 'Nota atualizada com sucesso.' });
            onOpenChange(false);
            onNoteEdited();
          } else {
            toast({
              title: 'Erro',
              description: result?.message || 'Não foi possível atualizar a nota.',
              variant: 'destructive'
            });
          }
        } catch {
          toast({ title: 'Erro no Servidor', description: 'Ocorreu um erro inesperado.', variant: 'destructive' });
        }
      })();
    });
  };

  const handleValorTotalBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value ?? '';
    const numericValue = parseBRLMoneyToFloat(value);
    const formatted = (numericValue !== null && !Number.isNaN(numericValue))
      ? numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';
    form.setValue('totalValue', formatted, { shouldValidate: true });
  };

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
            {/* Anexo principal */}
            <FormField
              name="file"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-slate-300 mb-2">
                    Anexo da Nota (opcional para substituir)
                  </FormLabel>
                  <FormControl>
                    <div className="relative border-2 border-dashed border-slate-700/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-400 mb-2">
                        {fileName ? `Atual: ${fileName}` : "Clique para substituir"}
                      </p>
                      <p className="text-sm text-slate-500">
                        Arraste um novo arquivo aqui para substituí-lo
                      </p>
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

            {/* Anexo de relatório */}
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
                        accept=".pdf,.doc,.docx,.odt,.txt,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          field.onChange(e.target.files);
                          const file = e.target.files?.[0];
                          if (file) setReportFileName(file.name);
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

            {/* Dados do projeto / coordenador */}
            <div className="space-y-6">
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Conta do projeto (combobox) */}
                 <FormField
                  control={form.control}
                  name="projectAccountNumber"
                  render={({ field }) => {
                    return (
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
                                   : "Selecione a conta..."}
                                 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                               </Button>
                             </FormControl>
                           </PopoverTrigger>
                           <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                             <Command>
                               <CommandInput
                                 placeholder="Buscar conta..."
                                 value={searchValue}
                                 onValueChange={setSearchValue}
                               />
                               <CommandList>
                                   <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                                   <CommandGroup>
                                     {projectAccounts.map((account) => (
                                       <CommandItem
                                         value={account.label}
                                         key={account.value}
                                         onSelect={() => {
                                           handleAccountSelect(account.value)
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
                    );
                  }}
                />

                {/* Título do projeto */}
                <FormField
                  control={form.control}
                  name="projectTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título do Projeto</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isFetchingDetails} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Seletor de coordenador (preenche nome+email) */}
                <FormItem>
                  <FormLabel>Coordenador Responsável</FormLabel>
                  <Select
                    onValueChange={handleCoordinatorSelect}
                    disabled={isFetchingDetails || coordinators.length === 0}
                    value={coordinatorEmailValue || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={coordinators.length > 0 ? "Selecione um coordenador" : "Selecione uma conta primeiro"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {coordinators
                        .filter(c => !!c.email)
                        .map(c => (
                          <SelectItem key={c.email} value={c.email!}>
                            <div className='flex items-center gap-2'>
                              {c.isGeneral && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                              <span>{c.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </FormItem>

                {/* Campos de coordenador (ainda editáveis) */}
                <FormField
                  control={form.control}
                  name="coordinatorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Coordenador</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coordinatorEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail do Coordenador</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CC */}
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="ccEmails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mails em Cópia (CC)</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dados da nota */}
                <FormField
                  control={form.control}
                  name="invoiceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Nota</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {invoiceTypes.map(it => (
                            <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-7">
                      <FormLabel>Possui Retenção de Impostos?</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total (R$)</FormLabel>
                      <FormControl><Input {...field} onBlur={handleValorTotalBlur} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="noteNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Nota</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issuedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Emissão</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="providerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social do Prestador</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="providerDocument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ do Prestador</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(maskCnpj(e.target.value))}
                          placeholder="00.000.000/0000-00"
                        />
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
                      <FormLabel>Razão Social do Tomador</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientDocument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ do Tomador</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(maskCnpj(e.target.value))}
                          placeholder="00.000.000/0000-00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : null}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
