'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getXummServer } from '@/lib/xumm';
import { createOrUpdateUser, getUserByWalletAddress } from '@/lib/supabase';

/**
 * Cette fonction crée le cookie de session
 * Elle doit être appelée seulement depuis un Route Handler ou un Server Action
 */
export async function setWalletSession(walletAddress: string) {
  try {
    console.log('Direct cookie manipulation is not allowed in Pages - redirecting to action');
    // Cette fonction ne devrait jamais être appelée directement depuis une page
    throw new Error('This function must be called from a Route Handler or Form Action');
  } catch (error) {
    console.error('Error in setWalletSession:', error);
    return false;
  }
}

/**
 * Action serveur pour définir la session et rediriger vers le dashboard
 */
export async function createSessionAction(formData: FormData) {
  const walletAddress = formData.get('walletAddress') as string;
  const redirectUrl = formData.get('redirect') as string || '/dashboard';
  
  if (!walletAddress) {
    console.error('No wallet address provided to createSessionAction');
    return;
  }
  
  try {
    console.log('Creating session via form action for:', walletAddress);
    console.log('Will redirect to:', redirectUrl);
    
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'wallet_address',
      value: walletAddress,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Note: la redirection va lancer une exception NEXT_REDIRECT
    // Ce comportement est normal et ne devrait pas être considéré comme une erreur
    console.log('Cookie set successfully, redirecting now...');
    
    // Redirection automatique vers l'URL spécifiée ou dashboard par défaut
    redirect(redirectUrl);
  } catch (error) {
    // Vérifier si c'est une erreur de redirection de Next.js
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('NEXT_REDIRECT')) {
      // C'est une redirection normale, pas besoin de logger comme erreur
      console.log('Redirecting with Next.js redirect()...');
    } else {
      // C'est une vraie erreur
      console.error('Failed to set wallet session cookie via action:', error);
    }
  }
}

/**
 * Route API pour définir la session et retourner l'URL de redirection
 */
export async function createSession(walletAddress: string) {
  if (!walletAddress) {
    console.error('No wallet address provided to createSession');
    return { success: false };
  }
  
  try {
    console.log('Creating session for:', walletAddress);
    
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'wallet_address',
      value: walletAddress,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return { success: true, redirectUrl: '/dashboard' };
  } catch (error) {
    console.error('Failed to create session:', error);
    return { success: false };
  }
}

/**
 * Verifies the status of a Xumm payload
 */
export async function verifyXummPayload(payloadId: string) {
  try {
    console.log('Verifying Xumm payload:', payloadId);
    
    const xumm = getXummServer();
    
    if (!xumm) {
      console.error('Xumm service unavailable');
      throw new Error('Xumm service unavailable');
    }

    // Check payload status
    const payload = await xumm.payload.get(payloadId);
    
    console.log('Payload retrieved:', payload ? 'OK' : 'NULL');
    
    // Vérifier si le payload existe et a une structure valide
    if (!payload || !payload.meta) {
      console.error('Invalid payload structure received:', payload);
      return { 
        success: false, 
        status: 'error',
        message: 'Invalid authentication response received'
      };
    }
    
    if (!payload.meta.resolved) {
      return { 
        success: false, 
        status: 'pending',
        message: 'Waiting for user signature'
      };
    }

    if (payload.meta.signed === false) {
      return { 
        success: false, 
        status: 'rejected',
        message: 'User rejected the signature request'
      };
    }

    // User has signed
    if (payload.response.account) {
      const walletAddress = payload.response.account;
      
      // Create or update the user in Supabase
      const userToken = payload.application.issued_user_token || undefined;
      const user = await createOrUpdateUser(walletAddress, userToken);

      return { 
        success: true, 
        status: 'signed',
        user: {
          walletAddress,
          id: user.id
        }
      };
    }

    return { 
      success: false, 
      status: 'error',
      message: 'Unable to retrieve account information'
    };
  } catch (error) {
    console.error('Error verifying Xumm payload:', error);
    return { 
      success: false, 
      status: 'error',
      message: 'An error occurred while verifying authentication'
    };
  }
}

/**
 * Get current session status
 */
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const walletAddress = cookieStore.get('wallet_address')?.value;
    
    if (!walletAddress) {
      return { user: null };
    }
    
    // Get user information from Supabase
    const user = await getUserByWalletAddress(walletAddress);
    
    if (!user) {
      return { user: null };
    }
    
    return {
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        userToken: user.xumm_user_id,
      }
    };
  } catch (error) {
    console.error('Error retrieving session:', error);
    return { user: null };
  }
}

/**
 * Logout
 */
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('wallet_address');
  redirect('/');
} 