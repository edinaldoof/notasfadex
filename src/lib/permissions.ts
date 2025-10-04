import { Role, PermissionType } from "@prisma/client";

export const rolePermissions: Record<Role, PermissionType[]> = {
  [Role.OWNER]: [
    PermissionType.NOTE_CREATE,
    PermissionType.NOTE_READ,
    PermissionType.NOTE_UPDATE,
    PermissionType.NOTE_DELETE,
    PermissionType.USER_MANAGE,
  ],
  [Role.MANAGER]: [
    PermissionType.NOTE_CREATE,
    PermissionType.NOTE_READ,
    PermissionType.NOTE_UPDATE,
    PermissionType.NOTE_DELETE,
  ],
  [Role.MEMBER]: [
    PermissionType.NOTE_CREATE,
    PermissionType.NOTE_READ,
    PermissionType.NOTE_UPDATE,
  ],
  [Role.VIEWER]: [PermissionType.NOTE_READ],
};

export function hasRolePermission(
  role: Role,
  permission: PermissionType
): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}