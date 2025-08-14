'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import {
  FilePlus,
  Box,
  Building,
  User,
  ClipboardList,
  Mail,
  Truck,
  DollarSign,
  Trash2,
  PlusCircle,
  Paperclip,
  Save,
  Loader2,
  Calendar as CalendarIcon,
  ChevronsUpDown
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAppMode } from '@/contexts/app-mode-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Esquema de validação com Zod
const itemSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  quantidade: z.coerce.number().min(0.01, 'Quantidade deve ser maior que 0'),
  valorUnitario: z.coerce.number().min(0.01, 'Valor unitário deve ser maior que 0'),
  valorTotal: z.number().optional(),
});

const formSchema = z.object({
  numeroOF: z.string().optional(),
  solicitante: z.string().optional(),
  dataEmissao: z.date(),
  fornecedor: z.string().min(1, 'Selecione um fornecedor'),
  cnpj: z.string(),
  emailFornecedor: z.string().email('E-mail inválido'),
  nomeProjeto: z.string().min(1, 'Nome do projeto é obrigatório'),
  coordenadorProjeto: z.string().min(1, 'Coordenador é obrigatório'),
  numeroContrato: z.string().min(1, 'Nº do contrato é obrigatório'),
  contaCorrente: z.string().min(1, 'Conta corrente é obrigatória'),
  numeroProcesso: z.string().min(1, 'Nº do processo é obrigatório'),
  vigenciaProjeto: z.string().min(1, 'Vigência é obrigatória'),
  itens: z.array(itemSchema).min(1, 'Adicione pelo menos um item'),
  enderecoEntrega: z.string().min(1, 'Endereço de entrega é obrigatório'),
  prazoEntrega: z.string().min(1, 'Prazo de entrega é obrigatório'),
  frete: z.string().optional(),
  valorTotalOrdem: z.number().optional(),
  instrucoesFaturamento: z.string().min(1, 'Instruções são obrigatórias'),
});

type FormValues = z.infer<typeof formSchema>;

const SectionCard = ({ icon: Icon, title, description, children }: { icon: React.ElementType, title: string, description: string, children: React.ReactNode }) => (
    <Card className="bg-card shadow-sm">
        <CardHeader>
            <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {children}
        </CardContent>
    </Card>
);

const FormField = ({ name, label, children, className }: { name: string, label: string, children: React.ReactNode, className?: string }) => {
    const { formState: { errors } } = useForm<FormValues>();
    const error = errors[name as keyof FormValues];

    return (
        <div className={cn('space-y-2', className)}>
            <Label htmlFor={name} className={error ? 'text-destructive' : ''}>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive mt-1">{error.message}</p>}
        </div>
    );
};

export default function NovaSolicitacaoPage() {
    const { setMode } = useAppMode();
    const { data: session } = useSession();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMode('request');
    }, [setMode]);
    
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            solicitante: session?.user?.name || '',
            dataEmissao: new Date(),
            itens: [{ descricao: '', unidade: '', quantidade: 1, valorUnitario: 0 }],
            instrucoesFaturamento: 'DADOS PARA FATURAMENTO:\nRAZÃO SOCIAL: FUNDACAO DE APOIO AO ENSINO, PESQUISA E EXTENSÃO\nCNPJ: 07.604.269/0001-38\nENDEREÇO: AVENIDA DOUTOR MORAES, 1789, BAIRRO: CENTRO, CEP: 68.743-050 - CASTANHAL - PARÁ\n\nNA NOTA FISCAL DEVERÁ CONSTAR OBRIGATORIAMENTE:\n- NOME DO PROJETO\n- Nº DA ORDEM DE FORNECIMENTO\n- CONTA CORRENTE',
        }
    });

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "itens",
    });

    const watchItens = watch('itens');

    useEffect(() => {
        const total = watchItens.reduce((sum, item) => {
            const itemTotal = (item.quantidade || 0) * (item.valorUnitario || 0);
            return sum + itemTotal;
        }, 0);
        setValue('valorTotalOrdem', total);
    }, [watchItens, setValue]);

    const onSubmit = (data: FormValues) => {
        setLoading(true);
        console.log(data);
        toast({
            title: "Solicitação Enviada (Simulação)",
            description: "Os dados do formulário foram logados no console.",
        });
        setTimeout(() => setLoading(false), 1500);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-primary to-green-400 p-3 rounded-xl">
                        <FilePlus className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">Nova Ordem de Fornecimento</h1>
                        <p className="text-muted-foreground mt-1">Preencha todos os campos para gerar e enviar a solicitação.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Seção 1: Cabeçalho */}
                <SectionCard icon={Paperclip} title="Cabeçalho da Solicitação" description="Dados de controle interno do sistema.">
                    <FormField name="numeroOF" label="Número da Ordem de Fornecimento">
                        <Input {...register('numeroOF')} placeholder="Será gerado automaticamente" disabled />
                    </FormField>
                    <FormField name="solicitante" label="Solicitante (Usuário FADEX)">
                        <Input {...register('solicitante')} disabled />
                    </FormField>
                     <FormField name="dataEmissao" label="Data de Emissão">
                        <Controller
                          name="dataEmissao"
                          control={control}
                          render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={'outline'}
                                  className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                    </FormField>
                </SectionCard>
                
                {/* Seção 2: Fornecedor */}
                <SectionCard icon={Building} title="Dados do Fornecedor" description="Informações da empresa que fornecerá o serviço/produto.">
                    <FormField name="fornecedor" label="Fornecedor (Razão Social)">
                        <Input {...register('fornecedor')} placeholder="Busque ou digite o nome do fornecedor" />
                    </FormField>
                     <FormField name="cnpj" label="CNPJ">
                        <Input {...register('cnpj')} placeholder="00.000.000/0001-00" />
                    </FormField>
                     <FormField name="emailFornecedor" label="E-mail Principal para Contato" className="md:col-span-2">
                        <Input type="email" {...register('emailFornecedor')} placeholder="email.fornecedor@exemplo.com" />
                    </FormField>
                </SectionCard>
                
                {/* Seção 3: Detalhes do Projeto */}
                <SectionCard icon={ClipboardList} title="Detalhes do Projeto e Faturamento" description="Informações cruciais que devem constar na nota fiscal.">
                    <FormField name="nomeProjeto" label="Nome do Projeto" className="md:col-span-2">
                        <Input {...register('nomeProjeto')} placeholder="Nome completo do projeto" />
                    </FormField>
                    <FormField name="coordenadorProjeto" label="Coordenador(a) do Projeto">
                        <Input {...register('coordenadorProjeto')} placeholder="Nome do responsável" />
                    </FormField>
                    <FormField name="numeroContrato" label="Número do Contrato / Convênio">
                        <Input {...register('numeroContrato')} placeholder="Ex: CONTRATO 45/2023" />
                    </FormField>
                    <FormField name="contaCorrente" label="Conta Corrente (CC)">
                        <Input {...register('contaCorrente')} placeholder="Ex: 11560-6" />
                    </FormField>
                    <FormField name="numeroProcesso" label="Número do Processo">
                        <Input {...register('numeroProcesso')} placeholder="Ex: 0153.150725.0060" />
                    </FormField>
                     <FormField name="vigenciaProjeto" label="Vigência do Projeto" className="md:col-span-2">
                        <Input {...register('vigenciaProjeto')} placeholder="Ex: 01/01/2024 a 31/12/2025" />
                    </FormField>
                </SectionCard>
                
                {/* Seção 4: Itens */}
                <Card className="bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Box className="w-6 h-6 text-primary" />Lista de Itens</CardTitle>
                        <CardDescription>Adicione todos os produtos ou serviços que fazem parte desta ordem.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                 const item = watchItens[index];
                                 const total = (item?.quantidade || 0) * (item?.valorUnitario || 0);

                                return (
                                <div key={field.id} className="grid grid-cols-12 gap-x-4 gap-y-2 items-end p-4 bg-slate-100 rounded-lg border">
                                    <FormField name={`itens.${index}.descricao`} label="Descrição do Item" className="col-span-12 md:col-span-4">
                                        <Input {...register(`itens.${index}.descricao`)} placeholder="Ex: Tijolo de 8 furos" />
                                    </FormField>
                                    <FormField name={`itens.${index}.unidade`} label="Unid.">
                                        <Input {...register(`itens.${index}.unidade`)} placeholder="UN, KG, M³" />
                                    </FormField>
                                    <FormField name={`itens.${index}.quantidade`} label="Qtd.">
                                        <Input type="number" step="0.01" {...register(`itens.${index}.quantidade`)} />
                                    </FormField>
                                    <FormField name={`itens.${index}.valorUnitario`} label="Valor Unit. (R$)">
                                        <Input type="number" step="0.01" {...register(`itens.${index}.valorUnitario`)} />
                                    </FormField>
                                    <div className="col-span-12 md:col-span-2">
                                        <Label>Valor Total (R$)</Label>
                                        <Input value={total.toFixed(2)} disabled className="font-bold" />
                                    </div>
                                    <div className="col-span-12 md:col-span-1 flex justify-end">
                                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )})}
                            <Button type="button" variant="outline" onClick={() => append({ descricao: '', unidade: '', quantidade: 1, valorUnitario: 0 })}>
                                <PlusCircle className="w-4 h-4 mr-2" />
                                Adicionar Novo Item
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                 {/* Seção 5: Entrega e Valores */}
                 <SectionCard icon={Truck} title="Condições de Entrega e Valores" description="Informações sobre frete, prazos e o total da ordem.">
                     <FormField name="enderecoEntrega" label="Endereço de Entrega" className="md:col-span-2">
                        <Textarea {...register('enderecoEntrega')} placeholder="Local detalhado para entrega dos materiais/serviços" />
                    </FormField>
                     <FormField name="prazoEntrega" label="Prazo de Entrega">
                        <Input {...register('prazoEntrega')} placeholder="Ex: 15 dias úteis" />
                    </FormField>
                     <FormField name="frete" label="Frete (Tipo e Valor)">
                        <Input {...register('frete')} placeholder="Ex: CIF - Valor embutido na proposta" />
                    </FormField>
                    <div className="md:col-span-2">
                        <Label>Valor Total da Ordem (R$)</Label>
                        <Input value={watch('valorTotalOrdem')?.toFixed(2) || '0.00'} disabled className="text-xl font-bold h-12" />
                    </div>
                 </SectionCard>

                 {/* Seção 6: Instruções */}
                  <SectionCard icon={DollarSign} title="Instruções para Faturamento" description="Texto que será incluído no corpo do e-mail para o fornecedor.">
                     <FormField name="instrucoesFaturamento" label="Instruções para a Nota Fiscal" className="md:col-span-2">
                        <Textarea {...register('instrucoesFaturamento')} rows={8} />
                    </FormField>
                 </SectionCard>
                
                <Separator />
                
                <div className="flex justify-end gap-4">
                    <Button type="button" variant="ghost" disabled={loading}>Cancelar</Button>
                    <Button type="submit" disabled={loading} size="lg">
                        {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin"/> : <Save className="w-5 h-5 mr-2" />}
                        {loading ? 'Salvando...' : 'Salvar e Enviar Solicitação'}
                    </Button>
                </div>
            </form>
        </div>
    );
}