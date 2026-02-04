import { Link, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ReviewsSection } from '@/components/ReviewsSection';
import { trpc } from '@/lib/trpc';
import { ShoppingCart, ArrowLeft, Leaf, Wheat, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

export default function MenuItemDetail() {
  const [, params] = useRoute('/menu/:id');
  const itemId = params?.id ? parseInt(params.id) : 0;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  const { data: item, isLoading } = trpc.menu.getById.useQuery({ id: itemId });
  
  const handleAddToCart = () => {
    if (item) {
      // Navigate to menu page with item in URL for cart addition
      window.location.href = `/menu?add=${item.id}`;
      toast.success('Redirecting to add to cart...');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-muted rounded-lg mb-8" />
            <div className="h-8 bg-muted rounded w-1/2 mb-4" />
            <div className="h-4 bg-muted rounded w-3/4 mb-8" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-xl text-muted-foreground mb-4">Menu item not found</p>
              <Link href="/menu">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Menu
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const imageUrl = item.imageUrl || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container py-8">
          {/* Back Button */}
          <Link href="/menu">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Menu
            </Button>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Image Section */}
            <div>
              <div 
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to enlarge
                  </span>
                </div>
              </div>
              
              <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={[{ src: imageUrl, alt: item.name }]}
                render={{
                  buttonPrev: () => null,
                  buttonNext: () => null,
                }}
              />
            </div>

            {/* Details Section */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{item.name}</h1>
                  <p className="text-3xl font-bold text-primary">£{parseFloat(item.price).toFixed(2)}</p>
                </div>
                {!item.isAvailable && (
                  <Badge variant="destructive">Unavailable</Badge>
                )}
                {item.outOfStock && (
                  <Badge variant="secondary">Out of Stock</Badge>
                )}
              </div>

              <p className="text-lg text-muted-foreground mb-6">{item.description}</p>

              {/* Dietary Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {item.isVegan && (
                  <Badge variant="outline" className="gap-1">
                    <Leaf className="h-3 w-3" />
                    Vegan
                  </Badge>
                )}
                {item.isGlutenFree && (
                  <Badge variant="outline" className="gap-1">
                    <Wheat className="h-3 w-3" />
                    Gluten-Free
                  </Badge>
                )}
                {item.isHalal && (
                  <Badge variant="outline" className="gap-1">
                    <Moon className="h-3 w-3" />
                    Halal
                  </Badge>
                )}
              </div>

              {/* Allergen Information */}
              {item.allergens && (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">Allergen Information</h3>
                    <p className="text-sm text-muted-foreground">{item.allergens}</p>
                  </CardContent>
                </Card>
              )}

              {/* Add to Cart Button */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={!item.isAvailable || item.outOfStock}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {!item.isAvailable
                  ? 'Currently Unavailable'
                  : item.outOfStock
                  ? 'Out of Stock'
                  : 'Add to Cart'}
              </Button>
            </div>
          </div>

          {/* Reviews Section */}
          <ReviewsSection menuItemId={item.id} menuItemName={item.name} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
