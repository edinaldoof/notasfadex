'use client';

import { FilePlus, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppMode } from '@/contexts/app-mode-context';
import { useEffect } from 'react';

export default function SolicitacoesPage() {
  const { setMode } = useAppMode();

  // Garante que o modo da aplicação seja 'request' ao visitar esta página
  useEffect(() => {
    setMode('request');
  }, [setMode]);
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-cyan-600 p-3 rounded-2xl">
              <Handshake className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Solicitações
            </h1>
            <p className="text-muted-foreground mt-1">
              Inicie e acompanhe os pedidos de notas fiscais junto aos fornecedores.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button variant="default" size="lg" disabled>
            <FilePlus className="w-5 h-5 mr-2" />
            Nova Solicitação (Em breve)
          </Button>
        </div>
      </div>

      {/* Placeholder para a tabela/lista de solicitações */}
      <div className="text-center py-16 bg-card backdrop-blur-sm rounded-2xl border border-border mt-8">
        <Handshake className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Módulo em Construção</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Esta área será dedicada ao gerenciamento de solicitações de notas fiscais. Em breve, você poderá criar, enviar e acompanhar todos os seus pedidos aqui.
        </p>
      </div>
    </div>
  );
}
