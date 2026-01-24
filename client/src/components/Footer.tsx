import { Link } from 'wouter';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold text-primary mb-4">Boomiis</h3>
            <p className="text-sm text-muted-foreground">
              Authentic African cuisine bringing the flavors of West Africa to the UK.
              Experience the rich tastes and warm hospitality.
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
                <Link href="/events">
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
                  123 High Street<br />London, UK<br />SW1A 1AA
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">+44 20 1234 5678</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">hello@boomiis.uk</span>
              </li>
            </ul>
          </div>

          {/* Social & Hours */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Opening Hours</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Mon-Thu: 12:00 PM - 10:00 PM<br />
              Fri-Sat: 12:00 PM - 11:00 PM<br />
              Sunday: 12:00 PM - 9:00 PM
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Boomiis Restaurant. All rights reserved.
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
