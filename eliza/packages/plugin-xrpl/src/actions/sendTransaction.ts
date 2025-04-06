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
import { sendTransactionService } from "../services/sendTransactionService";
import { sendTransactionExamples } from "../examples/sendTransactionExamples";
import { formatTransactionTemplate } from "../templates";
import { walletService } from "../services/lib/walletService";

export const sendTransaction: Action = {
	name: "SEND_TRANSACTION",
	similes: [
		"TRANSFER_XRP",
		"SEND_XRP",
		"TRANSFER",
		"SEND_PAYMENT",
		"MAKE_PAYMENT",
		"TRANSACTION",
		"SEND_XRP_TRANSACTION"
	],
	description: "Sends XRP from one address to another on the Ripple network",
	suppressInitialMessage: true,
	validate: async (runtime: IAgentRuntime, message: Memory) => {
		// Check if the message contains XRP addr and amount
		const text = message.content.text || '';
		const addressMatches = text.match(/r[A-Za-z0-9]{24,34}/ig);
		const amountMatch = text.match(/\d+(\.\d+)?\s*(XRP|xrp)/i);

		// We need at least one address and an amount
		if (!addressMatches || addressMatches.length < 1 || !amountMatch) {
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
			// Extract addresses and amount from the message
			const text = message.content.text || '';
			const addressMatches = text.match(/r[A-Za-z0-9]{24,34}/ig);
			const amountMatch = text.match(/(\d+(\.\d+)?)\s*(XRP|xrp)/i);
			
			if (!addressMatches || addressMatches.length < 1 || !amountMatch) {
				return false;
			}

			// Get the current wallet's address
			const wallet = walletService.getWallet();
			
			let senderAddress: string;
			let recipientAddress: string;
			
			if (addressMatches.length === 1) {
				// If only one address is provided, it's the recipient
				senderAddress = wallet.address;
				recipientAddress = addressMatches[0];
			} else {
				// If two addresses are provided, first is sender, second is recipient
				senderAddress = addressMatches[0];
				recipientAddress = addressMatches[1];
			}
			
			const amount = parseFloat(amountMatch[1]);
			
			console.log(`Sending ${amount} XRP from ${senderAddress} to ${recipientAddress}`);

			// Execute the transaction
			const transactionResult = await sendTransactionService(senderAddress, recipientAddress, amount.toString());
			
			// Update state with transaction details
			state.senderAddress = senderAddress;
			state.recipientAddress = recipientAddress;
			state.amount = amount;
			state.currency = "XRP";
			state.transactionId = transactionResult.txId;
			state.transactionStatus = transactionResult.status;
			
			// Compose context for text generation
			const context = composeContext({
				state,
				template: formatTransactionTemplate
			});

			// Generate response with context
			const formattedResponse = await generateText({
				runtime,
				context,
				modelClass: ModelClass.SMALL
			});

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
			elizaLogger.error("Error in XRPL transaction handler:", error);
			if (callback) {
				const errorMessage = error.message || "An error occurred while processing the transaction.";
				callback({
					text: `❌ Transaction failed: ${errorMessage}`,
					inReplyTo: message.id
				});
			}
			return false;
		}
	},
	examples: sendTransactionExamples as ActionExample[][],
} as Action;

export default sendTransaction;