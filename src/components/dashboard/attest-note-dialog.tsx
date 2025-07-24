
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FiscalNote } from '@/lib/types';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface AttestNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: FiscalNote;
  onConfirm: (formData: FormData) => void;
  isPending: boolean;
}

export function AttestNoteDialog({ open, onOpenChange, note, onConfirm, isPending }: AttestNoteDialogProps) {
  const { toast } = useToast();
  const [attestedFile, setAttestedFile] = useState<File | undefined>();
  const [fileName, setFileName] = useState<string | null>(null);
  const [observation, setObservation] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Arquivo Inválido',
          description: 'Por favor, anexe um arquivo PDF.',
          variant: 'destructive',
        });
        return;
      }
      setAttestedFile(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('noteId', note.id);
    if (observation) {
        formData.append('observation', observation);
    }
    if (attestedFile) {
        formData.append('attestedFile', attestedFile);
    }
    onConfirm(formData);
  };
  
  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setAttestedFile(undefined);
      setFileName(null);
      setObservation('');
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-900 rounded-2xl border-slate-800/50 w-full max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Confirmar Atesto da Nota</DialogTitle>
          <DialogDescription className="text-slate-400 pt-2">
            Você está prestes a atestar a nota fiscal <span className="font-bold text-primary">{note.description}</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
            <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-amber-200 text-sm">
                    Ao confirmar, você atesta que os serviços ou produtos descritos foram recebidos ou prestados conforme o acordo e se responsabiliza pela veracidade das informações para os devidos fins financeiros e administrativos.
                </p>
            </div>

            <div>
                <Label className="block text-sm font-medium text-slate-300 mb-2">Anexar PDF Atestado (Opcional)</Label>
                <div className="relative border-2 border-dashed border-slate-700/50 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-400 mb-2">
                       {fileName ? `Arquivo: ${fileName}` : "Clique para fazer upload"}
                    </p>
                    <p className="text-sm text-slate-500">Apenas PDF</p>
                    <Input 
                       type="file" 
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                       accept=".pdf" 
                       onChange={handleFileChange}
                       disabled={isPending}
                    />
                </div>
            </div>

            <div>
              <Label htmlFor="observation" className="block text-sm font-medium text-slate-300 mb-2">
                Observação (Opcional)
              </Label>
              <Textarea
                id="observation"
                placeholder="Adicione qualquer informação relevante..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="w-full bg-slate-800/50 border-border rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-primary/50 focus:outline-none transition-colors"
                disabled={isPending}
              />
            </div>
        </div>

        <DialogFooter className='gap-2 sm:gap-0 pt-4'>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="flex-1 sm:flex-none"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="flex-1"
            disabled={isPending}
          >
            {isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
            {isPending ? 'Confirmando...' : 'Confirmar Atesto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    