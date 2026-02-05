import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
}

export function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  article,
}: SEOProps) {
  const siteTitle = 'Boomiis Restaurant - Authentic West African Cuisine in London';
  const defaultDescription =
    'Experience authentic West African cuisine at Boomiis Restaurant in London. Enjoy traditional dishes like Jollof Rice, Egusi Soup, and Suya in a warm, welcoming atmosphere.';
  const defaultImage = 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=1200&h=630&fit=crop';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const fullTitle = title ? `${title} | Boomiis Restaurant` : siteTitle;
  const metaDescription = description || defaultDescription;
  const metaImage = image || defaultImage;
  const metaUrl = url ? `${baseUrl}${url}` : baseUrl;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:site_name" content="Boomiis Restaurant" />
      <meta property="og:locale" content="en_GB" />

      {/* Article specific tags */}
      {type === 'article' && article && (
        <>
          {article.publishedTime && (
            <meta property="article:published_time" content={article.publishedTime} />
          )}
          {article.modifiedTime && (
            <meta property="article:modified_time" content={article.modifiedTime} />
          )}
          {article.author && <meta property="article:author" content={article.author} />}
          {article.section && <meta property="article:section" content={article.section} />}
          {article.tags && article.tags.map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={metaUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={metaDescription} />
      <meta property="twitter:image" content={metaImage} />

      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content="Boomiis Restaurant" />

      {/* Canonical URL */}
      <link rel="canonical" href={metaUrl} />
    </Helmet>
  );
}
