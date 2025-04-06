import { xrpToDrops } from "xrpl";
import { xrplClient } from "./lib/xrplClient";
import { walletService } from "./lib/walletService";
import { elizaLogger } from "@elizaos/core";
import { supabaseClient } from "./lib/supabaseClient";

/**
 * Interface pour le résultat de la création d'une tâche
 */
interface TaskCreationResult {
	taskId: string;
	taskName: string;
	status: string;
}


/**
 * Service pour créer une tâche planifiée dans la base de données
 * @param userId L'identifiant de l'utilisateur
 * @param name Le nom de la tâche
 * @param action L'action à exécuter (ex: payment, trustline, escrow)
 * @param description Description détaillée de la tâche
 * @param recurrenceType Type de récurrence (once, minutely, daily, weekly, monthly)
 * @param recurrenceInterval Intervalle pour la récurrence (ex: tous les 2 jours, toutes les 5 minutes)
 * @param recurrenceDays Tableau des jours de la semaine pour les tâches hebdomadaires
 * @param startDate Date de début d'exécution de la tâche
 * @param taskConfig Configuration spécifique à la tâche (JSON)
 * @returns Informations sur la tâche créée
 */
export async function createTaskService(
	userId: string,
	name: string,
	action: string,
	description: string,
	recurrenceType: string,
	recurrenceInterval: number,
	recurrenceDays: number[],
	startDate: Date,
	taskConfig: Record<string, any>
): Promise<TaskCreationResult> {
	try {
		elizaLogger.log(`Creating task for user ${userId}: ${name}`);
		console.log(`Creating task for user ${userId}: ${name}`);

		// Vérifier si la tâche contient une condition cryptographique (pour les escrows)
		if (action === 'escrow' && taskConfig.condition) {
			console.log(`Escrow avec condition cryptographique détectée:`);
			console.log(`- Condition: ${taskConfig.condition}`);
			console.log(`- Fulfillment (secret): ${taskConfig.fulfillment}`);
		}

		// Vérifier que l'utilisateur existe
		const { data: userData, error: userError } = await supabaseClient
				.from('users')
				.select('id')
				.eq('id', userId)
				.single();

		if (userError || !userData) {
				console.warn(`User not found: ${userError?.message || 'Unknown error'}. Creating task anyway.`);
				// Note: On continue même si l'utilisateur n'est pas trouvé, car on utilise un ID fixe pour les tests
		}

		// Calculer la prochaine date d'exécution en fonction du type de récurrence
		let nextExecution = new Date(startDate);
		
		// Vérifier que la date de début est dans le futur
		if (nextExecution.getTime() < Date.now()) {
				// Pour une tâche ponctuelle
				if (recurrenceType === 'once') {
						nextExecution.setDate(nextExecution.getDate());
				}
				// Pour les autres types de récurrence, calculer la prochaine occurrence
				else {
						// Cette logique pourrait être développée davantage si nécessaire
						nextExecution = calculateNextExecution(nextExecution, recurrenceType, recurrenceInterval, recurrenceDays);
				}
		}

		// Créer l'enregistrement de tâche dans la base de données
		const { data: taskData, error: taskError } = await supabaseClient
				.from('tasks')
				.insert({
						user_id: userId,
						name,
						action,
						description,
						status: 'pending',
						recurrence_type: recurrenceType,
						recurrence_interval: recurrenceInterval,
						recurrence_days: recurrenceDays.length > 0 ? recurrenceDays : null,
						start_date: startDate.toISOString(),
						next_execution: nextExecution.toISOString(),
						task_config: taskConfig
				})
				.select()
				.single();

		if (taskError) {
				throw new Error(`Error creating task: ${taskError.message}`);
		}

		elizaLogger.log(`Task created successfully: ${taskData.id}`);
		console.log(`Task created successfully: ${taskData.id}`);

		return {
				taskId: taskData.id,
				taskName: taskData.name,
				status: taskData.status
		};

	} catch (error: any) {
		elizaLogger.error("Error in createTaskService:", error);
		console.error("Error in createTaskService:", error);
		throw error;
	}
}

/**
 * Calcule la date de la prochaine exécution en fonction du type de récurrence
 * @param baseDate Date de base pour le calcul
 * @param recurrenceType Type de récurrence
 * @param recurrenceInterval Intervalle de récurrence (ex: tous les 2 jours)
 * @param recurrenceDays Jours de récurrence pour les tâches hebdomadaires
 * @returns Date de la prochaine exécution
 */
function calculateNextExecution(
		baseDate: Date,
		recurrenceType: string,
		recurrenceInterval: number,
		recurrenceDays: number[]
): Date {
		const now = new Date();
		const nextDate = new Date(baseDate);
		
		switch (recurrenceType) {
				case 'minutely':
						// Calculer la prochaine occurrence en minutes
						if (baseDate.getTime() < now.getTime()) {
								// Calculer combien de minutes ont passé depuis baseDate
								const diffMinutes = Math.floor((now.getTime() - baseDate.getTime()) / (60 * 1000));
								
								// Calculer le nombre d'intervalles nécessaire pour atteindre/dépasser le temps actuel
								const intervals = Math.ceil(diffMinutes / recurrenceInterval);
								
								// Ajouter ce nombre d'intervalles à la date de base pour obtenir la prochaine occurrence
								nextDate.setTime(baseDate.getTime() + (intervals * recurrenceInterval * 60 * 1000));
						}
						break;
						
				case 'daily':
						// Si la date de base est dans le passé, commencer demain
						if (baseDate.getTime() < now.getTime()) {
								nextDate.setDate(now.getDate() + recurrenceInterval);
								nextDate.setHours(baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds());
						}
						break;
						
				case 'weekly':
						if (recurrenceDays.length > 0) {
								// Trouver le prochain jour de la semaine valide
								let found = false;
								for (let i = 0; i < 7 && !found; i++) {
										const checkDate = new Date(now);
										checkDate.setDate(now.getDate() + i);
										
										const dayOfWeek = checkDate.getDay(); // 0 = dimanche, 1 = lundi, etc.
										if (recurrenceDays.includes(dayOfWeek)) {
												nextDate.setDate(checkDate.getDate());
												nextDate.setHours(baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds());
												found = true;
										}
								}
								
								// Si aucun jour correspondant n'est trouvé, utiliser le premier jour spécifié
								// et avancer à la semaine suivante * recurrenceInterval
								if (!found && recurrenceDays.length > 0) {
										const dayOfWeek = recurrenceDays[0];
										const currentDay = now.getDay();
										let daysUntilNextOccurrence = (dayOfWeek - currentDay + 7) % 7;
										// Ajouter des semaines supplémentaires selon l'intervalle
										daysUntilNextOccurrence += (recurrenceInterval - 1) * 7;
										
										nextDate.setDate(now.getDate() + daysUntilNextOccurrence);
										nextDate.setHours(baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds());
								}
						} else {
								// Si aucun jour n'est spécifié, utiliser le même jour de la semaine que la date de base
								const baseDayOfWeek = baseDate.getDay();
								const currentDay = now.getDay();
								let daysUntilNextOccurrence = (baseDayOfWeek - currentDay + 7) % 7;
								// Ajouter des semaines supplémentaires selon l'intervalle
								daysUntilNextOccurrence += (recurrenceInterval - 1) * 7;
								
								nextDate.setDate(now.getDate() + daysUntilNextOccurrence);
								nextDate.setHours(baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds());
						}
						break;
						
				case 'monthly':
						// Si la date du mois actuel est passée, passer au mois suivant * recurrenceInterval
						nextDate.setDate(baseDate.getDate());
						if (nextDate.getTime() < now.getTime()) {
								nextDate.setMonth(nextDate.getMonth() + recurrenceInterval);
						}
						break;
						
				case 'once':
				default:
						// Pour une tâche ponctuelle, si la date est dans le passé, la définir à demain
						if (nextDate.getTime() < now.getTime()) {
								nextDate.setDate(now.getDate() + 1);
								nextDate.setHours(baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds());
						}
						break;
		}
		
		return nextDate;
}