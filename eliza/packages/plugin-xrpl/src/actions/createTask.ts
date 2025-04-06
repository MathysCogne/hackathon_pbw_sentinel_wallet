import {
	elizaLogger,
	Action,
	ActionExample,
	HandlerCallback,
	IAgentRuntime,
	Memory,
	State,
	ModelClass,
	generateText,
	composeContext,
	stringToUuid
} from "@elizaos/core";
import { createTaskService } from "../services/createTaskService";
import { createTaskExamples } from "../examples/createTaskExamples";
import { formatTaskTemplate } from "../templates/createTaskTemplate";
import { walletService } from "../services/lib/walletService";
import * as crypto from 'crypto';

// Fonction pour générer une condition cryptographique pour un escrow
async function generateCryptoCondition(preimageText?: string): Promise<{ condition: string, fulfillment: string }> {
	// Si aucun préimage n'est fourni, générer un secret aléatoire de 32 octets
	const preimage = preimageText 
		? Buffer.from(preimageText, 'utf8')
		: crypto.randomBytes(32);
	
	// Hacher le préimage avec SHA-256 pour obtenir le digest
	const fulfillment = preimage.toString('hex');
	const digest = crypto.createHash('sha256').update(preimage).digest();
	
	// Créer la condition (format XRPL: A0258020[32-byte-hash-in-hex]810120)
	const condition = 'A0258020' + digest.toString('hex') + '810120';
	
	return { condition, fulfillment };
}

export const createTask: Action = {
	name: "CREATE_TASK",
	similes: [
		"SCHEDULE_TASK",
		"SCHEDULE_TRANSACTION",
		"RECURRING_PAYMENT",
		"AUTO_PAYMENT",
		"SCHEDULE_TRANSFER",
		"SET_RECURRING",
		"AUTOMATE_PAYMENT",
		"MINT_NFT",
		"CREATE_ESCROW"
	],
	description: "Creates a scheduled or recurring task for automated XRP transactions, NFT minting, or escrow creation",
	suppressInitialMessage: true,
	validate: async (runtime: IAgentRuntime, message: Memory) => {
		// Vérifier si le message contient des informations de tâche valides
		const text = message.content.text || '';
		
		// Rechercher spécifiquement la mention "create task"
		const createTaskMatch = text.match(/create\s+task/i);
		if (!createTaskMatch) {
			console.log("No 'create task' phrase found in message");
			return false;
		}
		
		// Valider selon le type d'action
		const paymentMatch = text.match(/pay|send|transfer|xrp/i);
		const escrowMatch = text.match(/escrow|lock|hold/i);
		const nftMatch = text.match(/nft|mint|token/i);
		
		if (!paymentMatch && !escrowMatch && !nftMatch) {
			console.log("No valid action type detected");
			return false;
		}
		
		// Vérifier qu'il y a au moins une adresse XRP 
		const addressMatches = text.match(/r[A-Za-z0-9]{24,34}/ig);
		if (!addressMatches) {
			console.log("No XRP address found");
			return false;
		}

		console.log("Task creation request validated");
		return true;
	},
	
	handler: async (
		runtime: IAgentRuntime, 
		message: Memory,
		state: State, 
		_options: { [key: string]: unknown },
		callback: HandlerCallback
	) => {
		try {
			// Extraire le texte du message
			const text = message.content.text || '';
			
			// Déterminer le type d'action
			let actionType = 'payment'; // Par défaut
			const escrowMatch = text.match(/escrow|lock|hold/i);
			const nftMatch = text.match(/nft|mint|token/i);
			
			if (escrowMatch) actionType = 'escrow';
			else if (nftMatch) actionType = 'nft_mint';
			
			// Extraire les adresses
			const addressMatches = text.match(/r[A-Za-z0-9]{24,34}/ig);
			if (!addressMatches) {
				return false;
			}
			
			// Obtenir l'adresse du portefeuille actuel
			const wallet = walletService.getWallet();
			
			let senderAddress: string;
			let recipientAddress: string | null = null;
			
			if (addressMatches.length === 1) {
				// Si une seule adresse est fournie, c'est le destinataire pour payment/escrow
				// ou l'adresse de l'utilisateur pour nft_mint
				senderAddress = wallet.address;
				if (actionType !== 'nft_mint') {
					recipientAddress = addressMatches[0];
				}
			} else {
				// Si deux adresses sont fournies, la première est l'expéditeur, la seconde le destinataire
				senderAddress = addressMatches[0];
				recipientAddress = addressMatches[1];
			}
			
			// Extraire le montant (pour payment et escrow)
			let amount = 0;
			if (actionType !== 'nft_mint') {
				const amountMatch = text.match(/(\d+(\.\d+)?)\s*(XRP|xrp)/i);
				if (amountMatch) {
					amount = parseFloat(amountMatch[1]);
				} else {
					// Pour un paiement sans montant, c'est invalide
					if (actionType === 'payment') {
						throw new Error("Montant XRP requis pour un paiement");
					}
					// Pour un escrow, on peut définir une valeur par défaut
					amount = 10; // 10 XRP par défaut pour un escrow
				}
			}
			
			// Extraire l'indication si la tâche est unique
			const onceMatch = text.match(/once|one\s+time|single\s+time|only\s+once/i);
			
			// Extraire les informations de récurrence
			const dailyMatch = text.match(/every\s+day|daily|each\s+day/i);
			const weeklyMatch = text.match(/every\s+week|weekly|each\s+week/i);
			const monthlyMatch = text.match(/every\s+month|monthly|each\s+month/i);
			const minutesMatch = text.match(/every\s+minute|minutely|each\s+minute|every\s+(\d+)\s+minutes?/i);
			const daysMatch = text.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/ig);
			
			// Extraire la date de début potentielle
			const dateMatch = text.match(/on\s+(\d{1,2}[\/\.-]\d{1,2}([\/\.-]\d{2,4})?)/i);
			const tomorrowMatch = text.match(/tomorrow/i);
			
			// Déterminer le type de récurrence
			let recurrenceType = 'once';
			let recurrenceInterval = 1;
			let recurrenceDays: number[] = [];
			let startDate = new Date();
			
			// Si explicitement demandé comme tâche unique, forcer le type "once"
			if (onceMatch) {
				recurrenceType = 'once';
			} 
			// Sinon, déterminer le type de récurrence selon le message
			else if (minutesMatch) {
				recurrenceType = 'minutely';
				// Vérifier si un intervalle spécifique est mentionné (ex: "every 5 minutes")
				if (minutesMatch[1]) {
					recurrenceInterval = parseInt(minutesMatch[1]);
					if (recurrenceInterval < 1) recurrenceInterval = 1;
				}
			} else if (dailyMatch) {
				recurrenceType = 'daily';
			} else if (weeklyMatch) {
				recurrenceType = 'weekly';
				
				// Convertir les jours en entiers (0 = dimanche, 1 = lundi, etc.)
				if (daysMatch) {
					const dayMap: { [key: string]: number } = {
						'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
						'thursday': 4, 'friday': 5, 'saturday': 6
					};
					
					recurrenceDays = daysMatch.map(day => dayMap[day.toLowerCase()]).filter(day => day !== undefined);
				}
			} else if (monthlyMatch) {
				recurrenceType = 'monthly';
			}
			
			// Déterminer la date de début
			if (dateMatch) {
				const dateParts = dateMatch[1].split(/[\/\.-]/);
				const day = parseInt(dateParts[0]);
				const month = parseInt(dateParts[1]) - 1; // Les mois JS commencent à 0
				const year = dateParts[2] ? parseInt(dateParts[2]) : new Date().getFullYear();
				
				startDate = new Date(year, month, day);
			} else if (tomorrowMatch) {
				startDate = new Date();
				startDate.setDate(startDate.getDate() + 1);
			}
			
			// S'assurer que la date est dans le futur
			if (startDate.getTime() < Date.now()) {
				if (recurrenceType === 'once') {
					// Pour une tâche ponctuelle, ajouter un jour
					startDate.setDate(startDate.getDate() + 1);
				}
			}
			
			// Vérifier s'il y a une indication d'intervalle (ex: "every 2 days")
			const intervalMatch = text.match(/every\s+(\d+)\s+(day|week|month|minute)/i);
			if (intervalMatch) {
				recurrenceInterval = parseInt(intervalMatch[1]);
				if (recurrenceInterval < 1) recurrenceInterval = 1;
			}
			
			// Préparer la configuration de la tâche selon le type d'action
			let taskConfig: Record<string, any> = {};
			
			switch (actionType) {
				case 'payment':
					taskConfig = {
						destination: recipientAddress,
						amount: amount,
						senderAddress, // Pour référence
						currency: 'XRP',
						memo: `Payment task created by Sentinel IA on ${new Date().toISOString()}`
					};
					break;
				
				case 'escrow':
					// Déterminer la condition d'achèvement (finish_after)
					let finishAfter = Math.floor(startDate.getTime() / 1000) + 86400; // Par défaut: 24h après
					
					// Chercher une durée dans le texte (ex: "for 3 days")
					const durationMatch = text.match(/for\s+(\d+)\s+(day|week|month|hour|minute)/i);
					if (durationMatch) {
						const durationValue = parseInt(durationMatch[1]);
						const durationType = durationMatch[2].toLowerCase();
						
						const now = Math.floor(Date.now() / 1000);
						
						switch (durationType) {
							case 'minute':
								finishAfter = now + (durationValue * 60);
								break;
							case 'hour':
								finishAfter = now + (durationValue * 3600);
								break;
							case 'day':
								finishAfter = now + (durationValue * 86400);
								break;
							case 'week':
								finishAfter = now + (durationValue * 604800);
								break;
							case 'month':
								finishAfter = now + (durationValue * 2592000); // ~30 jours
								break;
						}
					}
					
					// Détecter si une condition cryptographique est demandée
					const cryptoConditionMatch = text.match(/with\s+crypto(\s+condition)?|with\s+password|with\s+secret|with\s+fulfillment/i);
					const secretPhraseMatch = text.match(/secret(?:\s+phrase)?[:\s]+["']([^"']+)["']/i) || 
											text.match(/password[:\s]+["']([^"']+)["']/i);
					
					// Générer une condition cryptographique si demandée ou explicitement mentionnée
					let cryptoCondition = null;
					let cryptoFulfillment = null;
					
					if (cryptoConditionMatch || secretPhraseMatch) {
						const preimageText = secretPhraseMatch ? secretPhraseMatch[1] : undefined;
						const { condition, fulfillment } = await generateCryptoCondition(preimageText);
						cryptoCondition = condition;
						cryptoFulfillment = fulfillment;
					}
					
					taskConfig = {
						destination: recipientAddress,
						amount: amount,
						finish_after: finishAfter,
						condition: cryptoCondition,
						fulfillment: cryptoFulfillment, // Stocké pour référence, mais pas envoyé dans la transaction
						memo: `Escrow task created by Sentinel IA on ${new Date().toISOString()}`
					};
					break;
				
				case 'nft_mint':
					// Extraire l'URI pour le NFT
					let uri = "";
					const uriMatch = text.match(/uri[:\s]+["']?([^"']+)["']?/i) || 
												 text.match(/url[:\s]+["']?([^"']+)["']?/i);
					
					if (uriMatch) {
						uri = uriMatch[1];
					} else {
						// Utiliser une valeur par défaut s'il n'y a pas d'URI
						uri = "https://xrpl.org/nft";
					}
					
					// Déterminer si le NFT est transférable
					const transferable = !text.match(/non[- ]transferable|not transferable/i);
					
					taskConfig = {
						uri: uri,
						transferable: transferable,
						flags: 0, // Drapeaux par défaut
						memo: `NFT mint task created by Sentinel IA on ${new Date().toISOString()}`
					};
					break;
			}
			
			// Message de log selon le type d'action
			let logMessage = "";
			switch (actionType) {
				case 'payment':
					logMessage = `Création d'une tâche pour envoyer ${amount} XRP de ${senderAddress} à ${recipientAddress}`;
					break;
				case 'escrow':
					logMessage = `Création d'une tâche pour créer un escrow de ${amount} XRP vers ${recipientAddress}`;
					break;
				case 'nft_mint':
					logMessage = `Création d'une tâche pour minter un NFT avec URI: ${taskConfig.uri}`;
					break;
			}
			
			console.log(logMessage);
			console.log(`Type de récurrence: ${recurrenceType}, Intervalle: ${recurrenceInterval}, Date de début: ${startDate.toISOString()}`);
			
			// Créer la tâche dans la base de données
			const taskResult = await createTaskService(
				`715f033d-ca98-4b90-9d3c-d9c82ec5a1b7`,
				getTaskName(actionType, amount, recipientAddress, taskConfig),
				actionType,
				getTaskDescription(actionType, amount, recipientAddress, taskConfig),
				recurrenceType,
				recurrenceInterval,
				recurrenceDays,
				startDate,
				taskConfig
			);
			
			// Mettre à jour l'état avec les détails de la tâche
			state.taskId = taskResult.taskId;
			state.taskName = taskResult.taskName;
			state.actionType = actionType;
			state.recurrenceType = recurrenceType;
			state.recurrenceInterval = recurrenceInterval;
			state.startDate = startDate.toISOString();
			state.senderAddress = senderAddress;
			state.recipientAddress = recipientAddress || '';
			state.amount = amount;
			state.currency = 'XRP';
			state.recurrenceDays = recurrenceDays.length > 0 ? recurrenceDays.join(', ') : '';
			state.isOnce = recurrenceType === 'once' ? 'yes' : 'no';
			
			// Ajouter des détails spécifiques selon le type d'action
			if (actionType === 'nft_mint') {
				state.uri = taskConfig.uri;
				state.transferable = taskConfig.transferable ? 'yes' : 'no';
			} else if (actionType === 'escrow') {
				state.finishAfter = new Date(taskConfig.finish_after * 1000).toISOString();
				if (taskConfig.condition) {
					state.hasCryptoCondition = 'yes';
					state.cryptoFulfillment = taskConfig.fulfillment || '';
				} else {
					state.hasCryptoCondition = 'no';
				}
			}
			
			// Générer une réponse avec le contexte approprié
			const context = composeContext({
				state,
				template: formatTaskTemplate
			});
			
			// Générer le texte de la réponse
			const formattedResponse = await generateText({
				runtime,
				context,
				modelClass: ModelClass.SMALL
			});
			
			// Créer une mémoire de cette action
			await runtime.messageManager.createMemory({
				id: stringToUuid(Date.now().toString()),
				content: { text: formattedResponse },
				userId: runtime.agentId,
				roomId: message.roomId,
				agentId: runtime.agentId
			});
			
			// Envoyer le message généré
			if (callback) {
				callback({
					text: formattedResponse,
					inReplyTo: message.id
				});
			}
			
			return true;
			
		} catch (error: any) {
			elizaLogger.error("Erreur dans le gestionnaire CREATE_TASK:", error);
			if (callback) {
				const errorMessage = error.message || "Une erreur s'est produite lors de la création de la tâche.";
				callback({
					text: `❌ Échec de la création de la tâche: ${errorMessage}`,
					inReplyTo: message.id
				});
			}
			return false;
		}
	},
	examples: createTaskExamples as ActionExample[][],
} as Action;

/**
 * Génère un nom pour la tâche en fonction de son type et de ses paramètres
 */
function getTaskName(
	actionType: string, 
	amount: number, 
	recipientAddress: string | null, 
	taskConfig: Record<string, any>
): string {
	switch (actionType) {
		case 'payment':
			return `Send ${amount} XRP to ${recipientAddress}`;
		case 'escrow':
			if (taskConfig.condition) {
				return `Create Crypto-Secured Escrow of ${amount} XRP to ${recipientAddress}`;
			} else {
				return `Create Escrow of ${amount} XRP to ${recipientAddress}`;
			}
		case 'nft_mint':
			return `Mint NFT with URI: ${taskConfig.uri.substring(0, 30)}${taskConfig.uri.length > 30 ? '...' : ''}`;
		default:
			return `Task for ${actionType}`;
	}
}

/**
 * Génère une description pour la tâche en fonction de son type et de ses paramètres
 */
function getTaskDescription(
	actionType: string, 
	amount: number, 
	recipientAddress: string | null, 
	taskConfig: Record<string, any>
): string {
	switch (actionType) {
		case 'payment':
			return `Scheduled transaction of ${amount} XRP to ${recipientAddress}`;
		case 'escrow':
			const finishDate = new Date(taskConfig.finish_after * 1000);
			if (taskConfig.condition) {
				return `Crypto-secured escrow of ${amount} XRP to ${recipientAddress} that will finish after ${finishDate.toISOString()}. Requires fulfillment key to complete.`;
			} else {
				return `Escrow of ${amount} XRP to ${recipientAddress} that will finish after ${finishDate.toISOString()}`;
			}
		case 'nft_mint':
			return `NFT minting with URI: ${taskConfig.uri}. Transferable: ${taskConfig.transferable ? 'Yes' : 'No'}`;
		default:
			return `Task for ${actionType}`;
	}
}

export default createTask;