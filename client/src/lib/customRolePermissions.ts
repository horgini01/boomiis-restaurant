// Custom role permission checking utilities
// This module extends the standard role permissions to support custom roles

export interface CustomRole {
  id: number;
  roleName: string;
  description: string | null;
  permissions: string[];
  isActive: boolean;
}

// Cache for custom roles to avoid repeated API calls
let customRolesCache: CustomRole[] | null = null;

export function setCustomRolesCache(roles: CustomRole[]) {
  customRolesCache = roles;
}

export function getCustomRolesCache(): CustomRole[] | null {
  return customRolesCache;
}

export function clearCustomRolesCache() {
  customRolesCache = null;
}

// Check if a user with a custom role can access a specific route
export function canAccessRouteWithCustomRole(
  customRoleId: number | null | undefined,
  route: string,
  customRoles?: CustomRole[]
): boolean {
  if (!customRoleId) return false;
  
  const roles = customRoles || customRolesCache;
  if (!roles) return false;
  
  const role = roles.find(r => r.id === customRoleId);
  if (!role || !role.isActive) return false;
  
  // Check exact match or if route starts with allowed path (for sub-routes)
  return role.permissions.some(allowedRoute => 
    route === allowedRoute || route.startsWith(allowedRoute + "/")
  );
}

// Get all accessible routes for a custom role
export function getAccessibleRoutesForCustomRole(
  customRoleId: number | null | undefined,
  customRoles?: CustomRole[]
): string[] {
  if (!customRoleId) return [];
  
  const roles = customRoles || customRolesCache;
  if (!roles) return [];
  
  const role = roles.find(r => r.id === customRoleId);
  if (!role || !role.isActive) return [];
  
  return role.permissions;
}
