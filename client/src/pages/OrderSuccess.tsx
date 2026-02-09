import { Link, useParams, useLocation, useSearch } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useCart } from '@/contexts/CartContext';

export default function OrderSuccess() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const { clearCart } = useCart();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  // Extract session_id from URL query params
  const sessionId = new URLSearchParams(searchString).get('session_id');

  const verifyPaymentQuery = trpc.payment.verifyPayment.useQuery(
    { sessionId: sessionId || '' },
    { 
      enabled: !!sessionId,
      retry: false,
      // Poll every 2 seconds until order is created
      refetchInterval: orderNumber ? false : 2000,
    }
  );

  useEffect(() => {
    if (sessionId && verifyPaymentQuery.data) {
      if (verifyPaymentQuery.data.paymentStatus === 'paid') {
        setPaymentVerified(true);
        if (verifyPaymentQuery.data.orderNumber) {
          setOrderNumber(verifyPaymentQuery.data.orderNumber);
        }
        clearCart();
        console.log('[OrderSuccess] Cart cleared after successful payment');
      }
      setIsVerifying(false);
    } else if (!sessionId) {
      // No session ID means direct access, redirect to home
      setLocation('/');
    }
  }, [sessionId, verifyPaymentQuery.data, clearCart, setLocation]);

  if (isVerifying || verifyPaymentQuery.isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">Verifying your payment...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!paymentVerified) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-xl text-muted-foreground">Payment verification failed. Please contact support.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="container max-w-2xl">
          <Card className="border-primary/20">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
              
              <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
              
              <p className="text-xl text-muted-foreground mb-6">
                Thank you for your order. Your payment has been processed and we'll start preparing your food shortly.
              </p>
              
              <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
                <span>Secured by</span>
                <svg className="h-5" viewBox="0 0 60 25" fill="currentColor">
                  <path d="M0 12.5C0 5.596 5.596 0 12.5 0h35C54.404 0 60 5.596 60 12.5S54.404 25 47.5 25h-35C5.596 25 0 19.404 0 12.5z" fill="#635BFF"/>
                  <text x="30" y="17" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">stripe</text>
                </svg>
              </div>
              
              {orderNumber && (
                <div className="bg-secondary/20 border border-border rounded-lg p-6 mb-8">
                  <p className="text-sm text-muted-foreground mb-2">Your Order Number</p>
                  <p className="text-2xl font-bold text-primary">{orderNumber}</p>
                </div>
              )}
              
              <div className="space-y-4 mb-8 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Order Confirmed</h3>
                    <p className="text-sm text-muted-foreground">We've received your order and will send you a confirmation email shortly.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Preparing Your Food</h3>
                    <p className="text-sm text-muted-foreground">Our chefs will start preparing your delicious meal.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">On Its Way</h3>
                    <p className="text-sm text-muted-foreground">Your order will be delivered or ready for pickup soon.</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/menu">
                  <Button size="lg" variant="outline">
                    Order Again
                  </Button>
                </Link>
                <Link href="/">
                  <Button size="lg">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
