import { useState } from 'react';
import { SEO } from '@/components/SEO';
import { trpc } from '@/lib/trpc';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Button } from '@/components/ui/button';

export function Gallery() {
  const seoDescription = "Browse our photo gallery showcasing authentic West African dishes, restaurant ambiance, events, and our team. See the vibrant colors and rich flavors of Boomiis Restaurant in London.";
  const [selectedCategory, setSelectedCategory] = useState<'ambiance' | 'dishes' | 'events' | 'team' | undefined>();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: images, isLoading } = trpc.gallery.list.useQuery({ category: selectedCategory });

  const categories = [
    { value: undefined, label: 'All' },
    { value: 'ambiance' as const, label: 'Restaurant Ambiance' },
    { value: 'dishes' as const, label: 'Our Dishes' },
    { value: 'events' as const, label: 'Events & Catering' },
    { value: 'team' as const, label: 'Our Team' },
  ];

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const slides = images?.map((img) => ({
    src: img.imageUrl,
    alt: img.title || undefined,
    description: img.description || undefined,
  })) || [];

  return (
    <>
      <SEO 
        title="Gallery"
        description={seoDescription}
        image="https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=1200&h=630&fit=crop"
        url="/gallery"
      />
      <div className="min-h-screen bg-background">
        <Header />
      {/* Page Header */}
      <div className="bg-black text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Gallery</h1>
          <p className="text-xl text-gray-400">
            Explore our restaurant, dishes, and memorable moments
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {categories.map((cat) => (
            <Button
              key={cat.label}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat.value)}
              className={selectedCategory === cat.value ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Image Grid */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading gallery...</p>
          </div>
        )}

        {!isLoading && images && images.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No images in this category yet.</p>
          </div>
        )}

        {!isLoading && images && images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
                onClick={() => handleImageClick(index)}
              >
                <img
                  src={image.imageUrl}
                  alt={image.title || 'Gallery image'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-4">
                  <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <h3 className="font-semibold">{image.title}</h3>
                    {image.description && (
                      <p className="text-sm text-gray-200">{image.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={slides}
        index={lightboxIndex}
      />
        <Footer />
      </div>
    </>
  );
}