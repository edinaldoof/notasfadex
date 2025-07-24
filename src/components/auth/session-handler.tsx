'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';

export default function SessionHandler() {
  const { data: session } = useSession();

  useEffect(() => {
    // Se a sessão contiver o erro que definimos no backend,
    // significa que a renovação do token falhou.
    if (session?.error === "RefreshAccessTokenError") {
      // Força o logout. O `signOut` do NextAuth irá redirecionar
      // para a tela de login que você definiu em `pages`.
      signOut({ callbackUrl: '/login' });
    }
  }, [session]);

  return null; // Este componente não renderiza nada na tela.
}
