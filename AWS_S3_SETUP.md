# AWS S3 Integration Setup Guide

This guide explains how to set up AWS S3 for file storage in your restaurant application.

## Prerequisites

- AWS Account
- Access to AWS IAM Console
- Access to Railway environment variables

## Step 1: Create S3 Bucket

1. Log in to AWS Console
2. Navigate to S3 service
3. Click "Create bucket"
4. Configure bucket settings:
   - **Bucket name**: Choose a unique name (e.g., `boomiis-restaurant-uploads`)
   - **Region**: Choose closest to your users (e.g., `eu-west-2` for UK)
   - **Block Public Access**: Uncheck "Block all public access" (we need public read for uploaded images)
   - **Bucket Versioning**: Optional (recommended for production)
   - **Encryption**: Enable (recommended)
5. Click "Create bucket"

## Step 2: Configure Bucket Policy

1. Go to your bucket → Permissions tab
2. Scroll to "Bucket policy"
3. Add this policy (replace `YOUR-BUCKET-NAME` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

This allows public read access to uploaded files.

## Step 3: Create IAM User

1. Navigate to IAM service in AWS Console
2. Click "Users" → "Create user"
3. User name: `boomiis-restaurant-uploader`
4. Click "Next"
5. Select "Attach policies directly"
6. Click "Create policy" (opens new tab)
7. Use JSON editor and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ]
    }
  ]
}
```

8. Name the policy: `BoomiisS3UploadPolicy`
9. Create policy
10. Go back to user creation tab, refresh policies, and attach `BoomiisS3UploadPolicy`
11. Click "Next" → "Create user"

## Step 4: Generate Access Keys

1. Click on the newly created user
2. Go to "Security credentials" tab
3. Scroll to "Access keys"
4. Click "Create access key"
5. Select "Application running outside AWS"
6. Click "Next" → "Create access key"
7. **IMPORTANT**: Copy both:
   - Access key ID
   - Secret access key
   
   ⚠️ **Save these securely - you won't be able to see the secret key again!**

## Step 5: Add Environment Variables to Railway

Add these four environment variables to your Railway project:

```
AWS_ACCESS_KEY_ID=<your-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
AWS_REGION=<your-bucket-region>
AWS_S3_BUCKET=<your-bucket-name>
```

**Example:**
```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=eu-west-2
AWS_S3_BUCKET=boomiis-restaurant-uploads
```

## Step 6: Deploy

After adding the environment variables, redeploy your Railway application. The S3 integration will be active.

## Testing

After deployment, test the integration by:

1. Log in to admin dashboard
2. Go to Menu Items Management
3. Try uploading an image
4. Check your S3 bucket to verify the file was uploaded
5. Verify the image displays correctly on the frontend

## Security Best Practices

1. **Never commit AWS credentials to git**
2. **Use IAM user with minimal permissions** (only S3 access, not full AWS access)
3. **Enable S3 bucket versioning** for production to recover from accidental deletions
4. **Set up CloudFront CDN** for better performance (optional but recommended)
5. **Enable S3 access logging** to track who accesses your files
6. **Rotate access keys regularly** (every 90 days recommended)

## Cost Estimation

AWS S3 pricing (as of 2026):
- Storage: ~$0.023 per GB/month
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests

For a restaurant with ~500 images (avg 2MB each):
- Storage: ~1GB = $0.023/month
- Uploads: negligible
- Downloads: depends on traffic

**Estimated cost: $1-5/month for typical restaurant usage**

## Troubleshooting

### "Access Denied" errors
- Check IAM policy includes your bucket name
- Verify access keys are correct in Railway
- Ensure bucket policy allows public read

### Images not displaying
- Check bucket policy allows public GetObject
- Verify AWS_REGION matches your bucket's region
- Check browser console for CORS errors

### "Region is missing" error
- Ensure AWS_REGION is set in Railway environment variables
- Redeploy after adding the variable

## Alternative: Private Files with Presigned URLs

If you want files to be private (not publicly accessible), modify the bucket policy to remove public access and use `storageGet()` function which generates presigned URLs:

```typescript
// Get a presigned URL valid for 1 hour
const { url } = await storageGet('menu-items/dish.jpg', 3600);
```

This is recommended for sensitive files like customer data or invoices.
