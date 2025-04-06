import { xummSdk } from '../../config/xumm';
import { createXrplClient, disconnectXrplClient } from '../../config/xrpl';
import { XummPayload } from '../../models/types';

class XummPayloadService {
  /**
   * Initialise le service XUMM
   */
  async initialize() {
    console.log('XummPayloadService initialized');
  }

  /**
   * Crée un payload XUMM pour une transaction et l'envoie à l'utilisateur
   * @param transaction Transaction XRPL à signer
   * @param xummUserId Identifiant XUMM de l'utilisateur
   * @returns Les détails du payload créé
   */
  async createPayload(transaction: any, xummUserId: string) {
    try {
      // Préparer la transaction en récupérant les détails nécessaires du ledger
      const client = await createXrplClient();
      
      try {
        console.log('Preparing transaction:', transaction);
        const prepared = await client.autofill(transaction);
        
        // Créer la payload Xumm pour signature
        const payload = await xummSdk.payload.create({
          txjson: prepared,
          user_token: xummUserId
        });
        
        if (!payload) {
          throw new Error('Failed to create Xumm payload');
        }
        
        console.log(`Created Xumm payload: ${payload.uuid}`);
        return payload;
      } finally {
        await disconnectXrplClient(client);
      }
    } catch (error) {
      console.error('Error creating Xumm payload:', error);
      throw error;
    }
  }

  /**
   * Récupère le statut d'un payload XUMM
   * @param payloadId UUID du payload
   * @returns Le statut du payload et les détails
   */
  async getPayloadStatus(payloadId: string) {
    try {
      const payload = await xummSdk.payload.get(payloadId);
      
      if (payload && payload.meta) {
        // Déterminer le statut du payload
        let status: XummPayload['status'] = 'created';
        
        if (payload.meta.expired) {
          status = 'expired';
        } else if (payload.meta.signed) {
          status = 'signed';
        } else if (payload.meta.cancelled) {
          status = 'rejected';
        }
        
        console.log(`Payload ${payloadId} status: ${status}`);
        return { status, payload };
      }
      
      throw new Error('Payload not found or invalid response');
    } catch (error) {
      console.error('Error getting payload status:', error);
      throw error;
    }
  }

  /**
   * Arrête le service
   */
  stopService() {
    console.log('XummPayloadService stopped');
  }
}

export const xummPayloadService = new XummPayloadService(); 