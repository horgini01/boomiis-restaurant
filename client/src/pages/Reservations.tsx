import { useState } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Calendar, Clock, Users } from 'lucide-react';

export default function Reservations() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    partySize: '',
    reservationDate: '',
    reservationTime: '',
    specialRequests: '',
  });

  const createReservationMutation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      toast.success('Reservation request submitted successfully! We will confirm shortly.');
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        partySize: '',
        reservationDate: '',
        reservationTime: '',
        specialRequests: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit reservation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const reservationDateTime = new Date(`${formData.reservationDate}T${formData.reservationTime}`);
    
    createReservationMutation.mutate({
      ...formData,
      partySize: parseInt(formData.partySize),
      reservationDate: reservationDateTime,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-background via-background to-secondary">
          <div className="container">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">Table Reservations</h1>
            <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto">
              Reserve your table and enjoy an authentic African dining experience
            </p>
          </div>
        </section>

        {/* Reservation Form */}
        <section className="py-12">
          <div className="container max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <Card className="border-border/50">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">Book Ahead</h3>
                  <p className="text-sm text-muted-foreground">Reserve your table in advance</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">Flexible Times</h3>
                  <p className="text-sm text-muted-foreground">Choose your preferred time slot</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">Any Party Size</h3>
                  <p className="text-sm text-muted-foreground">From intimate to large groups</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6">Make a Reservation</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="partySize">Party Size *</Label>
                      <Input
                        id="partySize"
                        type="number"
                        min="1"
                        max="20"
                        required
                        value={formData.partySize}
                        onChange={(e) => setFormData({ ...formData, partySize: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="date">Reservation Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.reservationDate}
                        onChange={(e) => setFormData({ ...formData, reservationDate: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="time">Reservation Time *</Label>
                      <Input
                        id="time"
                        type="time"
                        required
                        value={formData.reservationTime}
                        onChange={(e) => setFormData({ ...formData, reservationTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="requests">Special Requests</Label>
                    <Textarea
                      id="requests"
                      placeholder="Any special occasions, dietary requirements, or seating preferences?"
                      value={formData.specialRequests}
                      onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={createReservationMutation.isPending}
                  >
                    {createReservationMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Reservation Request'
                    )}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center">
                    We'll confirm your reservation via email or phone within 24 hours
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
