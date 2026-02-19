import { useState } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, MapPin, Users, Calendar, DollarSign, Utensils, Building2, PartyPopper, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function EventsCatering() {
  const [, setLocation] = useLocation();
  
  // Fetch system settings to check if events are enabled
  const { data: settings } = trpc.systemSettings.getPublicSettings.useQuery();
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    eventType: '',
    venueAddress: '',
    eventDate: '',
    guestCount: '',
    budget: '',
    message: '',
  });

  const createInquiryMutation = trpc.eventInquiries.create.useMutation({
    onSuccess: () => {
      toast.success('Event inquiry submitted successfully! We will contact you shortly with a quote.');
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        eventType: '',
        venueAddress: '',
        eventDate: '',
        guestCount: '',
        budget: '',
        message: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit event inquiry');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createInquiryMutation.mutate({
      ...formData,
      eventDate: formData.eventDate ? new Date(formData.eventDate) : undefined,
      guestCount: formData.guestCount ? parseInt(formData.guestCount) : undefined,
    });
  };

  const eventTypes = [
    { value: 'wedding', label: 'Wedding', icon: '💒' },
    { value: 'corporate', label: 'Corporate Event', icon: '🏢' },
    { value: 'birthday', label: 'Birthday Party', icon: '🎂' },
    { value: 'private_dining', label: 'Private Dining', icon: '🍽️' },
    { value: 'other', label: 'Other', icon: '🎉' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-background via-background to-secondary">
          <div className="container">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">Events & Catering</h1>
            <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto">
              Bring authentic African cuisine to your special event. We cater at your venue with full service.
            </p>
          </div>
        </section>

        {/* Closure Notice Banner */}
        {settings && !settings.eventsEnabled && (
          <section className="py-6 bg-amber-500/10">
            <div className="container max-w-4xl">
              <Alert className="border-amber-500 bg-amber-500/20 animate-pulse">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <AlertTitle className="text-white font-bold text-lg">Events & Catering Currently Unavailable</AlertTitle>
                <AlertDescription className="text-yellow-300 text-base">
                  {settings.eventsClosureMessage || 'We are not accepting event inquiries at this time. Please check back later.'}
                </AlertDescription>
              </Alert>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-12 bg-muted/30">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-border/50">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                    <MapPin className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Your Venue</h3>
                  <p className="text-sm text-muted-foreground">
                    We come to your location with full catering setup and staff
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                    <Utensils className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Custom Menus</h3>
                  <p className="text-sm text-muted-foreground">
                    Tailored menu packages to suit your event and budget
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Any Size Event</h3>
                  <p className="text-sm text-muted-foreground">
                    From intimate gatherings to large celebrations (20-500+ guests)
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Event Types Section */}
        <section className="py-12">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-8">We Cater All Types of Events</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
              {eventTypes.map((type) => (
                <Card key={type.value} className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="text-4xl mb-2">{type.icon}</div>
                    <p className="text-sm font-medium">{type.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Inquiry Form */}
        {settings && settings.eventsEnabled && (
          <section className="py-12 bg-muted/30">
          <div className="container max-w-3xl">
            <Card className="border-border/50">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold mb-2 text-center">Request a Quote</h2>
                <p className="text-muted-foreground text-center mb-8">
                  Fill out the form below and we'll get back to you within 24 hours with a custom quote
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Full Name *</Label>
                      <Input
                        id="customerName"
                        required
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Email *</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        required
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Phone Number *</Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      required
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      placeholder="+44 7911 123456"
                    />
                  </div>

                  {/* Event Details */}
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-semibold mb-4">Event Details</h3>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="eventType">Event Type *</Label>
                        <Select
                          value={formData.eventType}
                          onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                          required
                        >
                          <SelectTrigger id="eventType">
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            {eventTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.icon} {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="venueAddress">Venue Address *</Label>
                        <Textarea
                          id="venueAddress"
                          required
                          value={formData.venueAddress}
                          onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                          placeholder="Full address where the event will take place"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="eventDate">Event Date</Label>
                          <Input
                            id="eventDate"
                            type="date"
                            value={formData.eventDate}
                            onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="guestCount">Number of Guests</Label>
                          <Input
                            id="guestCount"
                            type="number"
                            min="1"
                            value={formData.guestCount}
                            onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                            placeholder="e.g., 50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="budget">Estimated Budget (Optional)</Label>
                        <Select
                          value={formData.budget}
                          onValueChange={(value) => setFormData({ ...formData, budget: value })}
                        >
                          <SelectTrigger id="budget">
                            <SelectValue placeholder="Select budget range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under_1000">Under £1,000</SelectItem>
                            <SelectItem value="1000_2500">£1,000 - £2,500</SelectItem>
                            <SelectItem value="2500_5000">£2,500 - £5,000</SelectItem>
                            <SelectItem value="5000_10000">£5,000 - £10,000</SelectItem>
                            <SelectItem value="over_10000">Over £10,000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Additional Details *</Label>
                        <Textarea
                          id="message"
                          required
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Tell us more about your event, dietary requirements, service preferences, etc."
                          rows={5}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={createInquiryMutation.isPending}
                  >
                    {createInquiryMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Event Inquiry'
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    By submitting this form, you agree to be contacted about your event inquiry.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
        )}

        {/* Why Choose Us Section */}
        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Boomiis Catering?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Utensils className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Authentic Cuisine</h3>
                  <p className="text-muted-foreground">
                    Traditional West African recipes prepared by experienced chefs
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Professional Staff</h3>
                  <p className="text-muted-foreground">
                    Trained catering team to serve your guests with excellence
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Flexible Packages</h3>
                  <p className="text-muted-foreground">
                    Custom menus and pricing to fit your budget and preferences
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Full Service</h3>
                  <p className="text-muted-foreground">
                    We handle setup, service, and cleanup at your venue
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
