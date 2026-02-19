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
import { Checkbox } from '@/components/ui/checkbox';
import { useCart } from '@/contexts/CartContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, totalPrice, clearCart } = useCart();
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const { data: settings } = trpc.admin.getSettings.useQuery();
  const { data: deliveryAreas = [] } = trpc.admin.getDeliveryAreas.useQuery();
  const { data: systemSettings } = trpc.systemSettings.getPublicSettings.useQuery();
  const [postcodeError, setPostcodeError] = useState<string>('');
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryAddress: '',
    deliveryPostcode: '',
    specialInstructions: '',
    preferredTime: '',
  });
  const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(true); // Default to opted-in for SMS notifications

  // Get delivery settings
  const prepBufferMinutes = Number(settings?.find(s => s.settingKey === 'prep_buffer_minutes')?.settingValue || 10);
  const avgDeliveryMinutes = Number(settings?.find(s => s.settingKey === 'average_delivery_time_minutes')?.settingValue || 30);
  const standardDeliveryFee = Number(settings?.find(s => s.settingKey === 'delivery_fee')?.settingValue || 3.99);
  const minOrderFreeDelivery = Number(settings?.find(s => s.settingKey === 'min_order_free_delivery')?.settingValue || 0);

  // Get zone-specific delivery fee based on postcode
  const getZoneDeliveryFee = () => {
    if (orderType !== 'delivery' || !formData.deliveryPostcode) return standardDeliveryFee;
    
    const postcode = formData.deliveryPostcode.trim().toUpperCase();
    const matchedArea = deliveryAreas.find(area => {
      const prefixes = area.postcodesPrefixes.split(',').map(p => p.trim().toUpperCase());
      return prefixes.some(prefix => postcode.startsWith(prefix));
    });
    
    return matchedArea ? parseFloat(matchedArea.deliveryFee) : standardDeliveryFee;
  };

  const deliveryFee = getZoneDeliveryFee();

  // Calculate total prep time from cart items
  const calculateTotalPrepTime = () => {
    const itemsPrepTime = items.reduce((total, item) => {
      return total + (item.prepTime || 15) * item.quantity; // Default 15 mins if not set
    }, 0);
    return Math.max(itemsPrepTime, 20) + prepBufferMinutes; // Minimum 20 mins + buffer
  };

  const totalPrepTime = calculateTotalPrepTime();

  // Calculate estimated delivery window
  const getEstimatedDeliveryWindow = () => {
    const now = new Date();
    const totalMinutes = totalPrepTime + avgDeliveryMinutes;
    const earliestTime = new Date(now.getTime() + totalMinutes * 60000);
    const latestTime = new Date(earliestTime.getTime() + 15 * 60000); // 15-minute window
    
    return {
      earliestDisplay: earliestTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      latestDisplay: latestTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      earliestTime: earliestTime.toTimeString().slice(0, 5), // HH:MM format for server
      totalMinutes,
    };
  };

  // Generate pickup time slots starting from minimum pickup time
  const generatePickupTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const minPickupTime = new Date(now.getTime() + totalPrepTime * 60000);
    
    // Round up to next 15-minute interval
    const minutes = minPickupTime.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    minPickupTime.setMinutes(roundedMinutes);
    minPickupTime.setSeconds(0);
    
    // Generate slots for next 4 hours
    for (let i = 0; i < 16; i++) {
      const slotTime = new Date(minPickupTime.getTime() + i * 15 * 60000);
      const timeValue = slotTime.toTimeString().slice(0, 5);
      const displayTime = slotTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      slots.push({ value: timeValue, label: displayTime });
    }
    return slots;
  };

  const deliveryWindow = orderType === 'delivery' ? getEstimatedDeliveryWindow() : null;
  const pickupSlots = orderType === 'pickup' ? generatePickupTimeSlots() : [];

  // Calculate final delivery fee
  const finalDeliveryFee = orderType === 'delivery' && minOrderFreeDelivery > 0 && totalPrice >= minOrderFreeDelivery ? 0 : deliveryFee;
  const orderTotal = totalPrice + (orderType === 'delivery' ? finalDeliveryFee : 0);

  const subscribeNewsletterMutation = trpc.newsletter.subscribe.useMutation();

  const createCheckoutMutation = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: async (data: any) => {
      // Subscribe to newsletter if checkbox was checked
      if (subscribeToNewsletter) {
        try {
          await subscribeNewsletterMutation.mutateAsync({
            email: formData.customerEmail,
            name: formData.customerName,
            source: 'checkout',
          });
        } catch (error) {
          // Don't block checkout if newsletter subscription fails
          console.error('Newsletter subscription failed:', error);
        }
      }

      if (data.url) {
        // Redirect to Stripe checkout
        toast.success('Redirecting to payment...');
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create payment session');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Validate time slot selection for pickup orders
    if (orderType === 'pickup' && !formData.preferredTime) {
      toast.error('Please select a pickup time');
      return;
    }

    // For delivery orders, set estimated delivery time in HH:MM format
    const finalPreferredTime = orderType === 'delivery' 
      ? deliveryWindow?.earliestTime || ''
      : formData.preferredTime;

    // Get menu item names from cart items
    const itemsWithNames = items.map(item => ({
      menuItemId: item.id,
      menuItemName: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    // Create Stripe checkout session directly (order will be created after payment)
    createCheckoutMutation.mutate({
      ...formData,
      preferredTime: finalPreferredTime,
      orderType,
      smsOptIn, // Customer's SMS notification preference
      items: itemsWithNames,
    });
  };

  if (items.length === 0) {
    setLocation('/cart');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Full-page loading overlay */}
      {createCheckoutMutation.isPending && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-8 rounded-lg shadow-lg flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {createCheckoutMutation.isPending ? 'Redirecting to payment...' : 'Processing your order...'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Please wait while we prepare your checkout
              </p>
            </div>
          </div>
        </div>
      )}
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container">
          <h1 className="text-4xl font-bold mb-8">Checkout</h1>
          
          {systemSettings && !systemSettings.ordersEnabled && (
            <Alert className="mb-6 border-amber-500 bg-gradient-to-r from-amber-900/20 to-amber-800/20 animate-in fade-in-50 slide-in-from-top-5 duration-500">
              <AlertCircle className="h-5 w-5 text-white" />
              <AlertTitle className="text-white text-lg font-semibold">Orders Currently Unavailable</AlertTitle>
              <AlertDescription className="text-yellow-300 text-base">
                {systemSettings.ordersClosureMessage || 'We are not accepting online orders at this time. Please check back later.'}
              </AlertDescription>
            </Alert>
          )}

          {systemSettings && systemSettings.ordersEnabled && (
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
                        <Label htmlFor="delivery" className="cursor-pointer">
                          Delivery (£{deliveryFee.toFixed(2)})
                          {minOrderFreeDelivery > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              Free over £{minOrderFreeDelivery.toFixed(2)}
                            </span>
                          )}
                        </Label>
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
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase();
                              setFormData({ ...formData, deliveryPostcode: value });
                              setPostcodeError('');
                            }}
                            onBlur={() => {
                              if (orderType === 'delivery' && formData.deliveryPostcode && deliveryAreas.length > 0) {
                                const postcode = formData.deliveryPostcode.trim().toUpperCase();
                                const isValid = deliveryAreas.some(area => {
                                  const prefixes = area.postcodesPrefixes.split(',').map(p => p.trim().toUpperCase());
                                  return prefixes.some(prefix => postcode.startsWith(prefix));
                                });
                                if (!isValid) {
                                  const areasList = deliveryAreas.map(a => `${a.areaName} (${a.postcodesPrefixes})`).join(', ');
                                  setPostcodeError(`Sorry, we don't deliver to this postcode. We deliver to: ${areasList}`);
                                }
                              }
                            }}
                            className={postcodeError ? 'border-red-500' : ''}
                          />
                          {postcodeError && (
                            <p className="text-sm text-red-500 mt-1">{postcodeError}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Delivery/Pickup Time */}
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    {orderType === 'delivery' ? (
                      // Delivery: Show estimated delivery window
                      <>
                        <h2 className="text-xl font-bold mb-4">🚚 Estimated Delivery Time</h2>
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl font-bold text-primary">
                              {deliveryWindow?.earliestDisplay} - {deliveryWindow?.latestDisplay}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Estimated delivery in {deliveryWindow?.totalMinutes} minutes
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            💡 Prep time: {totalPrepTime} mins • Delivery: {avgDeliveryMinutes} mins
                          </p>
                        </div>
                      </>
                    ) : (
                      // Pickup: Show time slot selector
                      <>
                        <h2 className="text-xl font-bold mb-4">🏪 Pickup Time</h2>
                        <div>
                          <Label htmlFor="preferredTime">Select Pickup Time *</Label>
                          <Select
                            value={formData.preferredTime}
                            onValueChange={(value) => setFormData({ ...formData, preferredTime: value })}
                            required
                          >
                            <SelectTrigger id="preferredTime">
                              <SelectValue placeholder="Choose a time slot" />
                            </SelectTrigger>
                            <SelectContent>
                              {pickupSlots.map((slot: any) => (
                                <SelectItem key={slot.value} value={slot.value}>
                                  {slot.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground mt-2">
                            ⏰ Earliest pickup: {pickupSlots[0]?.label} ({totalPrepTime} mins prep time)
                          </p>
                        </div>
                      </>
                    )}
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
                    
                    <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-border">
                      <Checkbox
                        id="newsletter"
                        checked={subscribeToNewsletter}
                        onCheckedChange={(checked) => setSubscribeToNewsletter(checked as boolean)}
                      />
                      <Label
                        htmlFor="newsletter"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Subscribe to our newsletter for special offers and new menu items
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-3">
                      <Checkbox
                        id="sms-opt-in"
                        checked={smsOptIn}
                        onCheckedChange={(checked) => setSmsOptIn(checked as boolean)}
                      />
                      <Label
                        htmlFor="sms-opt-in"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Send me SMS updates about my order status (recommended)
                      </Label>
                    </div>
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
                          <span>
                            {orderType === 'delivery' ? (
                              finalDeliveryFee === 0 ? (
                                <span className="text-green-600 font-medium">FREE</span>
                              ) : (
                                `£${finalDeliveryFee.toFixed(2)}`
                              )
                            ) : (
                              '£0.00'
                            )}
                          </span>
                        </div>
                        {orderType === 'delivery' && minOrderFreeDelivery > 0 && totalPrice < minOrderFreeDelivery && (
                          <div className="text-xs text-muted-foreground italic">
                            💡 Spend £{(minOrderFreeDelivery - totalPrice).toFixed(2)} more for free delivery!
                          </div>
                        )}
                        <div className="border-t border-border pt-2 flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span className="text-primary">
                            £{orderTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                       disabled={createCheckoutMutation.isPending}
                    >
                       {createCheckoutMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Proceed to Payment'
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      By placing your order, you agree to our{' '}
                      <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Terms & Conditions
                      </a>
                      {' '}and{' '}
                      <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Privacy Policy
                      </a>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
