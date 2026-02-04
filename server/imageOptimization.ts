import sharp from 'sharp';
import { storagePut } from './storage';

/**
 * Optimize an image by compressing and converting to WebP format
 * @param imageBuffer - The original image buffer
 * @param filename - Original filename (used for generating output filename)
 * @param quality - WebP quality (1-100, default 80)
 * @returns Object containing the S3 URL and file key
 */
export async function optimizeAndUploadImage(
  imageBuffer: Buffer,
  filename: string,
  quality: number = 80
): Promise<{ url: string; key: string }> {
  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    // Determine max dimensions (maintain aspect ratio)
    const maxWidth = 1200;
    const maxHeight = 1200;
    
    // Process image: resize, convert to WebP, and compress
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
    
    // Generate unique filename with WebP extension
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const baseFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    const outputFilename = `${baseFilename}-${timestamp}-${randomSuffix}.webp`;
    const fileKey = `menu-images/${outputFilename}`;
    
    // Upload to S3
    const { url } = await storagePut(fileKey, optimizedBuffer, 'image/webp');
    
    // Log optimization results
    const originalSize = imageBuffer.length;
    const optimizedSize = optimizedBuffer.length;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    
    console.log(`[Image Optimization] ${filename}`);
    console.log(`  Original: ${(originalSize / 1024).toFixed(1)} KB`);
    console.log(`  Optimized: ${(optimizedSize / 1024).toFixed(1)} KB (${savings}% reduction)`);
    console.log(`  Format: ${metadata.format} → WebP`);
    console.log(`  Dimensions: ${metadata.width}x${metadata.height}`);
    
    return { url, key: fileKey };
  } catch (error) {
    console.error('[Image Optimization] Error:', error);
    throw new Error('Failed to optimize image');
  }
}

/**
 * Get placeholder image URL based on category
 * @param categoryName - The menu category name
 * @returns Placeholder image URL
 */
export function getPlaceholderImage(categoryName?: string): string {
  const placeholders: Record<string, string> = {
    'Main Dishes': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
    'Soups & Stews': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop',
    'Sides': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    'Appetizers': 'https://images.unsplash.com/photo-1599974789516-ecdc2c2c1c3e?w=800&h=600&fit=crop',
    'Desserts': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop',
    'Beverages': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&h=600&fit=crop',
    'default': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
  };
  
  return placeholders[categoryName || 'default'] || placeholders['default'];
}
