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
  LogOut,
  Menu as MenuIcon,
  X,
  BarChart3,
  Settings as SettingsIcon,
  Store,
} from 'lucide-react';
import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { restaurantName } = useSettings();
  
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success('Logged out successfully');
      window.location.href = '/admin/login';
    },
  });

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/categories', label: 'Categories', icon: FolderTree },
    { path: '/admin/menu-items', label: 'Menu Items', icon: UtensilsCrossed },
    { path: '/admin/bulk-operations', label: 'Bulk Operations', icon: FolderTree },
    { path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { path: '/admin/reservations', label: 'Reservations', icon: CalendarCheck },
    { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/admin/restaurant-settings', label: 'Restaurant Info', icon: Store },
    { path: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;
        return (
          <Link key={item.path} href={item.path}>
            <Button
              variant={isActive ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
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
          flex-col w-full md:w-64 bg-secondary/20 border-r border-border
          fixed md:sticky top-0 h-screen z-50 md:z-0
        `}
      >
        <div className="p-6 border-b border-border hidden md:block">
          <h1 className="text-2xl font-bold text-primary">{restaurantName} Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Restaurant Management</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-border">
          <div className="mb-4 p-3 rounded-lg bg-background/50">
            <p className="text-sm font-medium">{user?.name || 'Admin'}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
