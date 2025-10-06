
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog";
import { LogOut } from 'lucide-react';

export default function SessionHandler() {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Otimizado: Este efeito agora só é acionado quando o valor de session.error muda.
    // Ele não causa mais chamadas repetitivas à API.
    if (session?.error === "RefreshAccessTokenError") {
      setIsModalOpen(true);
    }
  }, [session?.error]);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };
  
  // O componente agora renderiza um modal de forma eficiente quando necessário.
  return (
    <AlertDialog open={isModalOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5" />
            Sessão Expirada
          </AlertDialogTitle>
          <AlertDialogDescription>
            Por questões de segurança, sua sessão expirou. É necessário realizar o login novamente para continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleSignOut}>
            Fazer Login
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
