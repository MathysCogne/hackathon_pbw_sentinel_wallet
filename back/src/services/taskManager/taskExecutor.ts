import { Task } from '../../models/types';
import { createXrplClient, disconnectXrplClient } from '../../config/xrpl';
import { supabase } from '../../config/supabase';
import { xummPayloadService } from '../xummService/xummPayloadService';

interface TaskResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

// Alias pour la cohérence
type TaskExecutionResult = TaskResult;

class TaskExecutor {
  /**
   * Exécute une tâche en fonction de son action
   * @param task La tâche à exécuter
   * @returns Résultat de l'exécution
   */
  async executeTask(task: Task): Promise<TaskExecutionResult> {
    try {
      console.log(`Exécution de la tâche ${task.name} (Action: ${task.action})`);
      
      // Récupérer les informations de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', task.user_id)
        .single();
      
      if (userError || !userData) {
        throw new Error(`User data not found: ${userError?.message || 'Unknown error'}`);
      }

      // Vérifier que l'utilisateur dispose d'un identifiant XUMM
      if (!userData.xumm_user_id) {
        throw new Error('User does not have a XUMM user ID');
      }
      
      // Récupérer la méthode correspondant à l'action
      const actionMethod = this.getActionMethod(task.action);
      
      if (!actionMethod) {
        return {
          success: false,
          error: `Action non supportée: ${task.action}`
        };
      }
      
      // Exécuter la méthode appropriée avec les paramètres de la tâche
      const result = await actionMethod.call(this, task, userData);
      
      // Mettre à jour la dernière exécution de la tâche
      await this.updateTaskExecution(task.id);
      
      return result;
    } catch (error: any) {
      console.error(`Erreur lors de l'exécution de la tâche ${task.id}:`, error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère la méthode d'exécution correspondant à l'action
   */
  private getActionMethod(action: string): ((task: Task, userData: any) => Promise<TaskResult>) | null {
    switch (action) {
      case 'payment':
        return this.executePayment;
      case 'trustline':
        return this.executeTrustline;
      case 'escrow':
        return this.executeEscrow;
      case 'nftmint':
        return this.executeNftMint;
      default:
        return null;
    }
  }

  /**
   * Met à jour la dernière exécution d'une tâche
   */
  private async updateTaskExecution(taskId: string): Promise<void> {
    try {
      await supabase
        .from('tasks')
        .update({
          last_execution: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
    } catch (error) {
      console.error(`Error updating task execution:`, error);
    }
  }

  private async executePayment(task: Task, userData: any): Promise<TaskResult> {
    try {
      const { destination, amount, memo } = task.task_config;
      
      if (!destination || !amount) {
        throw new Error('Destination and amount are required for payment task');
      }
      
      // Créer la transaction de paiement
      const payment = {
        TransactionType: 'Payment',
        Account: userData.wallet_address,
        Destination: destination,
        Amount: this.formatAmount(amount),
      };
      
      if (memo) {
        // @ts-ignore
        payment.Memos = [{
          Memo: {
            MemoData: Buffer.from(memo, 'utf8').toString('hex')
          }
        }];
      }
      
      // Envoyer la transaction à l'utilisateur via Xumm
      const result = await xummPayloadService.createPayload(payment, userData.xumm_user_id);
      
      return {
        success: true,
        data: {
          xumm_payload: result,
          payment: payment
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Payment execution failed: ${error.message}`
      };
    }
  }

  private async executeTrustline(task: Task, userData: any): Promise<TaskResult> {
    try {
      const { currency, issuer, limit } = task.task_config;
      
      if (!currency || !issuer) {
        throw new Error('Currency and issuer are required for trustline task');
      }
      
      // Créer la transaction de trustline
      const trustSet = {
        TransactionType: 'TrustSet',
        Account: userData.wallet_address,
        LimitAmount: {
          currency,
          issuer,
          value: limit || '0'
        }
      };
      
      // Envoyer la transaction à l'utilisateur via Xumm
      const result = await xummPayloadService.createPayload(trustSet, userData.xumm_user_id);
      
      return {
        success: true,
        data: {
          xumm_payload: result,
          trustSet: trustSet
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Trustline execution failed: ${error.message}`
      };
    }
  }

  private async executeEscrow(task: Task, userData: any): Promise<TaskResult> {
    try {
      const { destination, amount, finish_after, condition } = task.task_config;
      
      if (!destination || !amount) {
        throw new Error('Destination and amount are required for escrow task');
      }
      
      // Créer la transaction d'escrow
      const escrowCreate = {
        TransactionType: 'EscrowCreate',
        Account: userData.wallet_address,
        Destination: destination,
        Amount: this.formatAmount(amount),
        FinishAfter: finish_after
      };
      
      if (condition) {
        // @ts-ignore
        escrowCreate.Condition = condition;
      }
      
      // Envoyer la transaction à l'utilisateur via Xumm
      const result = await xummPayloadService.createPayload(escrowCreate, userData.xumm_user_id);
      
      return {
        success: true,
        data: {
          xumm_payload: result,
          escrowCreate: escrowCreate
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Escrow execution failed: ${error.message}`
      };
    }
  }

  private async executeNftMint(task: Task, userData: any): Promise<TaskResult> {
    try {
      const { uri, transferable, flags } = task.task_config;
      
      if (!uri) {
        throw new Error('URI is required for NFT minting task');
      }
      
      // Convertir l'URI en hexadécimal
      const uriHex = Buffer.from(uri, 'utf8').toString('hex');
      
      // Créer la transaction de NFToken Mint
      const nftMint = {
        TransactionType: 'NFTokenMint',
        Account: userData.wallet_address,
        URI: uriHex,
        Flags: flags || 0,
        TransferFee: transferable ? 0 : 10000 // 100% non-transférable par défaut
      };
      
      // Envoyer la transaction à l'utilisateur via Xumm
      const result = await xummPayloadService.createPayload(nftMint, userData.xumm_user_id);
      
      return {
        success: true,
        data: {
          xumm_payload: result,
          nftMint: nftMint
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `NFT mint execution failed: ${error.message}`
      };
    }
  }

  private formatAmount(amount: string | number | object): string | object {
    if (typeof amount === 'object') {
      // Déjà un objet de montant (pour les tokens)
      return amount;
    }
    
    // Convertir en string si ce n'est pas déjà le cas
    const amountStr = amount.toString();
    
    // Vérifier si c'est un montant en XRP (sans lettre)
    if (/^\d+(\.\d+)?$/.test(amountStr)) {
      // Convertir en gouttes (1 XRP = 1,000,000 gouttes)
      const drops = Math.floor(parseFloat(amountStr) * 1000000).toString();
      return drops;
    }
    
    // Sinon, retourner tel quel
    return amountStr;
  }
}

export const taskExecutor = new TaskExecutor(); 