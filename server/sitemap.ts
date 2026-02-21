import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from './db.js';
import { menuItems, blogPosts } from '../drizzle/schema.js';

export async function generateSitemap(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).send('Database not available');
    }

    const baseUrl = process.env.BASE_URL || 'https://boomiis.com';
    const currentDate = new Date().toISOString().split('T')[0];

    // Static pages with their priorities and change frequencies
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/menu', priority: '0.9', changefreq: 'weekly' },
      { url: '/reservations', priority: '0.8', changefreq: 'monthly' },
      { url: '/events', priority: '0.7', changefreq: 'weekly' },
      { url: '/gallery', priority: '0.6', changefreq: 'monthly' },
      { url: '/blog', priority: '0.7', changefreq: 'weekly' },
      { url: '/about', priority: '0.6', changefreq: 'monthly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/reviews', priority: '0.6', changefreq: 'weekly' },
    ];

    // Fetch dynamic content
    const [allMenuItems, allBlogPosts] = await Promise.all([
      db.select().from(menuItems).where(eq(menuItems.isAvailable, true)),
      db.select().from(blogPosts).where(eq(blogPosts.isPublished, true)),
    ]);

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    staticPages.forEach((page) => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <lastmod>${currentDate}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Menu items are accessible via /menu page, no need for individual URLs

    // Add blog posts
    allBlogPosts.forEach((post) => {
      const postDate = new Date(post.publishedAt || post.createdAt).toISOString().split('T')[0];
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${postDate}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

export function generateRobotsTxt(req: Request, res: Response) {
  const baseUrl = process.env.BASE_URL || 'https://boomiis.com';
  
  const robotsTxt = `# Boomiis Restaurant - robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout
Disallow: /order-confirmation

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for polite crawlers
Crawl-delay: 1
`;

  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
}
