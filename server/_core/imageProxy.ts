import type { Request, Response } from 'express';
import { ENV } from './env';

/**
 * Generic image proxy endpoint that fetches images from Manus storage
 * with authentication and serves them publicly.
 * 
 * This allows images stored in private S3 buckets to be displayed
 * in the browser without exposing credentials.
 */
export async function handleImageProxy(req: Request, res: Response) {
  try {
    const key = decodeURIComponent(req.params.key || req.params[0] || '');
    
    if (!key) {
      return res.status(400).send('Image key is required');
    }

    console.log('[Image Proxy] Fetching image:', key);

    // Fetch download URL from Manus storage API
    const downloadUrlResponse = await fetch(
      `${ENV.forgeApiUrl}/v1/storage/downloadUrl`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify({ path: key }),
      }
    );

    if (!downloadUrlResponse.ok) {
      const errorText = await downloadUrlResponse.text();
      console.error('[Image Proxy] Download URL error:', errorText);
      return res.status(500).send('Failed to get download URL');
    }

    const { url: signedUrl } = await downloadUrlResponse.json();
    console.log('[Image Proxy] Got signed URL, fetching image...');

    // Fetch the actual image from the signed URL
    const imageResponse = await fetch(signedUrl);
    
    if (!imageResponse.ok) {
      console.error('[Image Proxy] Image fetch error:', imageResponse.status);
      return res.status(imageResponse.status).send('Failed to fetch image');
    }

    // Get content type from response
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const imageBuffer = await imageResponse.arrayBuffer();

    // Set appropriate cache headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('[Image Proxy] Error:', error);
    res.status(500).send('Failed to fetch image');
  }
}
