
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UploadCloud, File, ShieldCheck, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { attestNotePublic } from '../actions';

const formSchema = z.object({
  coordinatorName: z.string().min(3, { message: 'O nome completo é obrigatório.' }),
  attestedFile: z.any()
    .refine((files) => files?.[0], 'O arquivo de atesto é obrigatório.')
    .refine((files) => files?.[0]?.type === 'application/pdf', 'Apenas arquivos PDF são permitidos.')
    .refine((files) => files?.[0]?.size <= 10000000, `O tamanho máximo do arquivo é 10MB.`),
  observation: z.string().optional(),
});

type AttestationFormValues = z.infer<typeof formSchema>;

interface AttestationFormProps {
    token: string;
}

export default function AttestationForm({ token }: AttestationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<AttestationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coordinatorName: '',
      observation: '',
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    form.setValue('attestedFile', event.target.files);
    if (file) {
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  };

  const onSubmit = async (data: AttestationFormValues) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('coordinatorName', data.coordinatorName);
    formData.append('observation', data.observation || '');
    formData.append('attestedFile', data.attestedFile[0]);
    formData.append('token', token);

    const result = await attestNotePublic(formData);

    if (result.success) {
      setIsSuccess(true);
    } else {
      toast({
        title: 'Erro no Ateste',
        description: result.message || 'Não foi possível processar o ateste. Tente novamente.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };
  
  if (isSuccess) {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-green-900/30 border border-green-500/30 rounded-lg">
            <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
            <h2 className="text-2xl font-bold text-white">Atesto Concluído!</h2>
            <p className="text-slate-300 mt-2">
                A nota fiscal foi atestada com sucesso. Obrigado pela sua colaboração.
            </p>
        </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="coordinatorName" className='text-slate-300'>Seu Nome Completo</Label>
        <Input
          id="coordinatorName"
          {...form.register('coordinatorName')}
          className="mt-2"
          placeholder="Digite seu nome para confirmar"
        />
        {form.formState.errors.coordinatorName && (
          <p className="text-sm text-red-400 mt-1">{form.formState.errors.coordinatorName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="attestedFile" className='text-slate-300'>Documento Atestado (PDF)</Label>
        <div className="mt-2 relative border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-primary/80 transition-colors">
            {fileName ? (
                <div className='flex flex-col items-center justify-center text-green-400'>
                    <File className='w-8 h-8 mx-auto mb-2' />
                    <p className="font-semibold">{fileName}</p>
                </div>
            ) : (
                <>
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-400">Clique ou arraste o arquivo aqui</p>
                </>
            )}
            <Input
                id="attestedFile"
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf"
                {...form.register('attestedFile')}
                onChange={handleFileChange}
                disabled={isSubmitting}
            />
        </div>
         {form.formState.errors.attestedFile && (
          <p className="text-sm text-red-400 mt-1">{form.formState.errors.attestedFile.message as string}</p>
        )}
      </div>
      
       <div>
        <Label htmlFor="observation" className='text-slate-300'>Observação (Opcional)</Label>
        <Textarea
          id="observation"
          {...form.register('observation')}
          className="mt-2 min-h-[100px]"
          placeholder="Adicione qualquer informação relevante..."
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full py-3 text-base">
        {isSubmitting ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <ShieldCheck className="mr-2 h-5 w-5" />
        )}
        {isSubmitting ? 'Enviando...' : 'Confirmar Ateste'}
      </Button>
    </form>
  );
}
