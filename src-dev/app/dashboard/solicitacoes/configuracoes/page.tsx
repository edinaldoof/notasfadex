
'use client';

import { useState, useEffect, useMemo, useTransition } from "react";
import { useSession } from "next-auth/react";
import { 
  Settings as SettingsIcon, 
  Shield, 
  Loader2, 
  UserCog, 
  Save,
  Send,
  Mail,
  Eye,
  ExternalLink,
  Bell,
  Clock,
  ClipboardCheck,
  XCircle,
} from "lucide-react";
import { User, Role } from "@prisma/client";
import { 
    getUsers, 
    updateUserRole, 
    sendTestEmail,
    getSettings,
    saveSettings,
    getEmailTemplates,
    saveEmailTemplates,
} from "../../settings/actions"; // Reutilizando as actions globais
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppMode } from "@/contexts/app-mode-context";
import { EmailTemplate, TemplateType } from "@/lib/types";

// Reutilizando componentes da página de settings principal
function SettingsSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    );
}

function AccessDenied() {
  return (
     <div className="bg-slate-100 rounded-xl p-8 border text-center">
        <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Você não tem permissão para gerenciar as configurações de solicitações.
        </p>
    </div>
  )
}

const placeholderMap: Record<string, { placeholder: string; description: string }[]> = {
    OF_ENVIO: [
        { placeholder: '[NomeFornecedor]', description: 'Nome do fornecedor que receberá a OF.' },
        { placeholder: '[NumeroOF]', description: 'Número único da Ordem de Fornecimento.' },
        { placeholder: '[NomeProjeto]', description: 'Nome do projeto relacionado.' },
        { placeholder: '[LinkConfirmacao]', description: 'Link para o fornecedor confirmar o recebimento.' },
        { placeholder: '[InstrucoesFaturamento]', description: 'Instruções de faturamento que devem constar na NF.' },
    ],
    OF_LEMBRETE_CONFIRMACAO: [
        { placeholder: '[NomeFornecedor]', description: 'Nome do fornecedor.' },
        { placeholder: '[NumeroOF]', description: 'Número da Ordem de Fornecimento pendente.' },
        { placeholder: '[DataEnvio]', description: 'Data em que a OF original foi enviada.' },
        { placeholder: '[LinkConfirmacao]', description: 'Link para confirmar o recebimento.' },
    ],
    OF_CONFIRMACAO_INTERNA: [
        { placeholder: '[NomeSolicitante]', description: 'Nome do colaborador que criou a OF.' },
        { placeholder: '[NomeFornecedor]', description: 'Nome do fornecedor que confirmou.' },
        { placeholder: '[NumeroOF]', description: 'Número da OF confirmada.' },
        { placeholder: '[DataConfirmacao]', description: 'Data e hora da confirmação.' },
    ],
    OF_LEMBRETE_NF: [
        { placeholder: '[NomeFornecedor]', description: 'Nome do fornecedor.' },
        { placeholder: '[NumeroOF]', description: 'Número da OF pendente de nota fiscal.' },
        { placeholder: '[PrazoNF]', description: 'Data limite para o envio da nota fiscal.' },
    ],
    OF_CANCELADA: [
        { placeholder: '[NomeFornecedor]', description: 'Nome do fornecedor.' },
        { placeholder: '[NumeroOF]', description: 'Número da OF que foi cancelada.' },
        { placeholder: '[MotivoCancelamento]', description: 'Motivo pelo qual a OF foi cancelada.' },
    ]
};


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
        <div className="border rounded-lg p-4 bg-slate-50/50">
             <div className="mb-4">
                <Label htmlFor={`subject-${template.type}`} className="block text-sm font-medium text-foreground mb-2">Assunto do E-mail</Label>
                <Input
                    id={`subject-${template.type}`}
                    value={template.subject || ''}
                    onChange={(e) => onTemplateChange('subject', e.target.value)}
                    className="w-full bg-white"
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor={`template-${template.type}`} className="block text-sm font-medium text-foreground mb-2">Corpo do E-mail (HTML)</Label>
                    <Textarea
                        id={`template-${template.type}`}
                        value={template.body || ''}
                        onChange={(e) => onTemplateChange('body', e.target.value)}
                        className="w-full h-80 bg-white p-4 font-mono text-sm"
                        placeholder="Escreva o corpo do email em HTML aqui..."
                    />
                </div>
                <div>
                    <Label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2"><Eye /> Preview</Label>
                    <div className="border rounded-lg p-4 h-80 overflow-y-auto bg-white">
                        <div className="text-sm text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: emailPreview }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                 <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Placeholders Disponíveis</h4>
                    <div className="border rounded-lg p-4 max-h-48 overflow-y-auto bg-white">
                        <ul className="space-y-2">
                        {placeholders.map(p => (
                            <li key={p.placeholder}>
                                <code className="text-xs bg-slate-200 p-1 rounded-sm text-amber-700">{p.placeholder}</code>
                                <p className="text-xs text-muted-foreground pl-1">{p.description}</p>
                            </li>
                        ))}
                        </ul>
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Testar Template</h4>
                     <div className="border rounded-lg p-4 bg-white">
                        <Label htmlFor="test-email-input" className="text-xs text-muted-foreground">Enviar para:</Label>
                         <div className="flex flex-col sm:flex-row items-center mt-1 gap-2">
                            <Input
                                id="test-email-input"
                                type="email"
                                placeholder="email@exemplo.com"
                                value={testEmail}
                                onChange={(e) => onTestEmailChange(e.target.value)}
                                className="w-full sm:w-auto flex-grow"
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
    <div className="bg-card rounded-xl border">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <UserCog />
            Gerenciamento de Cargos
        </h2>
        <p className="text-muted-foreground">
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
                <TableRow className="hover:bg-transparent">
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[180px]">Cargo</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => (
                <TableRow key={user.id}>
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
        <Shield className="w-4 h-4 text-amber-500" />
        <span className="font-medium text-amber-500">Dono</span>
      </div>
    );
  }

  return (
    <Select 
        value={selectedRole}
        onValueChange={handleSelect}
        disabled={isDisabled}
    >
      <SelectTrigger className="w-[140px]">
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

export default function SolicitacoesSettingsPage() {
  const { data: session, status } = useSession();
  const { setMode } = useAppMode();
  const [loading, setLoading] = useState(true);
  const [isSaving, startSavingTransition] = useTransition();
  const [isSendingTest, startSendingTestTransition] = useTransition();
  
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [templates, setTemplates] = useState<Partial<Record<TemplateType, EmailTemplate>>>({});
  const [testEmail, setTestEmail] = useState('');
  
  const { toast } = useToast();

  const currentUserRole = session?.user?.role;
  const hasPermission = currentUserRole === 'OWNER' || currentUserRole === 'MANAGER';
  
  useEffect(() => {
    setMode('request');
  }, [setMode]);

  useEffect(() => {
    async function loadData() {
        if (!hasPermission) {
            setLoading(false);
            return;
        }
        try {
            const allTemplates = await getEmailTemplates();
            const requestTemplates = allTemplates.filter(t => t.type.startsWith('OF_'));
            
            const templatesMap = requestTemplates.reduce((acc, t) => {
                acc[t.type as TemplateType] = t;
                return acc;
            }, {} as Record<TemplateType, EmailTemplate>);
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

  const handleTemplateChange = (type: TemplateType, field: 'subject' | 'body', value: string) => {
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
            await saveEmailTemplates(templatesToSave);
            toast({
                title: 'Sucesso!',
                description: 'Configurações de solicitação salvas com sucesso.',
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
    return <SettingsSkeleton />;
  }

  if (!hasPermission) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
            <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-primary to-green-400 p-3 rounded-xl">
                    <SettingsIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-foreground">
                        Configurações de Solicitações
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Ajuste os templates e regras do módulo de Ordens de Fornecimento.
                    </p>
                </div>
            </div>
             <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
        </div>
      
      <div className="grid gap-8">
        <div className="bg-card p-6 rounded-xl border">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                <Bell />
                Templates de E-mail de Solicitação
            </h2>
             <p className="text-muted-foreground mb-6">
                Personalize as mensagens enviadas durante o fluxo de solicitação.
            </p>
            
            <Tabs defaultValue="OF_ENVIO" className="w-full">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-5 h-auto">
                    <TabsTrigger value="OF_ENVIO"><Send className="w-4 h-4 mr-2"/> Envio OF</TabsTrigger>
                    <TabsTrigger value="OF_LEMBRETE_CONFIRMACAO"><Clock className="w-4 h-4 mr-2"/> Lembrete Confirmação</TabsTrigger>
                    <TabsTrigger value="OF_CONFIRMACAO_INTERNA"><ClipboardCheck className="w-4 h-4 mr-2"/> Confirmação Interna</TabsTrigger>
                    <TabsTrigger value="OF_LEMBRETE_NF"><Clock className="w-4 h-4 mr-2"/> Lembrete NF</TabsTrigger>
                    <TabsTrigger value="OF_CANCELADA"><XCircle className="w-4 h-4 mr-2"/> Cancelamento</TabsTrigger>
                </TabsList>

                {(Object.keys(templates) as Array<keyof typeof templates>).map(type => (
                    <TabsContent key={type} value={type} className="mt-4">
                        <EmailTemplateEditor
                            template={templates[type]}
                            placeholders={placeholderMap[type] || []}
                            onTemplateChange={(field, value) => handleTemplateChange(type as TemplateType, field, value)}
                            onSendTest={(body, subject) => handleSendTestEmail(body, subject)}
                            testEmail={testEmail}
                            onTestEmailChange={setTestEmail}
                            isSendingTest={isSendingTest}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
        
        {currentUserRole === 'OWNER' && (
            <UserManagement currentUserId={session?.user?.id ?? ''} currentUserRole={currentUserRole} />
        )}
      </div>
    </div>
  );
}
