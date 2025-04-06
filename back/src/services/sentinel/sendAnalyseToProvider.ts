import axios from 'axios';
import { supabase } from '../../config/supabase';

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
  thumbnail?: { url: string };
}

interface ProviderConfig {
  discord?: {
    webhook_url: string;
  };
  telegram?: {
    bot_token: string;
    chat_id: string;
  };
  // d'autres providers peuvent être ajoutés ici à l'avenir
}

/**
 * Envoie les résultats d'analyse aux providers configurés pour l'utilisateur
 * @param txHash Le hash de la transaction analysée
 * @param userId L'identifiant de l'utilisateur
 */
export async function sendAnalyseToProvider(txHash: string, userId: string): Promise<{ success: boolean; error?: any }> {
  try {
    // 1. Récupérer la configuration du wallet Sentinel pour l'utilisateur
    const { data: sentinelConfig, error: configError } = await supabase
      .from('sentinelwallet')
      .select('provider, provider_config')
      .eq('user_id', userId)
      .eq('enabled', true)
      .single();

    if (configError) {
      throw new Error(`Erreur lors de la récupération de la configuration Sentinel: ${configError.message}`);
    }

    if (!sentinelConfig) {
      throw new Error('Configuration Sentinel non trouvée pour cet utilisateur');
    }

    // 2. Vérifier si un provider est configuré
    const provider = sentinelConfig.provider;
    if (!provider) {
      console.warn(`Aucun provider configuré pour l'utilisateur ${userId}`);
      return { success: false, error: 'Aucun provider configuré' };
    }

    console.log(`Provider configuré: ${provider}`);
    console.log('Configuration provider brute:', sentinelConfig.provider_config);
    
    // S'assurer que la configuration est bien au format JSON
    let providerConfig = sentinelConfig.provider_config;
    if (typeof providerConfig === 'string') {
      try {
        providerConfig = JSON.parse(providerConfig);
      } catch (e) {
        console.error('Erreur lors du parsing de la configuration:', e);
      }
    }
    console.log('Configuration provider traitée:', providerConfig);

    // 3. Récupérer l'analyse de la transaction depuis Supabase
    const { data: transactionAnalysis, error: analysisError } = await supabase
      .from('transactions_history')
      .select('*')
      .eq('tx_hash', txHash)
      .single();

    if (analysisError) {
      throw new Error(`Erreur lors de la récupération de l'analyse de transaction: ${analysisError.message}`);
    }

    if (!transactionAnalysis) {
      throw new Error(`Analyse de transaction non trouvée pour le hash ${txHash}`);
    }

    console.log('Analyse récupérée:', {
      tx_hash: transactionAnalysis.tx_hash,
      recommendation: transactionAnalysis.recommendation,
      confidence_score: transactionAnalysis.confidence_score
    });

    // 4. Nouvelle approche: gérer plusieurs providers séparés par des virgules
    // Diviser la chaîne de providers et traiter chacun séparément
    const providers = provider.toString().split(',').map((p: string) => p.toLowerCase().trim());
    console.log(`Providers détectés (${providers.length}):`, providers);
    
    // Variables pour suivre les résultats globaux
    let globalSuccess = true;
    const errors: Record<string, any> = {};
    
    // Parcourir tous les providers et envoyer la notification à chacun
    for (const currentProvider of providers) {
      console.log(`Traitement du provider: ${currentProvider}`);
      
      try {
        let result: { success: boolean; error?: any } = { success: false };
        
        // Envoyer au provider approprié
        switch (currentProvider) {
          case 'discord':
          case '"discord"':
            console.log('Provider Discord détecté, envoi de la notification...');
            result = await sendToDiscord(transactionAnalysis, providerConfig);
            break;
          case 'telegram':
          case '"telegram"':
            console.log('Provider Telegram détecté, envoi de la notification...');
            result = await sendToTelegram(transactionAnalysis, providerConfig);
            break;
          default:
            console.warn(`Provider ${currentProvider} non pris en charge`);
            result = { success: false, error: `Provider ${currentProvider} non pris en charge` };
        }
        
        // Mettre à jour le statut global
        if (!result.success) {
          globalSuccess = false;
          errors[currentProvider] = result.error;
        }
        
      } catch (providerError) {
        console.error(`Erreur lors de l'envoi à ${currentProvider}:`, providerError);
        globalSuccess = false;
        errors[currentProvider] = providerError;
      }
    }
    
    // Retourner le résultat global
    if (globalSuccess) {
      console.log(`Notifications envoyées avec succès à tous les providers (${providers.length})`);
      return { success: true };
    } else {
      console.warn(`Échec de l'envoi à certains providers:`, errors);
      return { success: false, error: errors };
    }

  } catch (error) {
    console.error('Erreur dans sendAnalyseToProvider:', error);
    return { success: false, error };
  }
}

/**
 * Envoie les résultats d'analyse à un webhook Discord
 */
async function sendToDiscord(
  analysis: any, 
  providerConfig: any
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Démarrage de l\'envoi à Discord...');
    
    // Vérifier la structure de providerConfig
    console.log('Type de providerConfig:', typeof providerConfig);
    console.log('Structure de providerConfig:', JSON.stringify(providerConfig, null, 2));
    
    // Vérifier si la configuration Discord est présente
    if (!providerConfig || !providerConfig.discord || !providerConfig.discord.webhook_url) {
      // Tenter de récupérer l'URL du webhook d'une autre manière si la structure attendue n'est pas trouvée
      let webhookUrl = null;
      
      if (typeof providerConfig === 'string') {
        try {
          const parsed = JSON.parse(providerConfig);
          if (parsed.discord && parsed.discord.webhook_url) {
            webhookUrl = parsed.discord.webhook_url;
          }
        } catch (e) {
          console.error('Impossible de parser providerConfig comme JSON:', e);
        }
      } else if (providerConfig.webhook_url) {
        // Cas où la structure est plate
        webhookUrl = providerConfig.webhook_url;
      }
      
      if (!webhookUrl) {
        console.error('Configuration Discord invalide:', JSON.stringify(providerConfig));
        throw new Error('URL du webhook Discord manquante');
      }
      
      console.log('URL webhook trouvée par méthode alternative:', webhookUrl);
    }

    // Récupérer l'URL du webhook, avec fallback sur les différentes structures possibles
    const webhookUrl = providerConfig.discord?.webhook_url || 
                       (typeof providerConfig === 'object' && providerConfig.webhook_url) ||
                       (typeof providerConfig === 'string' ? providerConfig : null);
    
    if (!webhookUrl) {
      console.error('Impossible de trouver l\'URL du webhook dans la configuration');
      throw new Error('URL du webhook Discord introuvable dans la configuration');
    }
    
    console.log(`Webhook URL: ${webhookUrl}`);
    
    // Déterminer la couleur en fonction de la recommandation
    let color = 0x3498db; // Bleu par défaut
    
    switch (analysis.recommendation) {
      case 'SIGN':
        color = 0x2ecc71; // Vert
        break;
      case 'REJECT':
        color = 0xe74c3c; // Rouge
        break;
      case 'REVIEW':
        color = 0xf39c12; // Orange
        break;
    }

    console.log('Préparation de l\'embed Discord...');
    
    // Formater les facteurs de risque
    let riskFactorsText = 'Aucun facteur de risque identifié';
    if (analysis.risk_factors && analysis.risk_factors.length > 0) {
      riskFactorsText = analysis.risk_factors.join('\n• ');
      riskFactorsText = '• ' + riskFactorsText;
    }

    // Récupérer l'URL frontend depuis les variables d'environnement
    const frontendUrl = process.env.PUBLIC_FRONT_URL || 'http://localhost:3000';
    const transactionUrl = `${frontendUrl}/tx/${analysis.tx_hash}`;

    // Créer l'embed Discord
    const embed: DiscordEmbed = {
      title: `Your transaction ${analysis.recommendation === 'SIGN' ? 'is signed by Sentinel AI ✅' : analysis.recommendation === 'REJECT' ? 'is rejected by Sentinel AI ❌' : 'is not signed by Sentinel AI, please review ⚠️'}`,
      color: color,
      fields: [
        {
          name: '**Transaction Hash**',
          value: `\`${analysis.tx_hash}\``,
          inline: false
        },
        {
          name: '**Recipient**',
          value: analysis.recipient_address || 'Not available',
          inline: true
        },
        {
          name: '**Amount**',
          value: `${analysis.amount || '0'} ${analysis.currency || 'XRP'}`,
          inline: true
        },
        {
          name: '**Confidence Score**',
          value: `${analysis.confidence_score ? Math.round(analysis.confidence_score) : 'N/A'}/100`,
          inline: true
        },
        {
          name: '\u200b',
          value: `[**Click for view full analysis on Sentinel Dashboard**](${transactionUrl})`,
          inline: false
        }
      ],
      timestamp: analysis.timestamp,
      footer: {
        text: 'Sentinel AI - Your intelligent assistant for secure and automated XRP'
      }
    };

    // Créer la payload du webhook
    const payload: DiscordWebhookPayload = {
      username: 'Sentinel AI',
      embeds: [embed]
    };

    console.log('Envoi de la requête à Discord...');
    
    // Envoyer à Discord
    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Réponse de Discord:', response.status, response.statusText);
      
      if (response.status >= 200 && response.status < 300) {
        console.info(`Notification Discord envoyée avec succès pour la transaction ${analysis.tx_hash}`);
        return { success: true };
      } else {
        console.error(`Erreur lors de l'envoi à Discord: ${response.statusText}`);
        return { success: false, error: response.statusText };
      }
    } catch (axiosError: any) {
      console.error('Erreur Axios lors de l\'envoi à Discord:', axiosError.message);
      if (axiosError.response) {
        console.error('Détails de l\'erreur:', {
          status: axiosError.response.status,
          data: axiosError.response.data
        });
      }
      return { success: false, error: axiosError.message };
    }

  } catch (error) {
    console.error('Erreur lors de l\'envoi à Discord:', error);
    return { success: false, error };
  }
}

/**
 * Envoie les résultats d'analyse à Telegram
 */
async function sendToTelegram(
  analysis: any, 
  providerConfig: any
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Démarrage de l\'envoi à Telegram...');
    
    // Vérifier la structure de providerConfig
    console.log('Type de providerConfig:', typeof providerConfig);
    console.log('Structure de providerConfig:', JSON.stringify(providerConfig, null, 2));
    
    // Vérifier si la configuration Telegram est présente
    if (!providerConfig || !providerConfig.telegram || !providerConfig.telegram.bot_token || !providerConfig.telegram.chat_id) {
      console.error('Configuration Telegram invalide:', JSON.stringify(providerConfig));
      throw new Error('Configuration Telegram manquante');
    }

    const botToken = providerConfig.telegram.bot_token;
    const chatId = providerConfig.telegram.chat_id;
    
    console.log(`Bot Token: ${botToken.substring(0, 5)}... Chat ID: ${chatId}`);
    
    // Récupérer l'URL frontend depuis les variables d'environnement
    const frontendUrl = process.env.PUBLIC_FRONT_URL || 'http://localhost:3000';
    const transactionUrl = `${frontendUrl}/tx/${analysis.tx_hash}`;
    
    // Préparer le message texte pour Telegram
    const emojiStatus = analysis.recommendation === 'SIGN' ? '✅' : analysis.recommendation === 'REJECT' ? '❌' : '⚠️';
    const message = `
*Your transaction is ${analysis.recommendation} by Sentinel AI ${emojiStatus}*

*Transaction Hash:* \`${analysis.tx_hash}\`

*Recipient:* ${analysis.recipient_address || 'Not available'}
*Amount:* ${analysis.amount || '0'} ${analysis.currency || 'XRP'}
*Confidence Score:* ${analysis.confidence_score ? Math.round(analysis.confidence_score) : 'N/A'}/100

[View full analysis on Sentinel Dashboard]
${transactionUrl}

_Sentinel AI - Your intelligent assistant for secure and automated XRP_
    `.trim();
    
    // L'URL de l'API Telegram pour envoyer des messages
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    // Préparer les données à envoyer
    const telegramData = {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    };
    
    console.log('Envoi de la requête à Telegram...');
    
    // Envoyer à Telegram
    try {
      const response = await axios.post(telegramUrl, telegramData);
      
      console.log('Réponse de Telegram:', response.status, response.statusText);
      
      if (response.status >= 200 && response.status < 300 && response.data.ok) {
        console.info(`Notification Telegram envoyée avec succès pour la transaction ${analysis.tx_hash}`);
        return { success: true };
      } else {
        console.error(`Erreur lors de l'envoi à Telegram:`, response.data);
        return { success: false, error: response.data };
      }
    } catch (axiosError: any) {
      console.error('Erreur Axios lors de l\'envoi à Telegram:', axiosError.message);
      if (axiosError.response) {
        console.error('Détails de l\'erreur:', {
          status: axiosError.response.status,
          data: axiosError.response.data
        });
      }
      return { success: false, error: axiosError.message };
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi à Telegram:', error);
    return { success: false, error };
  }
}
