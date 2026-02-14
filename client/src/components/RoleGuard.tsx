import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessRoute, type Role } from "@/lib/rolePermissions";
import { canAccessRouteWithCustomRole, setCustomRolesCache } from "@/lib/customRolePermissions";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles?: Role[];
}

export default function RoleGuard({ children, requiredRoles }: RoleGuardProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Fetch custom roles for permission checking
  const { data: customRoles } = trpc.customRoles.getAllCustomRoles.useQuery();
  
  // Update custom roles cache when data changes
  useEffect(() => {
    if (customRoles) {
      setCustomRolesCache(customRoles);
    }
  }, [customRoles]);

  useEffect(() => {
    if (!user) return;

    const userRole = user.role as Role;

    // Check if user has required role (if specified)
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(userRole)) {
        toast.error("Access denied: Insufficient permissions");
        setLocation("/admin/dashboard");
        return;
      }
    }

    // Check if user can access current route
    // First check if user has a custom role
    const hasCustomRoleAccess = (user as any).customRoleId 
      ? canAccessRouteWithCustomRole((user as any).customRoleId, location, customRoles)
      : false;
    
    const hasStandardRoleAccess = canAccessRoute(userRole, location);
    
    if (!hasCustomRoleAccess && !hasStandardRoleAccess) {
      toast.error("Access denied: You don't have permission to access this page");
      setLocation("/admin/dashboard");
    }
  }, [user, location, requiredRoles, setLocation, customRoles]);

  // If user doesn't have access, don't render children
  if (user) {
    const hasCustomRoleAccess = (user as any).customRoleId 
      ? canAccessRouteWithCustomRole((user as any).customRoleId, location, customRoles)
      : false;
    const hasStandardRoleAccess = canAccessRoute(user.role as Role, location);
    
    if (!hasCustomRoleAccess && !hasStandardRoleAccess) {
      return null;
    }
  }

  return <>{children}</>;
}
