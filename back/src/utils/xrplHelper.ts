import { Client, Wallet, Transaction } from 'xrpl';

/**
 * Helper pour gérer les opérations avec XRPL.js de manière compatible avec toutes les versions
 */
export class XrplHelper {
  /**
   * Crée une structure de multisignature pour un wallet
   */
  static createMultisigSetup(walletAddress: string, aiWalletAddress: string): any {
    console.log(`Création de multisig entre ${walletAddress} (utilisateur) et ${aiWalletAddress} (IA)`);
    
    // Format exact pour la transaction
    return {
      Flags: 0,
      TransactionType: "SignerListSet",
      Account: walletAddress,
      Fee: "12",
      // Définir le quorum à 2 pour exiger la signature du compte principal ET de l'IA
      SignerQuorum: 2,
      SignerEntries: [
        {
          SignerEntry: {
            Account: aiWalletAddress,
            // Donner un poids de 2 à l'IA pour qu'elle puisse signer seule si nécessaire
            SignerWeight: 2
          }
        }
      ]
    };
  }

  /**
   * Crée un wallet à partir d'une clé secrète
   */
  static createWallet(client: Client, secret: string): Wallet {
    try {
      // Essayer d'abord avec la méthode wallet()
      // @ts-ignore - Pour supporter différentes versions de l'API
      if (typeof client.wallet === 'function') {
        // @ts-ignore
        return client.wallet(secret);
      }
    } catch (e) {
      // Silencieux
    }

    // Fallback - créer un wallet manuellement
    return Wallet.fromSecret(secret);
  }

  /**
   * Signe une transaction multisignature avec une clé privée
   * @param client Client XRPL
   * @param transactionBlob Transaction sérialisée en blob ou en JSON
   * @param seed Clé privée (seed) pour signer la transaction
   * @returns Transaction signée
   */
  static async signMultisigTransaction(client: any, transactionBlob: string, seed: string): Promise<any> {
    try {
      // Déterminer si l'entrée est un blob ou un objet JSON
      let transaction;
      try {
        // Essayer de parser comme JSON d'abord
        transaction = typeof transactionBlob === 'string' ? JSON.parse(transactionBlob) : transactionBlob;
      } catch (e) {
        // Si ce n'est pas un JSON valide, considérer comme un blob
        transaction = client.decode(transactionBlob);
      }

      // Vérifier que la transaction est valide
      if (!transaction || !transaction.TransactionType) {
        throw new Error('Invalid transaction format');
      }

      // Signer la transaction avec la clé fournie
      const wallet = Wallet.fromSeed(seed);
      const signed = await client.sign(transaction, {
        wallet,
        multisign: true
      });

      return signed.tx_blob;
    } catch (error: any) {
      console.error('Error signing multisig transaction:', error);
      throw new Error(`Failed to sign multisig transaction: ${error.message}`);
    }
  }

  /**
   * Soumet une transaction signée au ledger
   */
  static async submitTransaction(client: Client, signedTx: any) {
    try {
      // Pour les deux formats possibles (tx_blob ou prepared)
      const txBlob = signedTx.tx_blob || signedTx.signedTransaction;
      return await client.submit(txBlob);
    } catch (error) {
      console.error('Erreur lors de la soumission de la transaction:', error);
      throw error;
    }
  }
} 