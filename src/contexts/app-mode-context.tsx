'use client';

import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Define os modos possíveis da aplicação
export type AppMode = 'attest' | 'request';

// Define a estrutura do nosso contexto
interface AppModeContextType {
  mode: AppMode;
  toggleMode: () => void;
  setMode: (mode: AppMode) => void;
}

// Cria o contexto com um valor padrão (que não será usado diretamente)
const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

// Cria o Provedor (Provider) que envolverá nossa aplicação
export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('attest'); // O modo padrão é 'attest'
  const pathname = usePathname();

  useEffect(() => {
    // Sincroniza o modo com a rota atual
    if (pathname.includes('/solicitacoes')) {
      setMode('request');
    } else {
      setMode('attest');
    }
  }, [pathname]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'attest' ? 'request' : 'attest'));
  };

  // Usamos useMemo para evitar recriações desnecessárias do objeto de valor do contexto
  const value = useMemo(() => ({ mode, toggleMode, setMode }), [mode]);

  return (
    <AppModeContext.Provider value={value}>
      {children}
    </AppModeContext.Provider>
  );
}

// Cria um hook customizado para facilitar o uso do contexto
export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}
