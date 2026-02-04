import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export function ChefsSpecials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: featuredItems } = trpc.menu.featured.useQuery();
  const [, setLocation] = useLocation();

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (!featuredItems || featuredItems.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [featuredItems]);

  if (!featuredItems || featuredItems.length === 0) {
    return null;
  }

  const currentItem = featuredItems[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
  };

  const getPlaceholderImage = () => {
    return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=600&fit=crop&q=80`;
  };

  return (
    <div className="relative w-full bg-gradient-to-r from-orange-900/20 to-orange-800/20 rounded-lg overflow-hidden">
      <div className="relative h-[400px] md:h-[500px]">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${currentItem.imageUrl || getPlaceholderImage()})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative h-full container mx-auto px-4 flex items-center">
          <div className="max-w-2xl text-white space-y-4">
            <div className="inline-block px-4 py-2 bg-orange-500 rounded-full text-sm font-semibold mb-2">
              Chef's Special
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">{currentItem.name}</h2>
            <p className="text-lg md:text-xl text-gray-200">{currentItem.description}</p>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-orange-400">£{currentItem.price}</span>
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => setLocation(`/menu#item-${currentItem.id}`)}
              >
                Order Now
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {featuredItems.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Previous special"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Next special"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {featuredItems.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {featuredItems.map((_: any, index: number) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-orange-500 w-8' : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to special ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
