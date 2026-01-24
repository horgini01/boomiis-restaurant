import { drizzle } from 'drizzle-orm/mysql2';
import { menuItems } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL!);

const imageMapping = {
  'puff-puff': '/menu-images/puff-puff.png',
  'plantain-chips': '/menu-images/plantain-chips.png',
  'suya-skewers': '/menu-images/suya-skewers.png',
  'jollof-rice-chicken': '/menu-images/jollof-rice-chicken.png',
  'egusi-soup-fufu': '/menu-images/egusi-soup-fufu.png',
};

async function updateImages() {
  for (const [slug, imageUrl] of Object.entries(imageMapping)) {
    await db.update(menuItems)
      .set({ imageUrl })
      .where(eq(menuItems.slug, slug));
    console.log(`Updated ${slug} with image ${imageUrl}`);
  }
  console.log('All images updated successfully!');
}

updateImages();
