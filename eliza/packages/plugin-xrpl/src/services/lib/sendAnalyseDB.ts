import { createClient } from '@supabase/supabase-js';
import { elizaLogger } from "@elizaos/core";

// Interface pour les données d'analyse à envoyer
interface TransactionAnalysisRecord {
  tx_hash: string;
  recommendation: "SIGN" | "REJECT" | "REVIEW";
  ai_response: string;
  sender_address?: string;
  recipient_address?: string;
  amount?: string;
  currency?: string;
  confidence_score?: number;
  risk_factors?: string[];
  timestamp: string;
}

/**
 * Service pour envoyer une analyse de transaction à la base de données Supabase
 * @param txHash Le hash de la transaction
 * @param recommendation La recommandation (SIGN, REJECT, REVIEW)
 * @param aiResponse La réponse générée par l'IA
 * @param details Détails supplémentaires de l'analyse
 * @returns Un objet contenant le statut de l'opération
 */
export async function sendAnalyseDB(
  txHash: string,
  recommendation: "SIGN" | "REJECT" | "REVIEW",
  aiResponse: string,
  details?: {
    senderAddress?: string;
    recipientAddress?: string;
    amount?: string;
    currency?: string;
    confidenceScore?: number;
    riskFactors?: string[];
  }
): Promise<{ success: boolean; error?: any }> {
  try {
    // Récupérer les variables d'environnement pour Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Les informations de connexion à Supabase sont manquantes");
    }

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Préparer les données à enregistrer
    const record: TransactionAnalysisRecord = {
      tx_hash: txHash,
      recommendation,
      ai_response: aiResponse,
      sender_address: details?.senderAddress,
      recipient_address: details?.recipientAddress,
      amount: details?.amount,
      currency: details?.currency,
      confidence_score: details?.confidenceScore,
      risk_factors: details?.riskFactors,
      timestamp: new Date().toISOString()
    };

    // Envoyer les données à Supabase
    const { data, error } = await supabase
      .from('transactions_history')
      .insert(record);

    if (error) {
      elizaLogger.error(`Erreur lors de l'enregistrement de l'analyse dans Supabase:`, error);
      return { success: false, error };
    }

    elizaLogger.info(`Analyse de transaction ${txHash} enregistrée avec succès dans Supabase`);
    return { success: true };

  } catch (error) {
    elizaLogger.error(`Erreur dans le service sendAnalyseDB:`, error);
    return { success: false, error };
  }
}
