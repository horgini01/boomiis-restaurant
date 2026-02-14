import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Search,
  ChevronDown,
  ChevronUp,
  StarOff,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { canAccessRoute, type Role } from '@/lib/rolePermissions';
import { canAccessRouteWithCustomRole } from '@/lib/customRolePermissions';
import RoleGuard from './RoleGuard';
import Breadcrumb, { routeToBreadcrumb } from './Breadcrumb';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  category: string;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  
  // Navigation group expanded state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminNavGroupsExpanded');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    // Default: all groups expanded
    return {
      'Dashboard': true,
      'Content Management': true,
      'Customer Engagement': true,
      'Communication': true,
      'System Settings': true,
      'Analytics & Logs': true,
    };
  });
  
  // Favorites state management
  const [favoritePaths, setFavoritePaths] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminFavoritePages');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return [];
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
  
  useEffect(() => {
    localStorage.setItem('adminNavGroupsExpanded', JSON.stringify(expandedGroups));
  }, [expandedGroups]);
  
  useEffect(() => {
    localStorage.setItem('adminFavoritePages', JSON.stringify(favoritePaths));
  }, [favoritePaths]);
  
  const toggleFavorite = (path: string) => {
    setFavoritePaths(prev => {
      if (prev.includes(path)) {
        // Remove from favorites
        return prev.filter(p => p !== path);
      } else {
        // Add to favorites (max 5)
        if (prev.length >= 5) {
          toast.error('Maximum 5 favorite pages allowed');
          return prev;
        }
        return [...prev, path];
      }
    });
  };
  
  const isFavorite = (path: string) => favoritePaths.includes(path);

  const allNavItems: NavItem[] = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Dashboard' },
    
    // Content Management
    { path: '/admin/categories', label: 'Categories', icon: FolderTree, category: 'Content Management' },
    { path: '/admin/menu-items', label: 'Menu Items', icon: UtensilsCrossed, category: 'Content Management' },
    { path: '/admin/gallery', label: 'Gallery', icon: Image, category: 'Content Management' },
    { path: '/admin/blog', label: 'Blog', icon: FileText, category: 'Content Management' },
    { path: '/admin/about-content', label: 'About Content', icon: BookOpen, category: 'Content Management' },
    { path: '/admin/legal-pages', label: 'Legal Pages', icon: Scale, category: 'Content Management' },
    
    // Customer Engagement
    { path: '/admin/orders', label: 'Orders', icon: ShoppingBag, category: 'Customer Engagement' },
    { path: '/admin/reservations', label: 'Reservations', icon: CalendarCheck, category: 'Customer Engagement' },
    { path: '/admin/events', label: 'Events & Catering', icon: Calendar, category: 'Customer Engagement' },
    { path: '/admin/reviews', label: 'Reviews', icon: Star, category: 'Customer Engagement' },
    { path: '/admin/testimonials', label: 'Testimonials', icon: MessageSquare, category: 'Customer Engagement' },
    { path: '/admin/response-templates', label: 'Response Templates', icon: MessageSquare, category: 'Customer Engagement' },
    
    // Communication
    { path: '/admin/email-delivery', label: 'Email Delivery', icon: Mail, category: 'Communication' },
    { path: '/admin/newsletter-subscribers', label: 'Newsletter Subscribers', icon: Users, category: 'Communication' },
    { path: '/admin/email-campaigns', label: 'Email Campaigns', icon: Send, category: 'Communication' },
    { path: '/admin/email-tracking', label: 'Email Tracking', icon: MailCheck, category: 'Communication' },
    { path: '/admin/sms-templates', label: 'SMS Templates', icon: MessageSquare, category: 'Communication' },
    { path: '/admin/sms-analytics', label: 'SMS Analytics', icon: MessageCircle, category: 'Communication' },
    
    // System Settings
    { path: '/admin/restaurant-settings', label: 'Restaurant Info', icon: Store, category: 'System Settings' },
    { path: '/admin/settings', label: 'Settings', icon: SettingsIcon, category: 'System Settings' },
    { path: '/admin/users', label: 'Admin Users', icon: UserCog, category: 'System Settings' },
    { path: '/admin/custom-roles', label: 'Custom Roles', icon: Shield, category: 'System Settings' },
    { path: '/admin/change-password', label: 'Change Password', icon: Lock, category: 'System Settings' },
    
    // Analytics & Logs
    { path: '/admin/analytics', label: 'Analytics', icon: BarChart3, category: 'Analytics & Logs' },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileSearch, category: 'Analytics & Logs' },
  ];

  // Filter navigation items based on user role
  const accessibleNavItems = useMemo(() => {
    if (!user?.role) return [];
    
    return allNavItems.filter(item => {
      // Check standard role access
      const hasStandardAccess = canAccessRoute(user.role as Role, item.path);
      
      // Check custom role access if user has a custom role
      const hasCustomAccess = (user as any).customRoleId 
        ? canAccessRouteWithCustomRole((user as any).customRoleId, item.path, customRoles)
        : false;
      
      return hasStandardAccess || hasCustomAccess;
    });
  }, [user?.role, (user as any)?.customRoleId, customRoles]);
  
  // Get favorite nav items
  const favoriteNavItems = useMemo(() => {
    return accessibleNavItems.filter(item => favoritePaths.includes(item.path));
  }, [accessibleNavItems, favoritePaths]);

  // Filter items by search query
  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return accessibleNavItems;
    
    const query = searchQuery.toLowerCase();
    return accessibleNavItems.filter(item => 
      item.label.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }, [accessibleNavItems, searchQuery]);

  // Group items by category
  const groupedNavItems = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    
    filteredNavItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    
    return groups;
  }, [filteredNavItems]);

  const toggleGroup = (category: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const NavLinks = () => {
    // If searching, show all groups expanded
    const isSearching = searchQuery.trim().length > 0;
    
    if (Object.keys(groupedNavItems).length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {isSearching ? 'No matching pages found' : 'No pages available'}
        </div>
      );
    }
    
    return (
      <>
        {/* Favorites Section */}
        {!isSearching && favoriteNavItems.length > 0 && (
          <div className="space-y-1 pb-4 mb-4 border-b border-border">
            {!isCollapsed && (
              <div className="px-2 py-1.5 text-xs font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-yellow-500" />
                <span>Favorites</span>
              </div>
            )}
            {favoriteNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <div key={item.path} className="relative group">
                  <Link href={item.path}>
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
                      {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                    </div>
                  </Link>
                  {!isCollapsed && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(item.path);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent opacity-100"
                      title="Remove from favorites"
                    >
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {Object.entries(groupedNavItems).map(([category, items]) => {
          const isExpanded = isSearching || expandedGroups[category];
          
          return (
            <div key={category} className="space-y-1">
              {/* Category Header */}
              {!isCollapsed && (
                <button
                  onClick={() => toggleGroup(category)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="truncate">{category}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                  )}
                </button>
              )}
              
              {/* Category Items */}
              {isExpanded && items.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                const itemIsFavorite = isFavorite(item.path);
                return (
                  <div key={item.path} className="relative group">
                    <Link href={item.path}>
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
                        {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                      </div>
                    </Link>
                    {!isCollapsed && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(item.path);
                        }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent ${
                          itemIsFavorite ? 'opacity-100' : ''
                        }`}
                        title={itemIsFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {itemIsFavorite ? (
                          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                        ) : (
                          <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </>
    );
  };

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
        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
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

        {/* Search Box */}
        {!isCollapsed && (
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        )}

        {/* Scrollable Navigation */}
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <NavLinks />
        </nav>

        {/* User info and logout */}
        <div className="p-4 border-t border-border flex-shrink-0">
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
          <Breadcrumb items={routeToBreadcrumb[location] || []} />
          {children}
        </div>
      </main>
    </div>
    </RoleGuard>
  );
}
