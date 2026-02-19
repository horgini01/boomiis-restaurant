import { ENV } from '../_core/env';

interface SMSCreditBalance {
  provider: 'bulksms' | 'textlocal';
  balance: number;
  success: boolean;
  error?: string;
}

/**
 * Check SMS credit balance from BulkSMS
 * API: GET https://api.bulksms.com/v1/profile
 * Auth: Basic Auth (Token ID:Token Secret)
 */
async function checkBulkSMSBalance(): Promise<SMSCreditBalance> {
  try {
    const tokenId = ENV.bulksmsTokenId;
    const tokenSecret = ENV.bulksmsTokenSecret;

    if (!tokenId || !tokenSecret) {
      return {
        provider: 'bulksms',
        balance: 0,
        success: false,
        error: 'BulkSMS credentials not configured',
      };
    }

    const auth = Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64');
    
    const response = await fetch('https://api.bulksms.com/v1/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`BulkSMS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      provider: 'bulksms',
      balance: data.credits?.balance || 0,
      success: true,
    };
  } catch (error: any) {
    console.error('[SMS Credit Checker] BulkSMS error:', error);
    return {
      provider: 'bulksms',
      balance: 0,
      success: false,
      error: error.message,
    };
  }
}

// TextLocal support can be added here when needed
// API: POST https://api.txtlocal.com/balance/
// Requires TEXTLOCAL_API_KEY in env

/**
 * Check SMS credit balance from BulkSMS (the configured provider)
 */
export async function checkSMSCreditBalance(): Promise<SMSCreditBalance> {
  return await checkBulkSMSBalance();
}
