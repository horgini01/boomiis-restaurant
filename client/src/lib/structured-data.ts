// Utility functions for generating Schema.org structured data

interface RestaurantInfo {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  email: string;
  openingHours: string[];
  priceRange: string;
  cuisine: string[];
  image: string;
  logo: string;
  url: string;
}

interface MenuItem {
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
}

interface Review {
  author: string;
  rating: number;
  reviewBody: string;
  datePublished: string;
}

export function generateRestaurantSchema(info: RestaurantInfo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: info.name,
    description: info.description,
    image: info.image,
    logo: info.logo,
    url: info.url,
    telephone: info.phone,
    email: info.email,
    priceRange: info.priceRange,
    servesCuisine: info.cuisine,
    address: {
      '@type': 'PostalAddress',
      streetAddress: info.address.street,
      addressLocality: info.address.city,
      postalCode: info.address.postalCode,
      addressCountry: info.address.country,
    },
    openingHoursSpecification: info.openingHours.map((hours) => {
      // Parse format like "Monday-Friday: 11:00-22:00"
      const [days, times] = hours.split(':').map(s => s.trim());
      const [open, close] = times.split('-');
      
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: days.split('-'),
        opens: open,
        closes: close,
      };
    }),
  };
}

export function generateLocalBusinessSchema(info: RestaurantInfo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': info.url,
    name: info.name,
    description: info.description,
    image: info.image,
    logo: info.logo,
    url: info.url,
    telephone: info.phone,
    email: info.email,
    priceRange: info.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: info.address.street,
      addressLocality: info.address.city,
      postalCode: info.address.postalCode,
      addressCountry: info.address.country,
    },
  };
}

export function generateMenuSchema(menuItems: MenuItem[], restaurantName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: `${restaurantName} Menu`,
    hasMenuSection: Array.from(new Set(menuItems.map(item => item.category))).map(category => ({
      '@type': 'MenuSection',
      name: category,
      hasMenuItem: menuItems
        .filter(item => item.category === category)
        .map(item => ({
          '@type': 'MenuItem',
          name: item.name,
          description: item.description,
          offers: {
            '@type': 'Offer',
            price: item.price.toFixed(2),
            priceCurrency: 'GBP',
          },
          ...(item.image && { image: item.image }),
        })),
    })),
  };
}

export function generateAggregateRatingSchema(
  restaurantName: string,
  restaurantUrl: string,
  reviews: Review[]
) {
  if (reviews.length === 0) return null;

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurantName,
    url: restaurantUrl,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: averageRating.toFixed(1),
      reviewCount: reviews.length,
      bestRating: '5',
      worstRating: '1',
    },
  };
}

export function generateReviewSchema(review: Review, restaurantName: string, restaurantUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Restaurant',
      name: restaurantName,
      url: restaurantUrl,
    },
    author: {
      '@type': 'Person',
      name: review.author,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: '5',
      worstRating: '1',
    },
    reviewBody: review.reviewBody,
    datePublished: review.datePublished,
  };
}

export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
