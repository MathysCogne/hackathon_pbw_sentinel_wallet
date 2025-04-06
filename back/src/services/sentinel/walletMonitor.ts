import { Client } from 'xrpl';
import { supabase } from '../../config/supabase';
import { createXrplClient, disconnectXrplClient } from '../../config/xrpl';
import { elizaClient } from '../../config/eliza';
import { SentinelWallet, User, XrplTransaction } from '../../models/types';
import { XrplHelper } from '../../utils/xrplHelper';
import { sendAnalyseToProvider } from './sendAnalyseToProvider';

class WalletMonitor {
  private isInitialized = false;
  private client: Client | null = null;
  private activeWallets: Map<string, SentinelWallet & { user: User }> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 30000; // 30 secondes

  /**
   * Initialise le service de surveillance des wallets
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Créer un client XRPL pour les souscriptions
      this.client = await createXrplClient();
      
      // Vérifier les wallets activés
      await this.checkEnabledWallets();
      
      // Démarrer l'écoute des transactions
      await this.startListeningForTransactions();
      
      // Configurer l'intervalle de rafraîchissement des wallets et providers
      this.startRefreshInterval();
      
      this.isInitialized = true;
      console.log('Service Sentinel initialisé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service Sentinel:', error);
      throw error;
    }
  }

  /**
   * Démarre l'intervalle de rafraîchissement des wallets activés
   */
  private startRefreshInterval() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(async () => {
      console.log(`Rafraîchissement périodique des wallets et providers (toutes les ${this.REFRESH_INTERVAL_MS / 1000}s)`);
      try {
        // Récupérer les wallets précédemment surveillés
        const previousWallets = new Set(this.activeWallets.keys());
        
        // Mettre à jour la liste des wallets activés
        await this.checkEnabledWallets();
        
        // Récupérer les nouveaux wallets
        const currentWallets = new Set(this.activeWallets.keys());
        
        // Identifier les wallets ajoutés et supprimés
        const addedWallets = Array.from(currentWallets).filter(address => !previousWallets.has(address));
        const removedWallets = Array.from(previousWallets).filter(address => !currentWallets.has(address));
        
        // Si des changements sont détectés, mettre à jour les abonnements
        if (addedWallets.length > 0 || removedWallets.length > 0) {
          console.log(`Changements détectés: ${addedWallets.length} ajoutés, ${removedWallets.length} supprimés`);
          
          // Se désabonner des wallets supprimés
          if (removedWallets.length > 0 && this.client) {
            try {
              console.log(`Désabonnement de ${removedWallets.length} wallets`);
              await this.client.request({
                command: 'unsubscribe',
                accounts: removedWallets
              });
            } catch (unsubError) {
              console.error('Erreur lors du désabonnement des wallets:', unsubError);
            }
          }
          
          // S'abonner aux nouveaux wallets
          if (addedWallets.length > 0 && this.client) {
            try {
              console.log(`Abonnement à ${addedWallets.length} nouveaux wallets`);
              await this.client.request({
                command: 'subscribe',
                accounts: addedWallets
              });
            } catch (subError) {
              console.error('Erreur lors de l\'abonnement aux nouveaux wallets:', subError);
            }
          }
        } else {
          console.log('Aucun changement détecté dans les wallets surveillés');
        }
      } catch (error) {
        console.error('Erreur lors du rafraîchissement périodique des wallets:', error);
      }
    }, this.REFRESH_INTERVAL_MS);
    
    console.log(`Intervalle de rafraîchissement des wallets configuré (${this.REFRESH_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Vérifie les wallets activés dans la base de données
   */
  private async checkEnabledWallets() {
    try {
      // Récupérer tous les wallets activés
      const { data: sentinelConfigs, error } = await supabase
        .from('sentinelwallet')
        .select(`
          *,
          users (
            id,
            wallet_address,
            xumm_user_id
          )
        `)
        .eq('enabled', true);

      if (error) throw error;
      
      console.log(`Chargement de ${sentinelConfigs?.length || 0} wallets activés`);
      
      // Réinitialiser la liste des wallets actifs
      this.activeWallets.clear();
      
      // Vérifier chaque wallet activé
      for (const config of sentinelConfigs || []) {
        const user = config.users as unknown as User;
        if (!user?.wallet_address) continue;
        
        // Stocker le wallet dans la map des wallets actifs
        this.activeWallets.set(user.wallet_address, {
          ...config,
          user
        });
        
        console.log(`Wallet Sentinel activé pour: ${user.wallet_address}`);
      }

      console.log(`Vérification terminée - ${sentinelConfigs?.length || 0} wallets Sentinel activés`);
    } catch (error) {
      console.error('Erreur lors de la vérification des wallets activés:', error);
      throw error;
    }
  }

  /**
   * Démarre l'écoute des transactions pour tous les wallets activés
   */
  private async startListeningForTransactions() {
    if (!this.client) {
      console.error('Le client XRPL n\'est pas initialisé');
      return;
    }

    try {
      // Récupérer tous les addresses des wallets actifs
      const addresses = Array.from(this.activeWallets.keys());
      
      if (addresses.length === 0) {
        console.log('Aucun wallet actif à surveiller');
        return;
      }
      
      console.log(`Démarrage de l'écoute des transactions pour ${addresses.length} wallets`);
      
      // S'abonner aux transactions standard pour tous les wallets
      const response = await this.client.request({
        command: 'subscribe',
        accounts: addresses
      });
      
      console.log('Réponse de souscription:', JSON.stringify(response.result, null, 2));
      
      // Configurer les listeners pour les événements de transaction
      this.client.on('transaction', this.handleTransaction.bind(this));
      
      console.log('Surveillance des transactions active pour les wallets Sentinel');
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'écoute des transactions:', error);
      throw error;
    }
  }

  /**
   * Gère une transaction entrante
   */
  private async handleTransaction(tx: any) {
    try {
      console.log('Transaction reçue:', JSON.stringify(tx, null, 2));
      
      // Récupérer les données de transaction
      const transaction = tx.transaction || tx.tx_json || {};
      if (!transaction.TransactionType) {
        console.log('Type de transaction non reconnu');
        return;
      }
      
      // Récupérer les adresses avec gestion des undefined
      const senderAddress = transaction.Account || '';
      const walletAddress = transaction.Destination || '';
      
      // Vérifier si l'une des adresses est surveillée
      const sentinelConfig = this.activeWallets.get(walletAddress) || this.activeWallets.get(senderAddress);
      
      if (!sentinelConfig) {
        console.log(`Transaction détectée pour un wallet non surveillé: ${walletAddress || senderAddress}`);
        return;
      }
      
      console.log(`Transaction détectée pour le wallet surveillé: ${sentinelConfig.user.wallet_address}`);
      console.log(`De: ${senderAddress}, Vers: ${walletAddress || 'N/A'}, Type: ${transaction.TransactionType}`);
      
      // Extraire les métadonnées importantes de la transaction
      const transactionData: XrplTransaction = {
        hash: tx.hash || transaction.hash || '',
        TransactionType: transaction.TransactionType,
        Account: transaction.Account,
        Fee: transaction.Fee,
        Sequence: transaction.Sequence
      };
      
      // Ajouter les champs optionnels
      if (transaction.Destination) {
        transactionData.Destination = transaction.Destination;
      }
      
      if (transaction.Amount) {
        transactionData.Amount = transaction.Amount;
      }
      
      if (transaction.SigningPubKey) {
        transactionData.SigningPubKey = transaction.SigningPubKey;
      }
      
      if (transaction.date) {
        transactionData.date = transaction.date;
      }
      
      // Ajouter les métadonnées si disponibles
      if (tx.meta) {
        transactionData.meta = tx.meta;
      }
      
      // Extraire les données spécifiques selon le type de transaction
      this.extractSpecificTransactionData(transaction, transactionData);
      
      // Envoyer les données à Eliza pour analyse
      await this.sendTransactionToEliza(transactionData, sentinelConfig.user.id);
      
    } catch (error) {
      console.error('Erreur lors du traitement de la transaction:', error);
      console.error('Contenu de la transaction:', JSON.stringify(tx || {}, null, 2));
    }
  }

  /**
   * Extrait les données spécifiques selon le type de transaction
   */
  private extractSpecificTransactionData(transaction: any, transactionData: XrplTransaction) {
    // Extraire les données d'escrow
    if (transaction.TransactionType === 'EscrowCreate' || transaction.TransactionType === 'EscrowFinish') {
      transactionData.EscrowData = {};
      
      if (transaction.Condition) {
        transactionData.EscrowData.Condition = transaction.Condition;
      }
      
      if (transaction.CancelAfter) {
        transactionData.EscrowData.CancelAfter = transaction.CancelAfter;
      }
      
      if (transaction.FinishAfter) {
        transactionData.EscrowData.FinishAfter = transaction.FinishAfter;
      }
    }
    
    // Extraire les mémos si disponibles
    if (transaction.Memos) {
      transactionData.Memos = transaction.Memos;
    }
    
    // Extraire les données spécifiques aux paiements
    if (transaction.TransactionType === 'Payment') {
      if (transaction.SendMax) {
        transactionData.SendMax = transaction.SendMax;
      }
      if (transaction.DeliverMin) {
        transactionData.DeliverMin = transaction.DeliverMin;
      }
    }
  }

  /**
   * Envoie les données de transaction à Eliza pour analyse
   */
  private async sendTransactionToEliza(transaction: XrplTransaction, userId: string) {
    try {
      console.log(`Envoi des données de transaction à Eliza pour l'utilisateur ${userId}`);
      
      // Utiliser le client Eliza pour analyser la transaction
      const analysis = await elizaClient.analyzeTransaction(transaction.hash);
      
      // Afficher les résultats de l'analyse dans la console
      console.log(`----- Analyse de la transaction par Eliza -----`);
      console.log(`${analysis[0].text}`);
      console.log(`${analysis[1].text}`);
      console.log(`----- Fin de l'analyse -----`);
      
      // Envoyer les résultats au provider configuré
      try {
        console.log(`Envoi des résultats d'analyse au provider pour l'utilisateur ${userId}, transaction ${transaction.hash}`);
        
        const result = await sendAnalyseToProvider(transaction.hash, userId);
        
        if (result.success) {
          console.log(`Notification envoyée avec succès pour la transaction ${transaction.hash}`);
        } else {
          console.warn(`Échec de l'envoi de la notification: ${JSON.stringify(result.error)}`);
        }
      } catch (notificationError) {
        console.error('Erreur lors de l\'envoi de la notification:', notificationError);
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi des données à Eliza:', error);
    }
  }

  /**
   * Arrête le service de surveillance
   */
  async stopService() {
    try {
      // Arrêter l'intervalle de rafraîchissement
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
        console.log('Intervalle de rafraîchissement arrêté');
      }
      
      if (this.client) {
        // Désabonner de tous les comptes
        const addresses = Array.from(this.activeWallets.keys());
        if (addresses.length > 0) {
          await this.client.request({
            command: 'unsubscribe',
            accounts: addresses
          });
        }
        
        // Déconnecter le client
        await disconnectXrplClient(this.client);
        this.client = null;
      }
      
      this.isInitialized = false;
      console.log('Service Sentinel arrêté');
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du service Sentinel:', error);
    }
  }
}

export const walletMonitor = new WalletMonitor(); 