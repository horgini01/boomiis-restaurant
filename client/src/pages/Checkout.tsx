import { useState } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/CartContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, totalPrice, clearCart } = useCart();
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryAddress: '',
    deliveryPostcode: '',
    specialInstructions: '',
    preferredTime: '',
  });

  // Generate time slots (30-minute intervals from 11:00 AM to 9:00 PM)
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 11;
    const endHour = 21;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        slots.push({ value: time, label: displayTime });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: async (data: any) => {
      // Create Stripe checkout session
      try {
        const checkoutSession = await createCheckoutMutation.mutateAsync({
          orderId: data.orderId,
          customerEmail: formData.customerEmail,
          customerName: formData.customerName,
        });

        if (checkoutSession.url) {
          // Redirect to Stripe checkout
          toast.success('Redirecting to payment...');
          window.location.href = checkoutSession.url;
        }
      } catch (error: any) {
        toast.error('Failed to create payment session');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to place order');
    },
  });

  const createCheckoutMutation = trpc.payment.createCheckoutSession.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Validate time slot selection
    if (!formData.preferredTime) {
      toast.error('Please select a preferred delivery/pickup time');
      return;
    }

    createOrderMutation.mutate({
      ...formData,
      orderType,
      items: items.map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
    });
  };

  if (items.length === 0) {
    setLocation('/cart');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container">
          <h1 className="text-4xl font-bold mb-8">Checkout</h1>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Order Details Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Order Type */}
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Order Type</h2>
                    <RadioGroup value={orderType} onValueChange={(value: any) => setOrderType(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="delivery" id="delivery" />
                        <Label htmlFor="delivery" className="cursor-pointer">Delivery (£3.99)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="cursor-pointer">Pickup (Free)</Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                    <div className="space-y-4">
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
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Address */}
                {orderType === 'delivery' && (
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <h2 className="text-xl font-bold mb-4">Delivery Address</h2>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="address">Street Address *</Label>
                          <Textarea
                            id="address"
                            required={orderType === 'delivery'}
                            value={formData.deliveryAddress}
                            onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="postcode">Postcode *</Label>
                          <Input
                            id="postcode"
                            required={orderType === 'delivery'}
                            value={formData.deliveryPostcode}
                            onChange={(e) => setFormData({ ...formData, deliveryPostcode: e.target.value })}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Preferred Time Slot */}
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Preferred {orderType === 'delivery' ? 'Delivery' : 'Pickup'} Time</h2>
                    <div>
                      <Label htmlFor="preferredTime">Select Time Slot *</Label>
                      <Select
                        value={formData.preferredTime}
                        onValueChange={(value) => setFormData({ ...formData, preferredTime: value })}
                        required
                      >
                        <SelectTrigger id="preferredTime">
                          <SelectValue placeholder="Choose a time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-2">
                        We'll do our best to {orderType === 'delivery' ? 'deliver' : 'have your order ready'} at your preferred time.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Special Instructions */}
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Special Instructions</h2>
                    <Textarea
                      placeholder="Any special requests or dietary requirements?"
                      value={formData.specialInstructions}
                      onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div>
                <Card className="border-border/50 sticky top-20">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
                    
                    <div className="space-y-3 mb-6">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity}x {item.name}
                          </span>
                          <span>£{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      
                      <div className="border-t border-border pt-3 space-y-2">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal</span>
                          <span>£{totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Delivery Fee</span>
                          <span>£{orderType === 'delivery' ? '3.99' : '0.00'}</span>
                        </div>
                        <div className="border-t border-border pt-2 flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span className="text-primary">
                            £{(totalPrice + (orderType === 'delivery' ? 3.99 : 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={createOrderMutation.isPending}
                    >
                      {createOrderMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Proceed to Payment'
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      By placing your order, you agree to our Terms & Conditions
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
