import { XummSdk } from 'xumm-sdk';

// Création du client Xumm côté serveur uniquement
let xummServerInstance: XummSdk | null = null;

export function getXummServer() {
  // Ne créer l'instance que côté serveur
  if (typeof window !== 'undefined') {
    console.warn('Xumm SDK should only be used on the server side');
    return null;
  }
  
  if (!xummServerInstance) {
    try {
      const apiKey = process.env.NEXT_PUBLIC_XUMM_API_KEY;
      const apiSecret = process.env.XUMM_API_SECRET;

      if (!apiKey || !apiSecret) {
        console.error('Xumm API credentials not configured');
        throw new Error('Xumm API credentials not configured');
      }

      console.log('Creating new XummSdk instance with:', { 
        apiKey,
        // Masquer la clé secrète dans les logs
        apiSecretLength: apiSecret.length
      });
      
      xummServerInstance = new XummSdk(apiKey, apiSecret);
      console.log('XummSdk instance created successfully');
    } catch (error) {
      console.error('Error creating XummSdk instance:', error);
      throw error;
    }
  }
  
  return xummServerInstance;
}

// Type pour le payload de signature Xumm
export interface XummSignPayload {
  uuid: string;
  next: {
    always: string;
  };
  refs: {
    qr_png: string;
    qr_matrix: string;
    qr_uri_quality_opts: string[];
    websocket_status: string;
  };
  pushed: boolean;
}

// Type pour un utilisateur authentifié
export interface XummAuthUser {
  walletAddress: string;
  userToken?: string;
}

// Type pour l'état d'authentification
export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: XummAuthUser | null;
} 