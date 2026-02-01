/**
 * Storage Abstraction Layer
 * 
 * Provides a unified interface for file storage across different providers.
 * Supports Manus storage (with server-side proxy), AWS S3, Cloudinary, etc.
 */

export interface StorageProvider {
  /**
   * Upload a file and return a URL that can be used to access it
   */
  upload(key: string, data: Buffer | Uint8Array | string, contentType?: string): Promise<{ url: string; key: string }>;
  
  /**
   * Get a URL to download/display a file
   */
  getUrl(key: string): string;
  
  /**
   * Delete a file
   */
  delete(key: string): Promise<void>;
}

export interface StorageConfig {
  provider: 'manus' | 'aws-s3' | 'cloudinary';
  // Manus-specific config
  manusApiUrl?: string;
  manusApiKey?: string;
  // AWS S3 config
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  awsBucket?: string;
  // Cloudinary config
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
}

/**
 * Get the configured storage provider
 */
export function getStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case 'manus':
      return createManusStorageProvider(config);
    case 'aws-s3':
      throw new Error('AWS S3 provider not yet implemented');
    case 'cloudinary':
      throw new Error('Cloudinary provider not yet implemented');
    default:
      throw new Error(`Unknown storage provider: ${config.provider}`);
  }
}

/**
 * Manus Storage Provider
 * 
 * Files are uploaded to Manus storage and served via server-side proxy
 * to handle authentication.
 */
function createManusStorageProvider(config: StorageConfig): StorageProvider {
  if (!config.manusApiUrl || !config.manusApiKey) {
    throw new Error('Manus storage requires manusApiUrl and manusApiKey');
  }

  return {
    async upload(key: string, data: Buffer | Uint8Array | string, contentType?: string) {
      const formData = new FormData();
      let blobData: Uint8Array | string;
      if (data instanceof Buffer) {
        blobData = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      } else {
        blobData = data;
      }
      const blob = new Blob([blobData as any], { type: contentType || 'application/octet-stream' });
      formData.append('file', blob);
      formData.append('path', key);

      const response = await fetch(`${config.manusApiUrl}/v1/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.manusApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Return proxy URL instead of direct S3 URL
      return {
        url: `/api/images/${encodeURIComponent(key)}`,
        key: key,
      };
    },

    getUrl(key: string) {
      // Return proxy URL that will fetch from Manus storage with auth
      return `/api/images/${encodeURIComponent(key)}`;
    },

    async delete(key: string) {
      // Implement delete if needed
      throw new Error('Delete not yet implemented for Manus storage');
    },
  };
}
