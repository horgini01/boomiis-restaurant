import { Link } from 'wouter';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Truck } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { trpc } from '@/lib/trpc';

function DeliveryAreasFooter() {
  const { data: areas = [] } = trpc.admin.getDeliveryAreas.useQuery();

  if (areas.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-start gap-2">
        <Truck className="h-4 w-4 text-primary mt-0.5" />
        <div>
          <div className="text-xs font-semibold text-foreground mb-1">We Deliver To:</div>
          <div className="text-xs text-muted-foreground">
            {areas.map((area, index) => (
              <span key={area.id}>
                {area.areaName} ({area.postcodesPrefixes})
                {index < areas.length - 1 && ', '}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  const {
    restaurantName,
    restaurantTagline,
    contactAddress,
    contactPhone,
    contactEmail,
    socialFacebook,
    socialInstagram,
    socialTwitter,
    openingHoursDisplay,
  } = useSettings();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold text-primary mb-4">{restaurantName}</h3>
            <p className="text-sm text-muted-foreground">
              {restaurantTagline}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/menu">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    Menu
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/reservations">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    Reservations
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/events-catering">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    Events & Catering
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    About Us
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Contact</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  {contactAddress.split(',').map((line, i) => (
                    <span key={i}>
                      {line.trim()}
                      {i < contactAddress.split(',').length - 1 && <br />}
                    </span>
                  ))}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{contactPhone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{contactEmail}</span>
              </li>
            </ul>
            <DeliveryAreasFooter />
          </div>

          {/* Social & Hours */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Opening Hours</h4>
            <div className="text-sm text-muted-foreground mb-4">
              {Array.isArray(openingHoursDisplay) && openingHoursDisplay.map((line: string, i: number) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            <div className="flex gap-4">
              {socialFacebook && (
                <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {socialInstagram && (
                <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {socialTwitter && (
                <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {restaurantName}. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy">
                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  Privacy Policy
                </span>
              </Link>
              <Link href="/terms">
                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  Terms & Conditions
                </span>
              </Link>
              <Link href="/accessibility">
                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  Accessibility
                </span>
              </Link>
              <Link href="/admin/login">
                <span className="text-sm text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer">
                  Admin
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
