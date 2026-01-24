import { Link, useParams } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function OrderSuccess() {
  const params = useParams();
  const orderNumber = params.orderNumber;

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
              
              <h1 className="text-4xl font-bold mb-4">Order Placed Successfully!</h1>
              
              <p className="text-xl text-muted-foreground mb-6">
                Thank you for your order. We've received it and will start preparing your food shortly.
              </p>
              
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
