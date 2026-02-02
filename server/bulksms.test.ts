import { describe, it, expect } from 'vitest';
import { ENV } from './_core/env';

describe('BulkSMS Integration', () => {
  it('should validate BulkSMS credentials are configured', () => {
    // Check if BulkSMS credentials exist
    const hasCredentials = ENV.bulksmsTokenId && ENV.bulksmsTokenSecret;
    
    if (!hasCredentials) {
      console.log('[BulkSMS Test] No BulkSMS credentials configured - SMS will be disabled');
      expect(true).toBe(true); // Pass test if no credentials (optional feature)
      return;
    }
    
    expect(ENV.bulksmsTokenId).toBeTruthy();
    expect(ENV.bulksmsTokenSecret).toBeTruthy();
    expect(ENV.bulksmsTokenId.length).toBeGreaterThan(0);
    expect(ENV.bulksmsTokenSecret.length).toBeGreaterThan(0);
  });

  it('should validate BulkSMS API with profile request', async () => {
    const tokenId = ENV.bulksmsTokenId;
    const tokenSecret = ENV.bulksmsTokenSecret;
    
    if (!tokenId || !tokenSecret) {
      console.log('[BulkSMS Test] Skipping API validation - no credentials configured');
      expect(true).toBe(true); // Pass test if no credentials (optional feature)
      return;
    }

    // Make a test request to BulkSMS API to validate the credentials
    // Using the profile endpoint which doesn't send SMS but validates credentials
    const credentials = Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64');

    const response = await fetch('https://api.bulksms.com/v1/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    const data = await response.json();
    
    console.log('BulkSMS API validation result:', {
      status: response.status,
      username: data.username,
      credits: data.credits?.balance
    });

    // Check if the API credentials are valid
    expect(response.status).toBe(200);
    expect(data.username).toBeDefined();
    expect(data.credits).toBeDefined();
    
    if (data.credits?.balance !== undefined) {
      console.log(`BulkSMS account balance: ${data.credits.balance} credits`);
    }
  }, 10000); // 10 second timeout for API call
});
