import { NextResponse } from 'next/server';
import { getXummServer } from '@/lib/xumm';

export async function POST() {
  try {
    console.log('Creating Xumm payload - getting server instance');
    
    const xumm = getXummServer();
    
    if (!xumm) {
      console.error('Xumm server instance is null');
      return NextResponse.json({ error: 'Xumm service unavailable' }, { status: 503 });
    }
    
    console.log('Xumm server instance created successfully, creating payload');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Create a payload for sign-in request
    const payload = await xumm.payload.create({
      txjson: {
        TransactionType: 'SignIn'
      },
      custom_meta: {
        identifier: 'sentinel_wallet_login',
        instruction: 'Please sign to authenticate with Sentinel Wallet'
      },
      options: {
        expire: 5, // Expires after 5 minutes
        return_url: {
          app: `${baseUrl}/auth/callback`,
          web: `${baseUrl}/auth/callback`
        }
      }
    });
    
    if (payload && payload.uuid) {
      console.log('Payload created successfully', { uuid: payload.uuid });
      console.log('Xumm sign URL:', payload.next?.always);
      
      // Ajouter manuellement le paramètre payloadId à l'objet payload retourné
      if (payload.refs && payload.refs.qr_uri_quality_opts) {
        const callbackUrl = `${baseUrl}/auth/callback?payloadId=${payload.uuid}`;
        
        // Retourner un objet augmenté au lieu de modifier directement payload
        return NextResponse.json({
          ...payload,
          sentinel: {
            callback_url: callbackUrl
          }
        });
      }
    } else {
      console.log('Payload created but no UUID returned');
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error creating Xumm payload:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({ 
      error: 'Failed to create authentication request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 