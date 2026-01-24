import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { Loader2, ShoppingCart, Leaf, Wheat, Moon } from 'lucide-react';

export default function Menu() {
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'vegan' | 'glutenFree' | 'halal'>('all');
  const { addItem } = useCart();

  const { data: categories, isLoading: categoriesLoading } = trpc.menu.categories.useQuery();
  const { data: items, isLoading: itemsLoading } = trpc.menu.items.useQuery({ categoryId: selectedCategory });

  const filteredItems = items?.filter(item => {
    if (dietaryFilter === 'vegan') return item.isVegan;
    if (dietaryFilter === 'glutenFree') return item.isGlutenFree;
    if (dietaryFilter === 'halal') return item.isHalal;
    return true;
  });

  const handleAddToCart = (item: any) => {
    addItem({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
      imageUrl: item.imageUrl || undefined,
    });
    toast.success(`${item.name} added to cart`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-background via-background to-secondary">
          <div className="container">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">Our Menu</h1>
            <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto">
              Explore our selection of authentic West African dishes
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="py-8 border-b border-border">
          <div className="container">
            {/* Category Filter */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">CATEGORIES</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === undefined ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(undefined)}
                  size="sm"
                >
                  All
                </Button>
                {categoriesLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  categories?.map(category => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(category.id)}
                      size="sm"
                    >
                      {category.name}
                    </Button>
                  ))
                )}
              </div>
            </div>

            {/* Dietary Filter */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">DIETARY PREFERENCES</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={dietaryFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setDietaryFilter('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={dietaryFilter === 'vegan' ? 'default' : 'outline'}
                  onClick={() => setDietaryFilter('vegan')}
                  size="sm"
                  className="gap-2"
                >
                  <Leaf className="h-4 w-4" />
                  Vegan
                </Button>
                <Button
                  variant={dietaryFilter === 'glutenFree' ? 'default' : 'outline'}
                  onClick={() => setDietaryFilter('glutenFree')}
                  size="sm"
                  className="gap-2"
                >
                  <Wheat className="h-4 w-4" />
                  Gluten-Free
                </Button>
                <Button
                  variant={dietaryFilter === 'halal' ? 'default' : 'outline'}
                  onClick={() => setDietaryFilter('halal')}
                  size="sm"
                  className="gap-2"
                >
                  <Moon className="h-4 w-4" />
                  Halal
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Menu Items */}
        <section className="py-12">
          <div className="container">
            {itemsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredItems && filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => (
                  <Card key={item.id} className="overflow-hidden border-border/50 hover:border-primary/50 transition-colors">
                    <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center relative">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-primary/40 text-6xl">🍽️</div>
                      )}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {item.isVegan && (
                          <Badge variant="secondary" className="gap-1">
                            <Leaf className="h-3 w-3" />
                            Vegan
                          </Badge>
                        )}
                        {item.isGlutenFree && (
                          <Badge variant="secondary" className="gap-1">
                            <Wheat className="h-3 w-3" />
                            GF
                          </Badge>
                        )}
                        {item.isHalal && (
                          <Badge variant="secondary" className="gap-1">
                            <Moon className="h-3 w-3" />
                            Halal
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                      <p className="text-muted-foreground mb-4 text-sm">{item.description}</p>
                      {(() => {
                        try {
                          const allergensList = item.allergens ? JSON.parse(item.allergens) : [];
                          if (Array.isArray(allergensList) && allergensList.length > 0) {
                            return (
                              <p className="text-xs text-muted-foreground mb-4">
                                <span className="font-semibold">Allergens:</span> {allergensList.join(', ')}
                              </p>
                            );
                          }
                        } catch (e) {
                          // If not JSON, treat as plain string
                          if (item.allergens && item.allergens !== 'None' && item.allergens.trim() !== '') {
                            return (
                              <p className="text-xs text-muted-foreground mb-4">
                                <span className="font-semibold">Allergens:</span> {item.allergens}
                              </p>
                            );
                          }
                        }
                        return null;
                      })()}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">£{item.price}</span>
                        <Button
                          onClick={() => handleAddToCart(item)}
                          className="gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Add to Cart
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">No items found matching your filters</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
