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
  const [searchQuery, setSearchQuery] = useState('');
  const { addItem } = useCart();

  const { data: categories, isLoading: categoriesLoading } = trpc.menu.categories.useQuery();
  const { data: items, isLoading: itemsLoading } = trpc.menu.items.useQuery({ categoryId: selectedCategory });

  const filteredItems = items?.filter(item => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = item.name.toLowerCase().includes(query);
      const matchesDescription = item.description?.toLowerCase().includes(query) || false;
      
      if (!matchesName && !matchesDescription) {
        return false;
      }
    }

    // Dietary filter
    if (dietaryFilter === 'vegan') return item.isVegan;
    if (dietaryFilter === 'glutenFree') return item.isGlutenFree;
    if (dietaryFilter === 'halal') return item.isHalal;
    return true;
  });

  const handleAddToCart = (item: any) => {
    if (!item.isAvailable) {
      toast.error(`${item.name} is currently unavailable`);
      return;
    }
    if (item.outOfStock) {
      toast.error(`${item.name} is temporarily out of stock`);
      return;
    }
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

        {/* Search and Filters */}
        <section className="py-8 border-b border-border">
          <div className="container">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative max-w-2xl mx-auto">
                <input
                  type="text"
                  placeholder="Search menu by name or ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 text-lg border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

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
                  <Card key={item.id} className={`overflow-hidden border-border/50 hover:border-primary/50 transition-colors flex flex-col ${item.outOfStock ? 'opacity-75' : ''}`}>
                    <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center relative">
                      {item.outOfStock && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                          <Badge variant="destructive" className="text-base px-4 py-2 font-bold">
                            Temporarily Out of Stock
                          </Badge>
                        </div>
                      )}
                      <img 
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop'} 
                        alt={item.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';
                        }}
                      />
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {!item.isAvailable && (
                          <Badge variant="destructive" className="gap-1 font-semibold">
                            Currently Unavailable
                          </Badge>
                        )}
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
                    <CardContent className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                      <p className="text-muted-foreground mb-4 text-sm flex-1">{item.description}</p>
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
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-2xl font-bold text-primary">£{item.price}</span>
                        <Button
                          onClick={() => handleAddToCart(item)}
                          disabled={!item.isAvailable || item.outOfStock}
                          className="gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          {item.outOfStock ? 'Out of Stock' : 'Add to Cart'}
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
