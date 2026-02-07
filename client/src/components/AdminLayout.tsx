import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  UtensilsCrossed,
  FolderTree,
  ShoppingBag,
  CalendarCheck,
  Calendar,
  LogOut,
  Menu as MenuIcon,
  X,
  BarChart3,
  Settings as SettingsIcon,
  Store,
  Mail,
  Users,
  UserCog,
  Send,
  MessageSquare,
  MailCheck,
  MessageCircle,
  Star,
  Image,
  FileText,
  BookOpen,
  Scale,
  Shield,
  FileSearch,
  Lock,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { canAccessRoute, type Role } from '@/lib/rolePermissions';
import { canAccessRouteWithCustomRole } from '@/lib/customRolePermissions';
import RoleGuard from './RoleGuard';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { restaurantName } = useSettings();
  
  // Sidebar state management with localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminSidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });
  
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminSidebarPinned');
      return saved !== 'false'; // Default to pinned
    }
    return true;
  });
  
  // Fetch custom roles for navigation filtering
  const { data: customRoles } = trpc.customRoles.getAllCustomRoles.useQuery();
  
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success('Logged out successfully');
      window.location.href = '/admin/login';
    },
  });

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', String(isCollapsed));
  }, [isCollapsed]);
  
  useEffect(() => {
    localStorage.setItem('adminSidebarPinned', String(isPinned));
  }, [isPinned]);

  const allNavItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/categories', label: 'Categories', icon: FolderTree },
    { path: '/admin/menu-items', label: 'Menu Items', icon: UtensilsCrossed },

    { path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { path: '/admin/reservations', label: 'Reservations', icon: CalendarCheck },
    { path: '/admin/events', label: 'Events & Catering', icon: Calendar },
    { path: '/admin/reviews', label: 'Reviews', icon: Star },
    { path: '/admin/testimonials', label: 'Testimonials', icon: MessageSquare },
    { path: '/admin/response-templates', label: 'Response Templates', icon: MessageSquare },
    { path: '/admin/gallery', label: 'Gallery', icon: Image },
    { path: '/admin/blog', label: 'Blog', icon: FileText },
    { path: '/admin/about-content', label: 'About Content', icon: BookOpen },
    { path: '/admin/legal-pages', label: 'Legal Pages', icon: Scale },
    { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/admin/users', label: 'Admin Users', icon: UserCog },
    { path: '/admin/custom-roles', label: 'Custom Roles', icon: Shield },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileSearch },
    { path: '/admin/email-delivery', label: 'Email Delivery', icon: Mail },
    { path: '/admin/newsletter-subscribers', label: 'Newsletter Subscribers', icon: Users },
    { path: '/admin/email-campaigns', label: 'Email Campaigns', icon: Send },
    { path: '/admin/email-tracking', label: 'Email Tracking', icon: MailCheck },
    { path: '/admin/sms-templates', label: 'SMS Templates', icon: MessageSquare },
    { path: '/admin/sms-analytics', label: 'SMS Analytics', icon: MessageCircle },
    { path: '/admin/restaurant-settings', label: 'Restaurant Info', icon: Store },
    { path: '/admin/settings', label: 'Settings', icon: SettingsIcon },
    { path: '/admin/change-password', label: 'Change Password', icon: Lock },
  ];

  // Filter navigation items based on user role
  const navItems = useMemo(() => {
    if (!user?.role) return [];
    
    return allNavItems.filter(item => {
      // Check standard role access
      const hasStandardAccess = canAccessRoute(user.role as Role, item.path);
      
      // Check custom role access if user has a custom role
      const hasCustomAccess = user.customRoleId 
        ? canAccessRouteWithCustomRole(user.customRoleId, item.path, customRoles)
        : false;
      
      return hasStandardAccess || hasCustomAccess;
    });
  }, [user?.role, user?.customRoleId, customRoles]);

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;
        return (
          <Link key={item.path} href={item.path}>
            <div
              className={`
                w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer
                ${isActive 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'hover:bg-accent hover:text-accent-foreground'
                }
              `}
              onClick={() => setMobileMenuOpen(false)}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'} flex-shrink-0`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </div>
          </Link>
        );
      })}
    </>
  );

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  const togglePin = () => {
    setIsPinned(!isPinned);
  };

  return (
    <RoleGuard>
      <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background">
        <h1 className="text-xl font-bold text-primary">{restaurantName} Admin</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          ${mobileMenuOpen ? 'flex' : 'hidden'} md:flex
          flex-col ${isCollapsed ? 'md:w-20' : 'md:w-64'} bg-secondary/20 border-r border-border
          fixed md:sticky top-0 h-screen z-50 md:z-0
          transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'w-64' : ''}
        `}
      >
        {/* Header with collapse/pin controls */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-primary truncate">{restaurantName} Admin</h1>
              <p className="text-xs text-muted-foreground truncate">Restaurant Management</p>
            </div>
          )}
          
          <div className="flex items-center gap-1 ml-auto">
            {/* Pin/Unpin button - desktop only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePin}
              className="h-8 w-8 hidden md:flex"
              title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            </Button>
            
            {/* Collapse/Expand button - desktop only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="h-8 w-8 hidden md:flex"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <NavLinks />
        </nav>

        {/* User info and logout */}
        <div className="p-4 border-t border-border">
          {!isCollapsed ? (
            <>
              <div className="mb-4 p-3 rounded-lg bg-background/50">
                <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="w-full"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container py-8">
          {children}
        </div>
      </main>
    </div>
    </RoleGuard>
  );
}
