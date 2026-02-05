import { Link } from 'wouter';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { UtensilsCrossed, Calendar, Truck, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { ChefsSpecials } from '@/components/ChefsSpecials';

export default function Home() {
  const [email, setEmail] = useState('');
  const { data: featuredItems = [], isLoading: isFeaturedLoading } = trpc.menu.featured.useQuery();
  const { restaurantName, restaurantTagline } = useSettings();
  
  const subscribeMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      toast.success('Thank you for subscribing!');
      setEmail('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to subscribe');
    },
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      subscribeMutation.mutate({ email });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Home"
        description="Experience authentic West African cuisine at Boomiis Restaurant in London. Enjoy traditional dishes like Jollof Rice, Egusi Soup, and Suya in a warm, welcoming atmosphere. Book your table today!"
        image="https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=1200&h=630&fit=crop"
        url="/"
      />
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary opacity-90" />
          <div className="absolute inset-0 pattern-african opacity-30" />
          
          <div className="container relative z-10 text-center py-20">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground">
              Experience Authentic
              <span className="block text-primary mt-2">African Cuisine</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {restaurantTagline}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/menu">
                <Button size="lg" className="text-lg px-8">
                  View Menu
                </Button>
              </Link>
              <Link href="/reservations">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Book a Table
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-16 bg-card">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-border/50 bg-background/50">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <UtensilsCrossed className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Dine In</h3>
                  <p className="text-muted-foreground">
                    Experience our warm atmosphere and authentic flavors in our beautifully decorated restaurant
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-background/50">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Truck className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Delivery & Pickup</h3>
                  <p className="text-muted-foreground">
                    Enjoy our delicious meals at home with fast delivery or convenient pickup options
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-background/50">
                <CardContent className="pt-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Events & Catering</h3>
                  <p className="text-muted-foreground">
                    Let us cater your special events with our authentic African cuisine and professional service
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Chef's Specials Banner */}
        <ChefsSpecials />

        {/* Featured Dishes */}
        <section className="py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Featured Dishes</h2>
              <p className="text-xl text-muted-foreground">
                Taste the best of West African cuisine
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {isFeaturedLoading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} className="overflow-hidden border-border/50">
                    <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 animate-pulse" />
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded mb-2 animate-pulse" />
                      <div className="h-4 bg-muted rounded mb-4 animate-pulse" />
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-10 w-24 bg-muted rounded animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : featuredItems.length > 0 ? (
                featuredItems.slice(0, 3).map((item) => (
                  <Card key={item.id} className="overflow-hidden border-border/50">
                    <Link href={`/menu/${item.id}`}>
                      <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center cursor-pointer">
                        <img 
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop'} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';
                          }}
                        />
                      </div>
                    </Link>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                      <p className="text-muted-foreground mb-4">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">£{item.price}</span>
                        <Link href="/menu">
                          <Button variant="outline" size="sm">
                            Order Now
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                // Fallback if no featured items
                <div className="col-span-3 text-center py-12">
                  <p className="text-muted-foreground">No featured dishes available at the moment.</p>
                </div>
              )}
            </div>

            <div className="text-center mt-8">
              <Link href="/menu">
                <Button size="lg" variant="outline">
                  View Full Menu
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-card">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-xl text-muted-foreground">
                Hear from those who love our food
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Sarah Johnson',
                  review: 'The best African food I\'ve had in London! The jollof rice is absolutely incredible.',
                  rating: 5,
                },
                {
                  name: 'Michael Chen',
                  review: 'Amazing flavors and generous portions. The staff are so friendly and welcoming.',
                  rating: 5,
                },
                {
                  name: 'Aisha Mohammed',
                  review: 'Reminds me of home! Authentic taste and beautiful presentation. Highly recommend!',
                  rating: 5,
                },
              ].map((testimonial, index) => (
                <Card key={index} className="border-border/50 bg-background/50">
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">"{testimonial.review}"</p>
                    <p className="font-semibold">{testimonial.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-16">
          <div className="container">
            <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
                <p className="text-xl text-muted-foreground mb-6">
                  Subscribe to our newsletter for special offers and new menu items
                </p>
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" disabled={subscribeMutation.isPending}>
                    {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
                  </Button>
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
