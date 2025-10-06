"use server";

import { auth } from "../../../auth";
import prisma from "../../../lib/prisma";
import { Role, PermissionType } from "@prisma/client";
import { hasRolePermission } from "./permissions";

/**
 * Checks if the current user has a specific permission.
 * The check considers the user's role and individual permissions.
 *
 * @param requiredPermission The permission required to perform the action.
 * @returns `true` if the user has the permission, `false` otherwise.
 */
export async function hasPermission(
  requiredPermission: PermissionType
): Promise<boolean> {
  const session = await auth();
  const userId = session?.creator?.id;
  const userRole = session?.creator?.role;

  if (!userId || !userRole) {
    return false; // User not authenticated
  }

  // Check if the user's role grants the required permission
  if (hasRolePermission(userRole, requiredPermission)) {
    return true;
  }

  // Fallback to check for a specific user permission in the database
  const userPermission = await prisma.userPermission.findUnique({
    where: {
      userId_permission: {
        userId: userId,
        permission: requiredPermission,
      },
    },
  });

  return !!userPermission; // Returns true if the permission was found, false otherwise
}