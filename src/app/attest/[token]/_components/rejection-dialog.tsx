
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, XCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { rejectNotePublic } from '../actions';
import { Input } from '@/components/ui/input';

const rejectionSchema = z.object({
  coordinatorName: z
    .string()
    .min(3, { message: 'Seu nome completo é obrigatório.' }),
  rejectionReason: z
    .string()
    .min(10, { message: 'O motivo da rejeição deve ter pelo menos 10 caracteres.' })
    .max(1000, { message: 'O motivo não pode exceder 1000 caracteres.' }),
});

type RejectionFormValues = z.infer<typeof rejectionSchema>;

interface RejectionDialogProps {
  token: string;
  noteId: string;
  requesterEmail: string | null | undefined;
  onSuccess: () => void;
}

export function RejectionDialog({ token, noteId, requesterEmail, onSuccess }: RejectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<RejectionFormValues>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: {
      coordinatorName: '',
      rejectionReason: '',
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: RejectionFormValues) => {
    setIsSubmitting(true);
    try {
        if (!requesterEmail) {
            throw new Error("E-mail do solicitante não encontrado. Não é possível notificar.");
        }

        const formData = new FormData();
        formData.append('token', token);
        formData.append('noteId', noteId);
        formData.append('coordinatorName', data.coordinatorName);
        formData.append('rejectionReason', data.rejectionReason);

        const result = await rejectNotePublic(formData);

        if (result.success) {
            onSuccess(); // Chama a função de sucesso do pai
            setOpen(false); // Fecha o dialog
        } else {
            throw new Error(result.message || 'Ocorreu um erro desconhecido.');
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Não foi possível processar a rejeição.";
        toast({
            title: 'Erro ao Rejeitar',
            description: errorMessage,
            variant: 'destructive',
        });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        // Reset form when dialog is closed
        setTimeout(() => {
            form.reset();
        }, 200); // Small delay to allow fade-out animation
    }
    setOpen(isOpen);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="link" className="text-destructive hover:text-destructive/80">
          <XCircle className="w-4 h-4 mr-2" />
          Rejeitar Nota Fiscal
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <XCircle className="w-6 h-6 text-destructive" />
                Rejeitar Nota Fiscal
            </AlertDialogTitle>
            <AlertDialogDescription>
              Para rejeitar a nota, é obrigatório fornecer seu nome completo e o motivo da rejeição. O solicitante será notificado por e-mail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 my-6">
             <div>
                <Label htmlFor="coordinatorName-rejection" className="text-slate-300">
                    Seu Nome Completo *
                </Label>
                 <Input
                    id="coordinatorName-rejection"
                    {...form.register('coordinatorName')}
                    className="mt-2"
                    placeholder="Digite seu nome completo"
                    disabled={isSubmitting}
                />
                {form.formState.errors.coordinatorName && (
                    <p className="text-sm text-red-400 mt-1">
                        {form.formState.errors.coordinatorName.message}
                    </p>
                )}
            </div>
            <div>
              <Label htmlFor="rejectionReason" className="text-slate-300">
                Motivo da Rejeição *
              </Label>
              <Textarea
                id="rejectionReason"
                {...form.register('rejectionReason')}
                className="mt-2 min-h-[120px]"
                placeholder="Ex: O valor da nota está incorreto, o serviço descrito não foi o realizado, etc."
                disabled={isSubmitting}
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-1">
                 {form.formState.errors.rejectionReason ? (
                     <p className="text-sm text-red-400">
                        {form.formState.errors.rejectionReason.message}
                    </p>
                 ) : <div></div>}
                <p className="text-xs text-slate-500">
                    {form.watch('rejectionReason')?.length || 0}/1000
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <Button 
                type="submit" 
                variant="destructive"
                disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Confirmando...' : 'Confirmar Rejeição'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
