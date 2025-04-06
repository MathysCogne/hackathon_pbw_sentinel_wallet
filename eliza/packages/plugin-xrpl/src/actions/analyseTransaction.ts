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
import { analyseTransactionService } from "../services/analyseTransactionService";
import { analyseTransactionExamples } from "../examples/analyseTransactionExamples";
import { analyseTransactionTemplate } from "../templates/analyseTransactionTemplate";
import { sendAnalyseDB } from "../services/lib/sendAnalyseDB";

export const analyseTransaction: Action = {
	name: "ANALYSE_TRANSACTION",
	similes: [
		"CHECK_TRANSACTION",
		"VERIFY_TRANSACTION",
		"TRANSACTION_ANALYSIS",
		"EVALUATE_TRANSACTION",
		"TRANSACTION_SECURITY_CHECK",
		"TRANSACTION_RISK_ANALYSIS"
	],
	description: "Analyzes an XRP transaction to determine its legitimacy and calculate a confidence score",
	validate: async (runtime: IAgentRuntime, message: Memory) => {
		// Check if the message contains an XRP transaction ID
		const text = message.content.text || '';
		// Look for a transaction hash (64 hexadecimal characters)
		const txIdMatches = text.match(/[0-9A-F]{64}/i);
		
		// We need a transaction ID
		if (!txIdMatches || txIdMatches.length < 1) {
			return false;
		}
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
			// Extract transaction ID from the message
			const text = message.content.text || '';
			const txIdMatches = text.match(/[0-9A-F]{64}/i);
			
			if (!txIdMatches || txIdMatches.length < 1) {
				return false;
			}

			const transactionId = txIdMatches[0];
			console.log(`Analysing transaction: ${transactionId}`);
			
			// Call the analysis service
			const analysisResult = await analyseTransactionService(transactionId);
			
			// Update state with analysis details
			state.txId = analysisResult.txId;
			state.senderAddress = analysisResult.senderAddress;
			state.recipientAddress = analysisResult.recipientAddress;
			
			// Ensure proper amount formatting
			if (analysisResult.amount && !isNaN(parseFloat(analysisResult.amount))) {
				// Format nicely with up to 6 decimal places, removing trailing zeros
				const numericAmount = parseFloat(analysisResult.amount);
				state.amount = numericAmount.toFixed(6).replace(/\.?0+$/, '') || "0";
				state.amountNumeric = numericAmount.toFixed(2);
			} else {
				state.amount = "0";
				state.amountNumeric = "0.00";
			}
			
			state.currency = analysisResult.currency || "XRP";
			state.confidenceScore = analysisResult.confidenceScore;
			
			// Add detailed risk factors to the state
			state.riskFactors = analysisResult.riskFactors || [];
			state.riskFactorsText = analysisResult.riskFactors ? 
				analysisResult.riskFactors.join(", ") : 
				"No specific risk factors identified";
			
			state.recommendation = analysisResult.recommendation;
			
			// Add advanced analysis data with clear debugging
			state.behavioralScore = analysisResult.advancedAnalysis.behavioralScore;
			state.metadataScore = analysisResult.advancedAnalysis.metadataScore;
			state.historicalScore = analysisResult.advancedAnalysis.historicalScore;
			state.simulationScore = analysisResult.advancedAnalysis.simulationScore;
			state.profileScore = analysisResult.advancedAnalysis.profileScore;
			
			// Add additional context for better response generation
			state.analysisTimestamp = analysisResult.timestamp;
			
			// Compose context for text generation
			const context = composeContext({
				state,
				template: analyseTransactionTemplate
			});

			// Generate response with context
			const formattedResponse = await generateText({
				runtime,
				context,
				modelClass: ModelClass.SMALL
			});

			// Enregistrer l'analyse dans Supabase
			try {
				await sendAnalyseDB(
					transactionId,
					analysisResult.recommendation,
					formattedResponse,
					{
						senderAddress: analysisResult.senderAddress,
						recipientAddress: analysisResult.recipientAddress,
						amount: analysisResult.amount,
						currency: analysisResult.currency,
						confidenceScore: analysisResult.confidenceScore,
						riskFactors: analysisResult.riskFactors
					}
				);
				elizaLogger.info(`Analyse de transaction ${transactionId} enregistrée dans Supabase`);
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				elizaLogger.error(`Erreur lors de l'enregistrement dans Supabase: ${errorMessage}`);
				// Continuer l'exécution même en cas d'erreur d'enregistrement
			}

			// Create memory of this action
			await runtime.messageManager.createMemory({
				id: stringToUuid(Date.now().toString()),
				content: { text: formattedResponse },
				userId: runtime.agentId,
				roomId: message.roomId,
				agentId: runtime.agentId
			});

			// Send the generated message
			if (callback) {
				callback({
					text: formattedResponse,
					inReplyTo: message.id
				});
			}

			return true;

		} catch (error: any) {
			elizaLogger.error("Error in XRPL transaction analyzer:", error);
			if (callback) {
				const errorMessage = error.message || "An error occurred while analyzing the transaction.";
				callback({
					text: `❌ Analysis failed: ${errorMessage}`,
					inReplyTo: message.id
				});
			}
			return false;
		}
	},
	examples: analyseTransactionExamples as ActionExample[][],
} as Action;

export default analyseTransaction;