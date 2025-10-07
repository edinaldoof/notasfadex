'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { addTutorial } from './actions';
import { Loader2, Upload, Video, File as FileIcon } from 'lucide-react';
import { TutorialType } from '@prisma/client';

const formSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  description: z.string().min(1, 'A descrição é obrigatória.'),
  type: z.nativeEnum(TutorialType),
  url: z.string().optional(),
  file: z.any().optional(),
}).refine(
  (data) => {
    if (data.type === 'VIDEO' && (!data.url || data.url.trim() === '')) return false;
    if (data.type === 'FILE' && !data.file?.[0]) return false;
    return true;
  },
  {
    message: 'Forneça uma URL para vídeo ou um arquivo para upload.',
    path: ['url'], // mantém a mensagem próxima ao campo principal
  }
);

type FormValues = z.infer<typeof formSchema>;

interface AddTutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTutorialAdded: () => void;
}

export function AddTutorialDialog({
  open,
  onOpenChange,
  onTutorialAdded,
}: AddTutorialDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      type: TutorialType.VIDEO,
      url: '',
    },
    mode: 'onChange',
  });

  const tutorialType = form.watch('type');

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('type', data.type);

    if (data.type === TutorialType.VIDEO && data.url) {
      formData.append('url', data.url);
    } else if (data.type === TutorialType.FILE && data.file?.[0]) {
      formData.append('file', data.file[0]);
    }

    try {
      await addTutorial(formData);
      toast({ title: 'Sucesso', description: 'Tutorial adicionado.' });
      onTutorialAdded();
      onOpenChange(false);
      form.reset();
      setFileName(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Ocorreu um erro desconhecido';
      toast({
        title: 'Erro',
        description: `Não foi possível adicionar o tutorial: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setFileName(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Novo Tutorial</DialogTitle>
          <DialogDescription>
            Preencha as informações para criar um novo material de ajuda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Tipo de Tutorial */}
          <div className="space-y-2">
            <Label>Tipo de Tutorial</Label>
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <RadioGroup
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <div className="flex items-center gap-2 p-4 border rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                    <RadioGroupItem id="type-video" value={TutorialType.VIDEO} />
                    <Label htmlFor="type-video" className="flex items-center gap-2 cursor-pointer">
                      <Video className="w-5 h-5" />
                      Vídeo do YouTube
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 p-4 border rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                    <RadioGroupItem id="type-file" value={TutorialType.FILE} />
                    <Label htmlFor="type-file" className="flex items-center gap-2 cursor-pointer">
                      <FileIcon className="w-5 h-5" />
                      Arquivo (PDF, DOCX)
                    </Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          {/* Campo condicional: URL ou Arquivo */}
          {tutorialType === TutorialType.VIDEO ? (
            <div className="space-y-2">
              <Label htmlFor="url">URL do Vídeo do YouTube</Label>
              <Input
                id="url"
                placeholder="https://www.youtube.com/watch?v=..."
                {...form.register('url')}
              />
              <p className="text-xs text-muted-foreground">Cole o link completo do vídeo.</p>
              {form.formState.errors.url && (
                <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Arquivo do Tutorial</Label>
              <div className="relative border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground mb-2">
                  {fileName || 'Clique ou arraste o arquivo aqui'}
                </p>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  {...form.register('file', {
                    onChange: (e) => setFileName(e.target.files?.[0]?.name || null),
                  })}
                />
              </div>
            </div>
          )}

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ex: Como atestar uma nota fiscal"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Uma breve explicação sobre o que este tutorial ensina."
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Salvando...' : 'Adicionar Tutorial'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
