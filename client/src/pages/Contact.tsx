import { useState } from 'react';
import { SEO } from '@/components/SEO';
import { MapView } from '@/components/Map';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';

export default function Contact() {
  const { contactPhone, contactEmail, contactAddress, openingHoursDisplay, restaurantLatitude, restaurantLongitude } = useSettings();
  
  // Restaurant location coordinates from admin settings
  const restaurantLocation = {
    lat: restaurantLatitude,
    lng: restaurantLongitude
  };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeliveryZones, setShowDeliveryZones] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success('Message sent successfully! We\'ll get back to you soon.');
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <>
      <SEO 
        title="Contact Us"
        description="Get in touch with Boomiis Restaurant. Visit us in London, call us, or send us a message. We're here to answer your questions about our authentic West African cuisine."
        image="https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=1200&h=630&fit=crop"
        url="/contact"
      />
      <div className="min-h-screen bg-background">
        <Header />

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmNTllMGIiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMy4zMTQgMi42ODYtNiA2LTZzNiAyLjY4NiA2IDYtMi42ODYgNi02IDYtNi0yLjY4Ni02LTZ6TTEyIDM2YzAtMy4zMTQgMi42ODYtNiA2LTZzNiAyLjY4NiA2IDYtMi42ODYgNi02IDYtNi0yLjY4Ni02LTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Get in <span className="text-primary">Touch</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Contact Info Cards */}
            <Card className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Phone</h3>
                <p className="text-muted-foreground mb-2">Give us a call</p>
                <a href={`tel:${contactPhone}`} className="text-primary hover:underline font-medium">
                  {contactPhone}
                </a>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Email</h3>
                <p className="text-muted-foreground mb-2">Send us an email</p>
                <a href={`mailto:${contactEmail}`} className="text-primary hover:underline font-medium">
                  {contactEmail}
                </a>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Location</h3>
                <p className="text-muted-foreground mb-2">Visit our restaurant</p>
                <p className="text-foreground font-medium" style={{ whiteSpace: 'pre-line' }}>
                  {contactAddress}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Full Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="John Doe"
                      className="bg-background border-border/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="john@example.com"
                      className="bg-background border-border/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-2">
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+44 7911 123456"
                      className="bg-background border-border/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                      Subject *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="General Inquiry"
                      className="bg-background border-border/50"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">
                    Message *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    placeholder="Tell us how we can help you..."
                    className="bg-background border-border/50 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Opening Hours */}
            <div>
              <h2 className="text-3xl font-bold mb-6">Opening Hours</h2>
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-4">Visit Us</h3>
                      <div className="space-y-3">
                        {openingHoursDisplay.map((hours, index) => (
                          <div 
                            key={index} 
                            className={`flex justify-between items-center py-2 ${index < openingHoursDisplay.length - 1 ? 'border-b border-border/50' : ''}`}
                          >
                            <span className="text-foreground">{hours}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-6">
                    <p className="text-sm text-center">
                      <span className="font-semibold text-primary">Note:</span> Last orders are taken 30 minutes before closing time
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Google Maps */}
              <div className="mt-6 rounded-lg overflow-hidden border border-border/50" style={{ height: '400px' }}>
                <MapView
                  initialCenter={restaurantLocation}
                  initialZoom={15}
                  onMapReady={(map) => {
                    // Add marker for restaurant location using AdvancedMarkerElement
                    const marker = new google.maps.marker.AdvancedMarkerElement({
                      position: restaurantLocation,
                      map: map,
                      title: 'Boomiis Restaurant',
                    });

                    // Add info window
                    const infoWindow = new google.maps.InfoWindow({
                      content: `
                        <div style="padding: 10px; max-width: 250px;">
                          <h3 style="font-weight: bold; margin-bottom: 8px; color: #f59e0b;">Boomiis Restaurant</h3>
                          <p style="margin-bottom: 4px; color: #374151;">${contactAddress.replace(/\n/g, '<br>')}</p>
                          <p style="margin-top: 8px; color: #6b7280; font-size: 14px;">Authentic West African Cuisine</p>
                        </div>
                      `,
                    });

                    // Show info window on marker click
                    marker.addListener('click', () => {
                      infoWindow.open(map, marker);
                    });

                    // Define delivery zones with postcode areas
                    const deliveryZones = [
                      {
                        name: 'Torquay Area',
                        postcodes: ['TQ1', 'TQ2', 'TQ3', 'TQ4'],
                        color: '#f59e0b',
                        opacity: 0.2,
                        center: { lat: 50.4619, lng: -3.5253 },
                        radius: 3000 // 3km radius
                      },
                      {
                        name: 'Newton Abbot Area',
                        postcodes: ['TQ12'],
                        color: '#f59e0b',
                        opacity: 0.15,
                        center: { lat: 50.5308, lng: -3.6079 },
                        radius: 2500
                      },
                      {
                        name: 'Teignmouth Area',
                        postcodes: ['TQ14'],
                        color: '#f59e0b',
                        opacity: 0.15,
                        center: { lat: 50.5467, lng: -3.4967 },
                        radius: 2000
                      },
                      {
                        name: 'Exeter City',
                        postcodes: ['EX1', 'EX2', 'EX3', 'EX4'],
                        color: '#f59e0b',
                        opacity: 0.2,
                        center: { lat: 50.7184, lng: -3.5339 },
                        radius: 4000
                      },
                      {
                        name: 'Dawlish Area',
                        postcodes: ['EX7'],
                        color: '#f59e0b',
                        opacity: 0.15,
                        center: { lat: 50.5810, lng: -3.4653 },
                        radius: 2000
                      }
                    ];

                    // Create circle overlays for delivery zones
                    const circles: google.maps.Circle[] = [];
                    deliveryZones.forEach(zone => {
                      const circle = new google.maps.Circle({
                        strokeColor: zone.color,
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: zone.color,
                        fillOpacity: zone.opacity,
                        map: showDeliveryZones ? map : null,
                        center: zone.center,
                        radius: zone.radius,
                      });

                      // Add info window for zone
                      const zoneInfoWindow = new google.maps.InfoWindow({
                        content: `
                          <div style="padding: 8px;">
                            <h4 style="font-weight: bold; margin-bottom: 4px; color: #f59e0b;">${zone.name}</h4>
                            <p style="margin: 0; color: #374151; font-size: 14px;">Postcodes: ${zone.postcodes.join(', ')}</p>
                          </div>
                        `,
                      });

                      // Show zone info on click
                      circle.addListener('click', (e: google.maps.MapMouseEvent) => {
                        if (e.latLng) {
                          zoneInfoWindow.setPosition(e.latLng);
                          zoneInfoWindow.open(map);
                        }
                      });

                      circles.push(circle);
                    });

                    // Store circles and map reference for toggle functionality
                    (window as any).deliveryZoneCircles = circles;
                    (window as any).mapInstance = map;
                  }}
                />
              </div>
              
              {/* Delivery Zone Toggle and Get Directions */}
              <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeliveryZones(!showDeliveryZones);
                    const circles = (window as any).deliveryZoneCircles;
                    const mapInstance = (window as any).mapInstance;
                    if (circles && mapInstance) {
                      circles.forEach((circle: google.maps.Circle) => {
                        circle.setMap(!showDeliveryZones ? mapInstance : null);
                      });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  {showDeliveryZones ? 'Hide' : 'Show'} Delivery Zones
                </Button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${restaurantLatitude},${restaurantLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Get Directions
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/95 border-t border-border/50 py-12">
        <div className="container">
          <div className="text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Boomiis Restaurant. All rights reserved.</p>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
