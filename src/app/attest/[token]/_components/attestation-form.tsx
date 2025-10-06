
'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Loader2, 
  UploadCloud, 
  File, 
  Mail, 
  User, 
  X,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { useToast } from '../../../../hooks/use-toast';
import { attestNotePublic } from '../actions.ts';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPE = 'application/pdf';

const formSchema = z.object({
  coordinatorName: z
    .string()
    .min(3, { message: 'O nome completo deve ter pelo menos 3 caracteres.' })
    .max(100, { message: 'O nome não pode exceder 100 caracteres.' })
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, { message: 'O nome deve conter apenas letras e espaços.' }),
  coordinatorEmail: z
    .string()
    .email({ message: 'Por favor, insira um e-mail válido.' })
    .max(255, { message: 'O e-mail não pode exceder 255 caracteres.' }),
  attestedFile: z
    .any()
    .refine((files) => files?.[0], 'O arquivo de atesto é obrigatório.')
    .refine(
      (files) => files?.[0]?.type === ACCEPTED_FILE_TYPE, 
      'Apenas arquivos PDF são permitidos.'
    )
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE, 
      `O arquivo deve ter no máximo ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`
    ),
  observation: z
    .string()
    .max(1000, { message: 'A observação não pode exceder 1000 caracteres.' })
    .optional(),
});

type AttestationFormValues = z.infer<typeof formSchema>;

interface AttestationFormProps {
  token: string;
  onSuccess: () => void;
}

export default function AttestationForm({ token, onSuccess }: AttestationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const form = useForm<AttestationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coordinatorName: '',
      coordinatorEmail: '',
      observation: '',
    },
    mode: 'onBlur', // Valida quando o campo perde o foco
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFile = useCallback((file: File) => {
    if (file.type !== ACCEPTED_FILE_TYPE) {
      toast({
        title: 'Arquivo inválido',
        description: 'Apenas arquivos PDF são aceitos.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo deve ter no máximo ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`,
        variant: 'destructive',
      });
      return;
    }

    const fileList = new DataTransfer();
    fileList.items.add(file);
    
    form.setValue('attestedFile', fileList.files, { shouldValidate: true });
    setFileName(file.name);
    setFileSize(file.size);
  }, [form, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    } else {
      clearFile();
    }
  };

  const clearFile = () => {
    form.setValue('attestedFile', null, { shouldValidate: true });
    setFileName(null);
    setFileSize(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const onSubmit = async (data: AttestationFormValues) => {
    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      formData.append('coordinatorName', data.coordinatorName.trim());
      formData.append('coordinatorEmail', data.coordinatorEmail.trim().toLowerCase());
      formData.append('observation', data.observation?.trim() || '');
      formData.append('attestedFile', data.attestedFile[0]);
      formData.append('token', token);

      const result = await attestNotePublic(formData);

      if (result.success) {
        onSuccess(); // Chama a função de sucesso do pai em vez de gerir o estado localmente
      } else {
        throw new Error(result.message || 'Erro desconhecido');
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Não foi possível processar o ateste. Tente novamente.';
      
      toast({
        title: 'Erro no Ateste',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const { errors, isValid } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <Label 
            htmlFor="coordinatorName" 
            className="text-slate-300 flex items-center gap-2"
          >
            <User className="w-4 h-4" aria-hidden="true" /> 
            Seu Nome Completo *
          </Label>
          <Input
            id="coordinatorName"
            {...form.register('coordinatorName')}
            className="mt-2"
            placeholder="Digite seu nome completo"
            disabled={isSubmitting}
            aria-invalid={!!errors.coordinatorName}
            aria-describedby={errors.coordinatorName ? "coordinatorName-error" : undefined}
          />
          {errors.coordinatorName && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
              <p 
                id="coordinatorName-error" 
                className="text-sm text-red-400"
                role="alert"
              >
                {errors.coordinatorName.message}
              </p>
            </div>
          )}
        </div>

        <div>
          <Label 
            htmlFor="coordinatorEmail" 
            className="text-slate-300 flex items-center gap-2"
          >
            <Mail className="w-4 h-4" aria-hidden="true" /> 
            Seu E-mail para Confirmação *
          </Label>
          <Input
            id="coordinatorEmail"
            type="email"
            {...form.register('coordinatorEmail')}
            className="mt-2"
            placeholder="seu.email@exemplo.com"
            disabled={isSubmitting}
            aria-invalid={!!errors.coordinatorEmail}
            aria-describedby={errors.coordinatorEmail ? "coordinatorEmail-error" : undefined}
          />
          {errors.coordinatorEmail && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
              <p 
                id="coordinatorEmail-error" 
                className="text-sm text-red-400"
                role="alert"
              >
                {errors.coordinatorEmail.message}
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="attestedFile" className="text-slate-300">
          Documento Atestado (PDF) *
        </Label>
        <div 
          className={`mt-2 relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
            dragActive 
              ? 'border-primary bg-primary/10' 
              : fileName 
                ? 'border-green-500 bg-green-900/20' 
                : 'border-slate-600 hover:border-primary/80'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {fileName ? (
            <div className="flex flex-col items-center justify-center text-green-400">
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                  <File className="w-6 h-6" aria-hidden="true" />
                  <div className="text-left">
                    <p className="font-semibold text-white truncate max-w-xs" title={fileName}>
                      {fileName}
                    </p>
                    {fileSize && (
                      <p className="text-sm text-slate-400">
                        {formatFileSize(fileSize)}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  disabled={isSubmitting}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  aria-label="Remover arquivo"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <UploadCloud 
                className={`w-8 h-8 mx-auto mb-2 ${
                  dragActive ? 'text-primary' : 'text-slate-400'
                }`} 
                aria-hidden="true" 
              />
              <p className={`${dragActive ? 'text-primary' : 'text-slate-400'}`}>
                {dragActive ? 'Solte o arquivo aqui' : 'Clique ou arraste o arquivo PDF aqui'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Máximo ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB
              </p>
            </>
          )}
          <Input
            id="attestedFile"
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={isSubmitting}
            aria-invalid={!!errors.attestedFile}
            aria-describedby={errors.attestedFile ? "attestedFile-error" : undefined}
          />
        </div>
        {errors.attestedFile && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
            <p 
              id="attestedFile-error" 
              className="text-sm text-red-400"
              role="alert"
            >
              {errors.attestedFile.message as string}
            </p>
          </div>
        )}
      </div>
      
      <div>
        <Label htmlFor="observation" className="text-slate-300">
          Observação (Opcional)
        </Label>
        <Textarea
          id="observation"
          {...form.register('observation')}
          className="mt-2 min-h-[100px] resize-none"
          placeholder="Adicione qualquer informação relevante..."
          disabled={isSubmitting}
          maxLength={1000}
          aria-invalid={!!errors.observation}
          aria-describedby={errors.observation ? "observation-error" : undefined}
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {errors.observation && (
              <div className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                <p 
                  id="observation-error" 
                  className="text-sm text-red-400"
                  role="alert"
                >
                  {errors.observation.message}
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {form.watch('observation')?.length || 0}/1000
          </p>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={isSubmitting || !isValid} 
        className="w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
            Enviando...
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-5 w-5" aria-hidden="true" />
            Confirmar Ateste
          </>
        )}
      </Button>
    </form>
  );
}
