
'use client';

import { useState, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import { 
  Settings as SettingsIcon, 
  Shield, 
  Loader2, 
  UserCog, 
  Bell,
  Eye,
  Save,
  Send,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  ExternalLink,
  XCircle,
  BrainCircuit,
  Database, // Novo ícone
} from "lucide-react";
import { User, Role, Settings, EmailTemplate, SqlServerSettings } from "@prisma/client"; // Adicionado SqlServerSettings
import { 
    getUsers, 
    updateUserRole, 
    sendTestEmail,
    getSettings,
    saveSettings,
    getEmailTemplates,
    saveEmailTemplates,
    getPreviewAttestationLink,
    getSqlServerSettings, // Nova importação
    saveSqlServerSettings // Nova importação
} from "./actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const availableAiModels = [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Máximo Desempenho)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Equilibrado)' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Velocidade Otimizada)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Performance Intermediária)' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Leve e Rápido)' },
    { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro (Avançado e Econômico)' },
    { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash (Custo-Benefício)' },
];

function SettingsSkeleton() {
    return (
        <div className="space-y-8">
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-border p-6">
                <Skeleton className="h-7 w-64 mb-2" />
                <Skeleton className="h-5 w-96" />
                 <div className="mt-6 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                 </div>
            </div>
             <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-border p-6">
                <Skeleton className="h-7 w-64 mb-2" />
                <Skeleton className="h-5 w-96" />
                 <div className="mt-6">
                    <Skeleton className="h-32 w-full" />
                 </div>
            </div>
             <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-border p-6">
                <Skeleton className="h-7 w-64 mb-2" />
                <Skeleton className="h-5 w-96" />
                 <div className="mt-6">
                    <Skeleton className="h-40 w-full" />
                 </div>
            </div>
        </div>
    )
}

function AccessDenied() {
  return (
     <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-8 border border-border text-center">
        <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          Você não tem permissão para visualizar ou gerenciar as configurações. Apenas os administradores do sistema têm acesso a esta seção.
        </p>
    </div>
  )
}

const placeholderMap: Record<EmailTemplate['type'], { placeholder: string; description: string }[]> = {
    ATTESTATION_REQUEST: [
        { placeholder: '[NomeCoordenador]', description: 'Nome do coordenador responsável pelo atesto.' },
        { placeholder: '[NomeSolicitante]', description: 'Nome do usuário que enviou a nota.' },
        { placeholder: '[TituloProjeto]', description: 'O título do projeto relacionado.' },
        { placeholder: '[DescricaoNota]', description: 'Descrição dos serviços ou produtos da nota.' },
        { placeholder: '[NumeroNota]', description: 'O número da nota fiscal.' },
        { placeholder: '[ContaProjeto]', description: 'O número da conta do projeto.' },
        { placeholder: '[LinkAteste]', description: 'Link direto para a página de atesto da nota.' },
    ],
    ATTESTATION_REMINDER: [
        { placeholder: '[NomeCoordenador]', description: 'Nome do coordenador responsável pelo atesto.' },
        { placeholder: '[TituloProjeto]', description: 'O título do projeto relacionado.' },
        { placeholder: '[DescricaoNota]', description: 'Descrição dos serviços ou produtos da nota.' },
        { placeholder: '[NumeroNota]', description: 'O número da nota fiscal.' },
        { placeholder: '[ContaProjeto]', description: 'O número da conta do projeto.' },
        { placeholder: '[DiasRestantes]', description: 'Número de dias restantes antes do prazo expirar.' },
        { placeholder: '[LinkAteste]', description: 'Link direto para a página de atesto da nota.' },
    ],
    ATTESTATION_CONFIRMATION: [
        { placeholder: '[NomeSolicitante]', description: 'Nome do usuário que enviou a nota.' },
        { placeholder: '[TituloProjeto]', description: 'O título do projeto relacionado.' },
        { placeholder: '[DescricaoNota]', description: 'Descrição dos serviços ou produtos da nota.' },
        { placeholder: '[NumeroNota]', description: 'O número da nota fiscal.' },
        { placeholder: '[ContaProjeto]', description: 'O número da conta do projeto.' },
        { placeholder: '[NomeAtestador]', description: 'Nome do usuário que atestou a nota.' },
        { placeholder: '[DataAtesto]', description: 'Data e hora em que a nota foi atestada.' },
        { placeholder: '[ObservacaoAtesto]', description: 'Observações adicionadas durante o atesto.' },
    ],
    NOTE_EXPIRED: [
        { placeholder: '[NomeCoordenador]', description: 'Nome do coordenador que deveria ter atestado.' },
        { placeholder: '[NomeSolicitante]', description: 'Nome do usuário que enviou a nota.' },
        { placeholder: '[TituloProjeto]', description: 'O título do projeto relacionado.' },
        { placeholder: '[DescricaoNota]', description: 'Descrição dos serviços ou produtos da nota.' },
        { placeholder: '[NumeroNota]', description: 'O número da nota fiscal.' },
        { placeholder: '[ContaProjeto]', description: 'O número da conta do projeto.' },
        { placeholder: '[DataExpiracao]', description: 'Data em que o prazo para atesto expirou.' },
    ],
    ATTESTATION_CONFIRMATION_COORDINATOR: [
        { placeholder: '[NomeCoordenador]', description: 'Nome do coordenador que realizou o atesto.' },
        { placeholder: '[TituloProjeto]', description: 'O título do projeto relacionado.' },
        { placeholder: '[DescricaoNota]', description: 'Descrição dos serviços ou produtos da nota.' },
        { placeholder: '[DataAtesto]', description: 'Data e hora em que a nota foi atestada.' },
        { placeholder: '[ObservacaoAtesto]', description: 'Observações deixadas no momento do atesto.' },
    ],
    NOTE_REJECTED: [
        { placeholder: '[NomeSolicitante]', description: 'Nome do usuário que solicitou a nota.' },
        { placeholder: '[NomeCoordenador]', description: 'Nome do coordenador que rejeitou a nota.' },
        { placeholder: '[TituloProjeto]', description: 'O título do projeto relacionado.' },
        { placeholder: '[DescricaoNota]', description: 'Descrição dos serviços ou produtos da nota.' },
        { placeholder: '[DataRejeicao]', description: 'Data e hora da rejeição.' },
        { placeholder: '[MotivoRejeicao]', description: 'O motivo informado pelo coordenador para a rejeição.' },
    ]
};


export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [isSaving, startSavingTransition] = useTransition();
  const [isSendingTest, startSendingTestTransition] = useTransition();
  const [isGettingPreview, startGettingPreviewTransition] = useTransition();
  
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [sqlSettings, setSqlSettings] = useState<Partial<SqlServerSettings>>({}); // Novo estado
  const [templates, setTemplates] = useState<Partial<Record<EmailTemplate['type'], EmailTemplate>>>({});
  const [testEmail, setTestEmail] = useState('');
  
  const { toast } = useToast();

  const currentUserRole = session?.user?.role;
  const hasPermission = currentUserRole === 'OWNER' || currentUserRole === 'MANAGER';
  const isOwner = currentUserRole === 'OWNER'; // Nova variável para verificar se é OWNER
  
  useEffect(() => {
    async function loadData() {
        if (!hasPermission) {
            setLoading(false);
            return;
        }
        try {
            const promises = [
                getSettings(),
                getEmailTemplates(),
            ];

            if (isOwner) {
                promises.push(getSqlServerSettings());
            }

            const [settingsData, templatesData, sqlSettingsData] = await Promise.all(promises);

            setSettings(settingsData as Settings);
            
            const templatesMap = (templatesData as EmailTemplate[]).reduce((acc, t) => {
                acc[t.type] = t;
                return acc;
            }, {} as Record<EmailTemplate['type'], EmailTemplate>);
            setTemplates(templatesMap);

            if (isOwner && sqlSettingsData) {
                setSqlSettings(sqlSettingsData as SqlServerSettings);
            }

        } catch (error) {
            toast({
                title: 'Erro ao carregar configurações',
                description: 'Não foi possível buscar os dados do servidor.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }

    if (status === 'authenticated') {
        loadData();
    }
  }, [status, hasPermission, isOwner, toast]);

  const handleTemplateChange = (type: EmailTemplate['type'], field: 'subject' | 'body', value: string) => {
      setTemplates(prev => ({
          ...prev,
          [type]: {
              ...(prev[type] as EmailTemplate),
              [field]: value,
          }
      }));
  };
  
  const handleSave = () => {
    startSavingTransition(async () => {
        try {
            const templatesToSave = Object.values(templates).filter(Boolean) as EmailTemplate[];
            const settingsPromises: Promise<any>[] = [
                saveSettings(settings),
                saveEmailTemplates(templatesToSave)
            ];

            if (isOwner && sqlSettings.sqlServerIp) {
                settingsPromises.push(saveSqlServerSettings(sqlSettings as Omit<SqlServerSettings, 'id'>));
            }

            await Promise.all(settingsPromises);

            toast({
                title: 'Sucesso!',
                description: 'Configurações salvas com sucesso.',
            });
        } catch (error) {
            toast({
                title: 'Erro ao Salvar',
                description: 'Não foi possível salvar as configurações.',
                variant: 'destructive',
            });
        }
    });
  }

  const handleSendTestEmail = (templateBody: string, templateSubject: string) => {
    if (!testEmail) {
        toast({ title: 'Atenção', description: 'Por favor, insira um e-mail de destinatário para o teste.', variant: 'destructive' });
        return;
    }
    startSendingTestTransition(async () => {
        const result = await sendTestEmail(testEmail, templateSubject, templateBody);
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
        } else {
            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
        }
    });
  }

  const handleGetPreviewLink = () => {
      startGettingPreviewTransition(async () => {
          const result = await getPreviewAttestationLink();
          if (result.success && result.link) {
              window.open(result.link, '_blank');
              toast({
                  title: 'Link de Visualização Gerado',
                  description: 'A página de atesto foi aberta em uma nova aba.',
              })
          } else {
              toast({
                  title: 'Erro ao Gerar Link',
                  description: result.message,
                  variant: 'destructive',
              });
          }
      });
  };

  if (loading || status === 'loading') {
    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-500 to-slate-600 rounded-2xl blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-slate-500 to-slate-600 p-3 rounded-2xl">
                        <SettingsIcon className="w-8 h-8 text-white" />
                    </div>
                </div>
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        Configurações
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Ajuste as regras, automações e templates do sistema.
                    </p>
                </div>
            </div>
            <SettingsSkeleton />
        </div>
    );
  }

  if (!hasPermission) {
    return (
         <div>
            <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-500 to-slate-600 rounded-2xl blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-slate-500 to-slate-600 p-3 rounded-2xl">
                        <SettingsIcon className="w-8 h-8 text-white" />
                    </div>
                </div>
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        Configurações
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Ajuste as regras, automações e templates do sistema.
                    </p>
                </div>
            </div>
            <AccessDenied />
        </div>
    )
  }

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-500 to-slate-600 rounded-2xl blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-slate-500 to-slate-600 p-3 rounded-2xl">
                        <SettingsIcon className="w-8 h-8 text-white" />
                    </div>
                </div>
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        Configurações
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Ajuste as regras, automações e templates do sistema.
                    </p>
                </div>
            </div>
             <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isSaving ? 'Salvando...' : 'Salvar Todas as Configurações'}
            </Button>
        </div>
      
      <div className="grid gap-8">
        {/* Card de Configurações de IA */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-border">
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <BrainCircuit className="text-purple-400" />
            Inteligência Artificial
          </h2>
           <p className="text-slate-400 mb-6">
            Selecione o modelo de IA para extração de dados das notas fiscais.
          </p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <Label htmlFor="aiModel" className="block text-sm font-medium text-slate-300 mb-2">
                Modelo de Extração (Gemini)
              </Label>
              <Select
                value={settings.aiModel || 'gemini-1.5-flash-latest'}
                onValueChange={(value) => setSettings(s => ({...s, aiModel: value}))}
              >
                  <SelectTrigger className="w-full max-w-sm bg-slate-800/80 border-border">
                      <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                      {availableAiModels.map(model => (
                          <SelectItem key={model.value} value={model.value}>
                              {model.label}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                Modelos "Pro" são mais precisos, mas mais lentos e caros. "Flash" é mais rápido para o dia a dia.
              </p>
             </div>
           </div>
        </div>
        
        {/* Card de Automação */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-border">
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            Configurações Gerais
          </h2>
           <p className="text-slate-400 mb-6">
            Defina regras para automatizar o status e as notificações das notas fiscais.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="attestationDeadline" className="block text-sm font-medium text-slate-300 mb-2">
                Prazo para atesto (em dias)
              </Label>
              <Input
                id="attestationDeadline"
                type="number"
                value={settings.attestationDeadlineInDays || 30}
                onChange={(e) => setSettings(s => ({...s, attestationDeadlineInDays: parseInt(e.target.value, 10)}))}
                className="w-full max-w-xs bg-slate-800/80 border-border rounded-lg px-4 py-2.5"
                min="1"
              />
              <p className="text-xs text-slate-500 mt-2">
                Notas pendentes que excederem este prazo serão marcadas como "Expiradas".
              </p>
            </div>
             <div>
              <Label htmlFor="reminderFrequency" className="block text-sm font-medium text-slate-300 mb-2">
                Notificar sobre pendência a cada (dias)
              </Label>
              <Input
                id="reminderFrequency"
                type="number"
                value={settings.reminderFrequencyInDays || 3}
                onChange={(e) => setSettings(s => ({...s, reminderFrequencyInDays: parseInt(e.target.value, 10)}))}
                className="w-full max-w-xs bg-slate-800/80 border-border rounded-lg px-4 py-2.5"
                min="1"
              />
              <p className="text-xs text-slate-500 mt-2">
                 Envia lembretes periódicos se a nota continuar pendente (funcionalidade futura).
              </p>
            </div>
          </div>
        </div>

        {/* Card de Conexão SQL Server (APENAS PARA OWNER) */}
        {isOwner && (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30">
              <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                <Database className="text-yellow-400" />
                Conexão com Banco de Dados Externo (SQL Server)
              </h2>
              <p className="text-slate-400 mb-6">
                Configure o acesso ao banco de dados para buscar as contas de projeto.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <Label htmlFor="sqlServerIp">IP do Servidor</Label>
                      <Input id="sqlServerIp" value={sqlSettings.sqlServerIp || ''} onChange={(e) => setSqlSettings(s => ({...s, sqlServerIp: e.target.value}))} className="w-full bg-slate-800/80 border-border" placeholder="192.168.1.100" />
                  </div>
                  <div>
                      <Label htmlFor="sqlServerDatabase">Nome do Banco de Dados</Label>
                      <Input id="sqlServerDatabase" value={sqlSettings.sqlServerDatabase || ''} onChange={(e) => setSqlSettings(s => ({...s, sqlServerDatabase: e.target.value}))} className="w-full bg-slate-800/80 border-border" placeholder="Opcional" />
                  </div>
                  <div>
                      <Label htmlFor="sqlServerUser">Usuário</Label>
                      <Input id="sqlServerUser" value={sqlSettings.sqlServerUser || ''} onChange={(e) => setSqlSettings(s => ({...s, sqlServerUser: e.target.value}))} className="w-full bg-slate-800/80 border-border" />
                  </div>
                  <div>
                      <Label htmlFor="sqlServerPassword">Senha</Label>
                      <Input id="sqlServerPassword" type="password" value={sqlSettings.sqlServerPassword || ''} onChange={(e) => setSqlSettings(s => ({...s, sqlServerPassword: e.target.value}))} className="w-full bg-slate-800/80 border-border" />
                  </div>
              </div>
            </div>
        )}

        {/* Card de Visualização e Testes */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-border">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                <Eye />
                Visualização e Testes
            </h2>
            <p className="text-slate-400 mb-6">
                Use os botões abaixo para visualizar componentes-chave do sistema.
            </p>
            <div className="flex items-center gap-4">
                 <Button onClick={handleGetPreviewLink} disabled={isGettingPreview}>
                    {isGettingPreview ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                    {isGettingPreview ? 'Gerando...' : 'Visualizar Página de Atesto'}
                </Button>
            </div>
             <p className="text-xs text-slate-500 mt-2">
                A visualização da página de atesto usará a nota pendente mais recente como exemplo.
            </p>
        </div>


        {/* Card de Notificações */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-border">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                <Bell />
                Templates de Notificação por E-mail
            </h2>
             <p className="text-slate-400 mb-6">
                Personalize as mensagens enviadas em cada etapa do processo.
            </p>
            
            <Tabs defaultValue="ATTESTATION_REQUEST">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-6 h-auto">
                    <TabsTrigger value="ATTESTATION_REQUEST"><Mail className="w-4 h-4 mr-2"/> Solicitação</TabsTrigger>
                    <TabsTrigger value="ATTESTATION_REMINDER"><Clock className="w-4 h-4 mr-2"/> Lembrete</TabsTrigger>
                    <TabsTrigger value="ATTESTATION_CONFIRMATION"><CheckCircle2 className="w-4 h-4 mr-2"/> Confirmação (Solicitante)</TabsTrigger>
                    <TabsTrigger value="ATTESTATION_CONFIRMATION_COORDINATOR"><ClipboardCheck className="w-4 h-4 mr-2"/> Confirmação (Coordenador)</TabsTrigger>
                    <TabsTrigger value="NOTE_EXPIRED"><AlertTriangle className="w-4 h-4 mr-2"/> Expiração</TabsTrigger>
                    <TabsTrigger value="NOTE_REJECTED"><XCircle className="w-4 h-4 mr-2"/> Rejeição</TabsTrigger>
                </TabsList>

                {(Object.keys(placeholderMap) as Array<keyof typeof placeholderMap>).map(type => (
                    <TabsContent key={type} value={type} className="mt-4">
                        <EmailTemplateEditor
                            template={templates[type]}
                            placeholders={placeholderMap[type]}
                            onTemplateChange={(field, value) => handleTemplateChange(type, field, value)}
                            onSendTest={(body, subject) => handleSendTestEmail(body, subject)}
                            testEmail={testEmail}
                            onTestEmailChange={setTestEmail}
                            isSendingTest={isSendingTest}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
        
        {/* Card de Gerenciamento de Cargos */}
        {isOwner && (
            <UserManagement currentUserId={session?.user?.id ?? ''} currentUserRole={currentUserRole} />
        )}
      </div>
    </div>
  );
}

interface EmailTemplateEditorProps {
    template?: Partial<EmailTemplate>;
    placeholders: { placeholder: string; description: string }[];
    onTemplateChange: (field: 'subject' | 'body', value: string) => void;
    onSendTest: (body: string, subject: string) => void;
    testEmail: string;
    onTestEmailChange: (value: string) => void;
    isSendingTest: boolean;
}

function EmailTemplateEditor({ template, placeholders, onTemplateChange, onSendTest, testEmail, onTestEmailChange, isSendingTest }: EmailTemplateEditorProps) {
    if (!template) {
        return <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />;
    }

    return (
        <div className="border border-border/80 rounded-lg p-4">
             <div className="mb-4">
                <Label htmlFor={`subject-${template.type}`} className="block text-sm font-medium text-slate-300 mb-2">Assunto do E-mail</Label>
                <Input
                    id={`subject-${template.type}`}
                    value={template.subject || ''}
                    onChange={(e) => onTemplateChange('subject', e.target.value)}
                    className="w-full bg-slate-800/80 border-border"
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor={`template-${template.type}`} className="block text-sm font-medium text-slate-300 mb-2">Corpo do E-mail (HTML)</Label>
                    <Textarea
                        id={`template-${template.type}`}
                        value={template.body || ''}
                        onChange={(e) => onTemplateChange('body', e.target.value)}
                        className="w-full h-80 bg-slate-800/80 border-border rounded-lg p-4 font-mono text-sm"
                        placeholder="Escreva o corpo do email em HTML aqui..."
                    />
                </div>
                <div>
                    <Label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Eye /> Preview</Label>
                    <div className="border border-border rounded-lg p-4 h-80 overflow-y-auto bg-slate-800/50">
                        <div className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: template.body?.replace(/\[(.*?)\]/g, '<span class="font-semibold text-primary/80">[$1]</span>') || '' }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                 <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Placeholders Disponíveis</h4>
                    <div className="border border-border/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                        <ul className="space-y-2">
                        {placeholders.map(p => (
                            <li key={p.placeholder}>
                                <code className="text-xs bg-slate-700 p-1 rounded-sm text-amber-300">{p.placeholder}</code>
                                <p className="text-xs text-slate-500 pl-1">{p.description}</p>
                            </li>
                        ))}
                        </ul>
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Testar Template</h4>
                     <div className="border border-border/50 rounded-lg p-4">
                        <Label htmlFor="test-email-input" className="text-xs text-slate-400">Enviar para:</Label>
                         <div className="flex flex-col sm:flex-row items-center mt-1 gap-2">
                            <Input
                                id="test-email-input"
                                type="email"
                                placeholder="email@exemplo.com"
                                value={testEmail}
                                onChange={(e) => onTestEmailChange(e.target.value)}
                                className="w-full sm:w-auto flex-grow bg-slate-800/80 border-border"
                            />
                            <Button 
                                variant="outline" 
                                onClick={() => onSendTest(template.body || '', template.subject || '')} 
                                disabled={!testEmail || isSendingTest} 
                                className="w-full sm:w-auto"
                            >
                                {isSendingTest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                {isSendingTest ? 'Enviando...' : 'Enviar Teste'}
                            </Button>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
}


function UserManagement({ currentUserId, currentUserRole }: { currentUserId: string, currentUserRole: Role }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersData = await getUsers();
            setUsers(usersData);
        } catch (error) {
            toast({
                title: "Erro ao buscar usuários",
                description: error instanceof Error ? error.message : "Não foi possível carregar os usuários.",
                variant: 'destructive',
            })
        } finally {
            setLoading(false);
        }
    };
    fetchUsers();
  }, [toast]);


  const handleRoleChange = async (userId: string, newRole: 'USER' | 'MANAGER') => {
    try {
      const result = await updateUserRole(userId, newRole);
      if (result.success && result.user) {
        toast({
          title: "Sucesso!",
          description: `O cargo de ${result.user.name} foi atualizado.`,
        });
        const updatedUsers = await getUsers(); 
        setUsers(updatedUsers);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o cargo.",
        variant: "destructive",
      });
      const currentUsers = await getUsers(); 
      setUsers(currentUsers);
    }
  };
  
  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-border">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <UserCog />
            Gerenciamento de Cargos
        </h2>
        <p className="text-slate-400">
          Atribua cargos de "Gerente" para permitir que usuários atestem notas de outros Analistas.
        </p>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
            <div className="p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            </div>
        ) : (
            <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent border-border/80">
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[180px]">Cargo</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => (
                <TableRow key={user.id} className="border-border/80">
                    <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                    </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                    <RoleSwitcher
                        currentUserRole={currentUserRole}
                        currentUserId={currentUserId}
                        targetUser={user}
                        onRoleChange={handleRoleChange}
                    />
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        )}
      </div>
    </div>
  );
}

const roles = [
  { value: "MANAGER", label: "Gerente" },
  { value: "USER", label: "Usuário" },
] as const;

function RoleSwitcher({
  currentUserRole,
  currentUserId,
  targetUser,
  onRoleChange,
}: {
  currentUserRole: Role,
  currentUserId: string,
  targetUser: User,
  onRoleChange: (userId: string, role: 'USER' | 'MANAGER') => Promise<void>,
}) {
  const [isUpdating, startUpdateTransition] = useTransition();
  
  const selectedRole = targetUser.role;

  const handleSelect = (newRole: 'USER' | 'MANAGER') => {
    if (newRole !== selectedRole) {
      startUpdateTransition(async () => {
        await onRoleChange(targetUser.id, newRole);
      });
    }
  };

  const isOwner = targetUser.role === 'OWNER';
  const isSelf = targetUser.id === currentUserId;
  const canManageRoles = currentUserRole === 'OWNER';
  
  const isDisabled = isOwner || isSelf || !canManageRoles || isUpdating;
  
  if (isOwner) {
    return (
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-400" />
        <span className="font-medium text-amber-400">Dono</span>
      </div>
    );
  }

  return (
    <Select 
        value={selectedRole}
        onValueChange={handleSelect}
        disabled={isDisabled}
    >
      <SelectTrigger className="w-[140px] bg-slate-800/50 border-border hover:bg-slate-800">
        <SelectValue placeholder="Selecione um cargo" />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            {role.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
