import { XummSdk } from 'xumm-sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.NEXT_PUBLIC_XUMM_API_KEY;
const apiSecret = process.env.XUMM_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error('Xumm API Key and Secret must be provided');
}

export const xummSdk = new XummSdk(apiKey, apiSecret); 