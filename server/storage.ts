import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from './_core/env';

// Initialize S3 client with AWS credentials
const s3Client = new S3Client({
  region: ENV.awsRegion,
  credentials: {
    accessKeyId: ENV.awsAccessKeyId,
    secretAccessKey: ENV.awsSecretAccessKey,
  },
});

/**
 * Upload a file to S3
 * @param key - S3 object key (path/filename)
 * @param data - File data (Buffer, Uint8Array, or string)
 * @param contentType - MIME type (e.g., 'image/png', 'application/pdf')
 * @returns Object with key and public URL
 */
export async function storagePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType?: string
): Promise<{ key: string; url: string }> {
  const command = new PutObjectCommand({
    Bucket: ENV.awsS3Bucket,
    Key: key,
    Body: data,
    ContentType: contentType,
    // Note: Public access is controlled by bucket policy, not ACLs
    // ACLs are disabled on this bucket (AWS recommended security setting)
  });

  await s3Client.send(command);

  // Construct public URL
  const url = `https://${ENV.awsS3Bucket}.s3.${ENV.awsRegion}.amazonaws.com/${key}`;

  return { key, url };
}

/**
 * Get a presigned URL for accessing a private S3 object
 * @param key - S3 object key (path/filename)
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Object with key and presigned URL
 */
export async function storageGet(
  key: string,
  expiresIn: number = 3600
): Promise<{ key: string; url: string }> {
  const command = new GetObjectCommand({
    Bucket: ENV.awsS3Bucket,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  return { key, url };
}
