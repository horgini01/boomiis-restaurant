import { Link } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <Link href="/admin/dashboard">
        <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
          <Home className="h-4 w-4" />
        </div>
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4" />
            {item.href && !isLast ? (
              <Link href={item.href}>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {item.label}
                </span>
              </Link>
            ) : (
              <span className={isLast ? 'text-foreground font-medium' : ''}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Route to category mapping
export const routeToBreadcrumb: Record<string, BreadcrumbItem[]> = {
  '/admin/dashboard': [],
  
  // Content Management
  '/admin/categories': [
    { label: 'Content Management' },
    { label: 'Categories' }
  ],
  '/admin/menu-items': [
    { label: 'Content Management' },
    { label: 'Menu Items' }
  ],
  '/admin/gallery': [
    { label: 'Content Management' },
    { label: 'Gallery' }
  ],
  '/admin/blog': [
    { label: 'Content Management' },
    { label: 'Blog' }
  ],
  '/admin/about-content': [
    { label: 'Content Management' },
    { label: 'About Content' }
  ],
  '/admin/legal-pages': [
    { label: 'Content Management' },
    { label: 'Legal Pages' }
  ],
  
  // Customer Engagement
  '/admin/orders': [
    { label: 'Customer Engagement' },
    { label: 'Orders' }
  ],
  '/admin/reservations': [
    { label: 'Customer Engagement' },
    { label: 'Reservations' }
  ],
  '/admin/events': [
    { label: 'Customer Engagement' },
    { label: 'Events & Catering' }
  ],
  '/admin/reviews': [
    { label: 'Customer Engagement' },
    { label: 'Reviews' }
  ],
  '/admin/testimonials': [
    { label: 'Customer Engagement' },
    { label: 'Testimonials' }
  ],
  '/admin/response-templates': [
    { label: 'Customer Engagement' },
    { label: 'Response Templates' }
  ],
  
  // Communication
  '/admin/email-delivery': [
    { label: 'Communication' },
    { label: 'Email Delivery' }
  ],
  '/admin/newsletter-subscribers': [
    { label: 'Communication' },
    { label: 'Newsletter Subscribers' }
  ],
  '/admin/email-campaigns': [
    { label: 'Communication' },
    { label: 'Email Campaigns' }
  ],
  '/admin/email-tracking': [
    { label: 'Communication' },
    { label: 'Email Tracking' }
  ],
  '/admin/sms-templates': [
    { label: 'Communication' },
    { label: 'SMS Templates' }
  ],
  '/admin/sms-analytics': [
    { label: 'Communication' },
    { label: 'SMS Analytics' }
  ],
  
  // System Settings
  '/admin/restaurant-settings': [
    { label: 'System Settings' },
    { label: 'Restaurant Info' }
  ],
  '/admin/settings': [
    { label: 'System Settings' },
    { label: 'Settings' }
  ],
  '/admin/users': [
    { label: 'System Settings' },
    { label: 'Admin Users' }
  ],
  '/admin/custom-roles': [
    { label: 'System Settings' },
    { label: 'Custom Roles' }
  ],
  '/admin/change-password': [
    { label: 'System Settings' },
    { label: 'Change Password' }
  ],
  
  // Analytics & Logs
  '/admin/analytics': [
    { label: 'Analytics & Logs' },
    { label: 'Analytics' }
  ],
  '/admin/audit-logs': [
    { label: 'Analytics & Logs' },
    { label: 'Audit Logs' }
  ],
};
