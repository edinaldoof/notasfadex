
'use client';

import { useState, useEffect, useMemo, useTransition } from "react";
import { useSession } from "next-auth/react";
import { 
  Settings as SettingsIcon, 
  Shield, 
  Loader2, 
  UserCog, 
  Check, 
  ChevronsUpDown,
  Bell,
  Eye,
  Save,
  Send,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { User, Role, Settings, EmailTemplate } from "@prisma/client";
import { 
    getUsers, 
    updateUserRole, 
    sendTestEmail,
    getSettings,
    saveSettings,
    getEmailTemplates,
    saveEmailTemplates
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const placeholderMap = {
    ATTESTATION_REQUEST: [
        { placeholder: '[NomeCoordenador]', description: 'Nome do coordenador responsável pelo ateste.' },
        { placeholder: '[NomeSolicitante]', description: 'Nome do usuário que enviou a nota.' },
        { placeholder: '[DescricaoNota]', description: 'Descrição dos serviços ou produtos da nota.' },
        { placeholder: '[LinkAteste]', description: 'Link direto para a página de atesto da nota.' },
    ],
    ATTESTATION_REMINDER: [
        { placeholder: '[NomeCoordenador]', description: 'Nome do coordenador responsável pelo ateste.' },
        { placeholder: '[DescricaoNota]', description: 'Descrição dos serviços ou produtos da nota.' },
        { placeholder: '[DiasRestantes]', description: 'Número de dias restantes antes do prazo expirar.' },
        { placeholder: '[LinkAteste]', description: 'Link direto para a página de atesto da nota.' },
    ],
    ATTESTATION_CONFIRMATION: [
        { placeholder: '[NomeSolicitante]', description: 'Nome do usuário que enviou a nota.' },
        { placeholder: '[DescricaoNota]', description: 'Descrição dos serviços ou produtos da nota.' },
        { placeholder: '[NomeAtestador]', description: 'Nome do usuário que atestou a nota.' },
        { placeholder: '[DataAtesto]', description: 'Data e hora em que a nota foi atestada.' },
        { placeholder: '[ObservacaoAtesto]', description: 'Observações adicionadas durante o atesto.' },
    ],
    NOTE_EXPIRED: [
        { placeholder: '[NomeCoordenador]', description: 'Nome do coordenador que deveria ter atestado.' },
        { placeholder: '[NomeSolicitante]', description: 'Nome do usuário que enviou a nota.' },
        { placeholder: '[DescricaoNota]', description: 'Descrição dos serviços ou produtos da nota.' },
        { placeholder: '[DataExpiracao]', description: 'Data em que o prazo para atesto expirou.' },
    ]
};


export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [isSaving, startSavingTransition] = useTransition();
  const [isSendingTest, startSendingTestTransition] = useTransition();
  
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [templates, setTemplates] = useState<Partial<Record<EmailTemplate['type'], EmailTemplate>>>({});
  const [testEmail, setTestEmail] = useState('');
  
  const { toast } = useToast();

  const currentUserRole = session?.user?.role;
  const hasPermission = currentUserRole === 'OWNER' || currentUserRole === 'MANAGER';
  
  useEffect(() => {
    async function loadData() {
        if (!hasPermission) {
            setLoading(false);
            return;
        }
        try {
            const [settingsData, templatesData] = await Promise.all([
                getSettings(),
                getEmailTemplates(),
            ]);

            setSettings(settingsData);
            
            const templatesMap = templatesData.reduce((acc, t) => {
                acc[t.type] = t;
                return acc;
            }, {} as Record<EmailTemplate['type'], EmailTemplate>);
            setTemplates(templatesMap);

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
  }, [status, hasPermission, toast]);

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
            await saveSettings(settings);
            await saveEmailTemplates(templatesToSave);
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

  if (loading || status === 'loading') {
    return (
        <div>
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <SettingsIcon className="w-8 h-8" />
                Configurações
            </h1>
            <SettingsSkeleton />
        </div>
    );
  }

  if (!hasPermission) {
    return (
         <div>
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <SettingsIcon className="w-8 h-8" />
                Configurações
            </h1>
            <AccessDenied />
        </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="w-8 h-8" />
          Configurações
        </h1>
         <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isSaving ? 'Salvando...' : 'Salvar Todas as Configurações'}
        </Button>
      </div>
      
      <div className="grid gap-8">
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
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                    <TabsTrigger value="ATTESTATION_REQUEST"><Mail className="w-4 h-4 mr-2"/> Solicitação</TabsTrigger>
                    <TabsTrigger value="ATTESTATION_REMINDER"><Clock className="w-4 h-4 mr-2"/> Lembrete</TabsTrigger>
                    <TabsTrigger value="ATTESTATION_CONFIRMATION"><CheckCircle2 className="w-4 h-4 mr-2"/> Confirmação</TabsTrigger>
                    <TabsTrigger value="NOTE_EXPIRED"><AlertTriangle className="w-4 h-4 mr-2"/> Expiração</TabsTrigger>
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
        {currentUserRole === 'OWNER' && (
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

    const emailPreview = useMemo(() => {
        if (!template?.body) return '';
        let previewHtml = template.body;
        placeholders.forEach(p => {
            const sampleData = `<span class="font-semibold text-primary">${p.placeholder.replace(/[\[\]]/g, '')}</span>`;
            previewHtml = previewHtml.replace(new RegExp(p.placeholder.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g'), sampleData);
        });
        return previewHtml;
    }, [template?.body, placeholders]);

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
                        <div className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: emailPreview }} />
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
          Atribua cargos de "Gerente" para permitir que usuários atestem notas de outros colaboradores.
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
  const [open, setOpen] = useState(false);
  const [isUpdating, startUpdateTransition] = useTransition();
  
  const selectedRole = targetUser.role;

  const handleSelect = (newRole: 'USER' | 'MANAGER') => {
    setOpen(false);
    if (newRole !== selectedRole) {
      startUpdateTransition(async () => {
        await onRoleChange(targetUser.id, newRole);
      });
    }
  };

  const isOwner = targetUser.role === 'OWNER';
  const isSelf = targetUser.id === currentUserId;
  const canManageRoles = currentUserRole === 'OWNER';
  
  const isDisabled = isOwner || isSelf || !canManageRoles;
  
  if (isOwner) {
    return (
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-400" />
        <span className="font-medium text-amber-400">Dono</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[140px] justify-between bg-slate-800/50 border-border hover:bg-slate-800"
          disabled={isUpdating || isDisabled}
        >
          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : (roles.find(r => r.value === selectedRole)?.label || 'Selecione...')}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[140px] p-0">
        <Command>
          <CommandGroup>
            <CommandList>
              {roles.map((role) => (
                <CommandItem
                  key={role.value}
                  value={role.label}
                  onSelect={() => {
                    handleSelect(role.value as 'USER' | 'MANAGER');
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedRole === role.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {role.label}
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
