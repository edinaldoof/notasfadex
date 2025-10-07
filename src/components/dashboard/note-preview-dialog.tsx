
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Minimize2,
  Loader2,
  FileText,
  Image,
  File,
  Share2,
  Printer,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

interface NotePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName: string;
  fileType?: string; // opcional: para determinar o tipo de arquivo
}

export function NotePreviewDialog({ 
  open, 
  onOpenChange, 
  fileUrl, 
  fileName,
  fileType 
}: NotePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showToolbar, setShowToolbar] = useState(true);

  // Detectar tipo de arquivo pela extensão
  const getFileType = () => {
    if (fileType) return fileType;
    const extension = fileName?.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(extension || '')) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) return 'image';
    return 'document';
  };

  const type = getFileType();

  // Reset estados quando o dialog abrir
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (open) {
      setIsLoading(true);
      setLoadError(false);
      setZoom(100);
      setRotation(0);
      setIsFullscreen(false);

      // Adiciona um timeout para o caso de o iframe não carregar
      timeoutId = setTimeout(() => {
        if (isLoading) {
          setLoadError(true);
          setIsLoading(false);
        }
      },30000000); // sei lá segundos
    }

    return () => {
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleLoaded = () => {
    setIsLoading(false);
    setLoadError(false);
  };

  // Handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open(fileUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: fileName,
          text: `Confira este arquivo: ${fileName}`,
          url: fileUrl,
        });
      } catch (err) {
        console.log('Erro ao compartilhar:', err);
      }
    } else {
      // Fallback: copiar link
      navigator.clipboard.writeText(fileUrl);
      // Você pode adicionar um toast notification aqui
    }
  };

  // Ícone baseado no tipo de arquivo
  const FileTypeIcon = () => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'image':
        return <Image className="w-5 h-5 text-blue-400" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-800/50 w-full max-w-6xl h-[95vh] flex flex-col p-0 shadow-2xl">
        {/* Header aprimorado */}
        <DialogHeader className="p-4 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileTypeIcon />
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {fileName}
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-1">
                  Visualizando • Zoom: {zoom}% • Rotação: {rotation}°
                </p>
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              {/* Toolbar Toggle */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowToolbar(!showToolbar)}
                className="text-slate-400 hover:text-white"
              >
                {showToolbar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>

              {/* Compartilhar */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleShare}
                className="text-slate-400 hover:text-white"
              >
                <Share2 className="w-4 h-4" />
              </Button>

              {/* Imprimir */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handlePrint}
                className="text-slate-400 hover:text-white"
              >
                <Printer className="w-4 h-4" />
              </Button>

              {/* Download */}
              <Button 
                variant="outline" 
                size="sm"
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
                asChild
              >
                <a href={fileUrl} download={fileName}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </a>
              </Button>

              {/* Fechar */}
              <DialogClose asChild>

              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar de controles */}
        {showToolbar && (
          <div className="flex items-center justify-center gap-2 p-3 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="text-slate-400 hover:text-white disabled:opacity-50"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <span className="text-sm text-slate-300 px-3 min-w-[60px] text-center">
                {zoom}%
              </span>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="text-slate-400 hover:text-white disabled:opacity-50"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-slate-700" />

            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRotate}
              className="text-slate-400 hover:text-white"
            >
              <RotateCw className="w-4 h-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleFullscreen}
              className="text-slate-400 hover:text-white"
            >
              {isFullscreen ? 
                <Minimize2 className="w-4 h-4" /> : 
                <Maximize2 className="w-4 h-4" />
              }
            </Button>
          </div>
        )}
        
        {/* Área de visualização aprimorada */}
        <div className="flex-1 relative overflow-auto bg-slate-950/50 p-4">
          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm text-slate-400">Carregando documento...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {loadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-3 text-center p-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <p className="font-semibold text-white">Falha ao Carregar</p>
                <p className="text-sm text-slate-400 max-w-xs">
                    Não foi possível exibir o documento. Verifique sua conexão ou se você tem permissão para acessá-lo.
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>Recarregar</Button>
              </div>
            </div>
          )}

          {/* Container do iframe com transformações */}
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.3s ease-in-out'
            }}
          >
            <iframe
              src={fileUrl}
              className="w-full h-full border-0 rounded-lg shadow-2xl bg-white"
              title={`Preview de ${fileName}`}
              onLoad={handleLoaded}
              style={{
                display: isLoading || loadError ? 'none' : 'block',
                minHeight: '600px',
                backgroundColor: type === 'pdf' ? '#525659' : '#ffffff'
              }}
            />
          </div>
        </div>

        {/* Footer opcional com informações adicionais */}
        <div className="p-3 border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Utilize os controles acima para ajustar a visualização</span>
            <span>© Sistema de Notas</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
