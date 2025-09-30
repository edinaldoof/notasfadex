
'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Role, PermissionType } from '@prisma/client';

/**
 * Verifica se o usuário atual tem uma determinada permissão.
 * A verificação considera o cargo (Role) e as permissões individuais (UserPermission).
 *
 * @param requiredPermission A permissão necessária para executar a ação.
 * @returns `true` se o usuário tiver a permissão, `false` caso contrário.
 */
export async function hasPermission(requiredPermission: PermissionType): Promise<boolean> {
  const session = await auth();
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  if (!userId || !userRole) {
    return false; // Usuário não autenticado
  }

  // Admins (OWNER, MANAGER) sempre têm permissão
  if (userRole === Role.OWNER || userRole === Role.MANAGER) {
    return true;
  }

  // Verifica se o usuário tem a permissão específica no banco de dados
  const userPermission = await prisma.userPermission.findUnique({
    where: {
      userId_permission: {
        userId: userId,
        permission: requiredPermission,
      },
    },
  });

  return !!userPermission; // Retorna true se a permissão foi encontrada, false caso contrário
}
