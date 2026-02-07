import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessRoute, type Role } from "@/lib/rolePermissions";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { toast } from "sonner";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles?: Role[];
}

export default function RoleGuard({ children, requiredRoles }: RoleGuardProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

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
    if (!canAccessRoute(userRole, location)) {
      toast.error("Access denied: You don't have permission to access this page");
      setLocation("/admin/dashboard");
    }
  }, [user, location, requiredRoles, setLocation]);

  // If user doesn't have access, don't render children
  if (user && !canAccessRoute(user.role as Role, location)) {
    return null;
  }

  return <>{children}</>;
}
