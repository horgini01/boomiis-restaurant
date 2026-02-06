import { useState, useEffect, useRef } from 'react';
import { SEO } from '@/components/SEO';
import { MapView } from '@/components/Map';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { trpc } from '@/lib/trpc';

export default function Contact() {
  const { contactPhone, contactEmail, contactAddress, openingHoursDisplay, restaurantLatitude, restaurantLongitude } = useSettings();
  
  // Fetch delivery areas from database
  const { data: deliveryAreas = [], isLoading: isLoadingAreas } = trpc.admin.getDeliveryAreas.useQuery();
  
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
  const [postcodeInput, setPostcodeInput] = useState('');
  const [postcodeResult, setPostcodeResult] = useState<{
    isValid: boolean;
    message: string;
    zone?: string;
  } | null>(null);
  
  // Store map and circles references
  const mapRef = useRef<google.maps.Map | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  // Create or update delivery zones when data or visibility changes
  useEffect(() => {
    console.log('[DeliveryZones] useEffect triggered', { 
      hasMap: !!mapRef.current, 
      areasCount: deliveryAreas.length,
      showZones: showDeliveryZones 
    });
    
    const map = mapRef.current;
    if (!map || deliveryAreas.length === 0) {
      console.log('[DeliveryZones] Skipping zone creation:', { hasMap: !!map, areasCount: deliveryAreas.length });
      return;
    }

    // Clear existing circles
    circlesRef.current.forEach(circle => circle.setMap(null));
    circlesRef.current = [];

    // Create zones from database
    const zones = deliveryAreas
      .filter(area => area.latitude && area.longitude && area.radiusMeters)
      .map(area => ({
        name: area.areaName,
        postcodes: area.postcodesPrefixes.split(',').map(p => p.trim().toUpperCase()),
        color: '#f59e0b',
        opacity: 0.2,
        center: { lat: parseFloat(area.latitude!), lng: parseFloat(area.longitude!) },
        radius: area.radiusMeters!
      }));

    // Create circle overlays
    zones.forEach(zone => {
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

      circle.set('originalOpacity', zone.opacity);

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h4 style="font-weight: bold; margin-bottom: 4px; color: #f59e0b;">${zone.name}</h4>
            <p style="margin: 0; color: #374151; font-size: 14px;">Postcodes: ${zone.postcodes.join(', ')}</p>
          </div>
        `,
      });

      circle.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          infoWindow.setPosition(e.latLng);
          infoWindow.open(map);
        }
      });

      circlesRef.current.push(circle);
    });

    // Store for window access (for toggle and highlighting)
    (window as any).deliveryZoneCircles = circlesRef.current;
    (window as any).deliveryZoneData = zones;
    
    console.log('[DeliveryZones] Created zones:', { count: circlesRef.current.length, zones });
  }, [deliveryAreas, showDeliveryZones]);

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

  // Postcode checker function
  const checkPostcode = () => {
    if (!postcodeInput.trim()) {
      setPostcodeResult({
        isValid: false,
        message: 'Please enter a postcode',
      });
      return;
    }

    // Use delivery areas from database
    const deliveryZones = deliveryAreas.map(area => ({
      name: area.areaName,
      postcodes: area.postcodesPrefixes.split(',').map(p => p.trim().toUpperCase()),
    }));

    // Extract postcode prefix (e.g., "TQ1" from "TQ1 2AB")
    const postcodePrefix = postcodeInput.trim().split(' ')[0].toUpperCase();

    // Find matching zone
    const matchingZone = deliveryZones.find(zone =>
      zone.postcodes.some(prefix => postcodePrefix.startsWith(prefix))
    );

    if (matchingZone) {
      setPostcodeResult({
        isValid: true,
        message: '✓ Great news! We deliver to your area.',
        zone: matchingZone.name,
      });

      // Highlight the matching zone on the map
      highlightZone(matchingZone.name);
    } else {
      setPostcodeResult({
        isValid: false,
        message: 'Sorry, we don\'t currently deliver to this postcode. Please contact us for more information.',
      });

      // Reset all zone highlighting
      resetZoneHighlighting();
    }
  };

  // Highlight specific zone on map
  const highlightZone = (zoneName: string) => {
    const circles = (window as any).deliveryZoneCircles;
    const zoneData = (window as any).deliveryZoneData;
    
    if (circles && zoneData) {
      circles.forEach((circle: google.maps.Circle, index: number) => {
        const zone = zoneData[index];
        if (zone.name === zoneName) {
          // Highlight matching zone
          circle.setOptions({
            strokeWeight: 4,
            fillOpacity: 0.4,
          });
        } else {
          // Dim other zones
          circle.setOptions({
            strokeWeight: 1,
            fillOpacity: 0.1,
          });
        }
      });
    }
  };

  // Reset zone highlighting
  const resetZoneHighlighting = () => {
    const circles = (window as any).deliveryZoneCircles;
    if (circles) {
      circles.forEach((circle: google.maps.Circle) => {
        circle.setOptions({
          strokeWeight: 2,
          fillOpacity: circle.get('originalOpacity') || 0.2,
        });
      });
    }
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

              {/* Postcode Checker */}
              <div className="mt-6 bg-card border border-border/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Check Delivery Availability
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter your postcode to see if we deliver to your area
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g., TQ1 2AB or EX4 5CD"
                    value={postcodeInput}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setPostcodeInput(value);
                      if (!value) setPostcodeResult(null);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        checkPostcode();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={checkPostcode} className="px-6">
                    Check
                  </Button>
                  {postcodeInput && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPostcodeInput('');
                        setPostcodeResult(null);
                        // Reset zone highlighting
                        const circles = (window as any).deliveryZoneCircles;
                        if (circles) {
                          circles.forEach((circle: google.maps.Circle) => {
                            circle.setOptions({
                              strokeWeight: 2,
                              fillOpacity: circle.get('originalOpacity') || 0.2
                            });
                          });
                        }
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {postcodeResult && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    postcodeResult.isValid
                      ? 'bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400'
                      : 'bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400'
                  }`}>
                    <div className="flex items-start gap-2">
                      {postcodeResult.isValid ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                      )}
                      <div>
                        <p className="font-semibold">{postcodeResult.message}</p>
                        {postcodeResult.zone && (
                          <p className="text-sm mt-1 opacity-90">Delivery Zone: {postcodeResult.zone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Google Maps */}
              <div className="mt-6 rounded-lg overflow-hidden border border-border/50" style={{ height: '400px' }}>
                <MapView
                  initialCenter={restaurantLocation}
                  initialZoom={15}
                  onMapReady={(map) => {
                    // Store map reference for useEffect
                    mapRef.current = map;
                    (window as any).mapInstance = map;
                    
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
                    
                    // Zones will be created by useEffect when deliveryAreas data loads
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

      <Footer />
      </div>
    </>
  );
}
