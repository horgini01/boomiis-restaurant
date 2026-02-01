import { storagePut, storageGet } from './server/storage.ts';
import { readFileSync } from 'fs';

const logoPath = '/home/ubuntu/upload/kichenlogo.png';
const logoBuffer = readFileSync(logoPath);

console.log('Uploading logo...');
const { key } = await storagePut('restaurant-logos/test-logo.png', logoBuffer, 'image/png');
console.log('Upload successful, key:', key);

console.log('Getting signed URL...');
const { url } = await storageGet(key);
console.log('Signed URL:', url);

// Test if URL is accessible
console.log('\nTesting URL accessibility...');
const response = await fetch(url);
console.log('Status:', response.status, response.statusText);
console.log('Content-Type:', response.headers.get('content-type'));
