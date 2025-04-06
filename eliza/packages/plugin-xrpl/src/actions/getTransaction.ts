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
import { getTransactionService } from "../services/getTransactionService";
import { getTransactionExamples } from "../examples/getTransactionExamples";
import { formatDate } from "../utils/formatDate";
import { formatGetTransactionTemplate } from "../templates";
import { walletService } from "../services/lib/walletService";



export const getTransaction: Action = {
	name: "GET_TRANSACTION",
	similes: [
		"CHECK_TRANSACTIONS",
		"SHOW_TRANSACTIONS",
		"LIST_TRANSACTIONS",
		"TRANSACTION_HISTORY",
		"VIEW_TRANSACTIONS",
		"GET_XRP_TRANSACTIONS"
	],
	description: "Retrieve and display transaction history for a given XRP address with optional filters (count, start date, end date)",
	suppressInitialMessage: true,
	validate: async (runtime: IAgentRuntime, message: Memory) => {
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
			const text = message.content.text || '';
			
			// Extract address or use wallet address
			const addressMatch = text.match(/r[A-Za-z0-9]{24,34}/i);
			const address = addressMatch ? addressMatch[0] : walletService.getWallet().address;
			
			// Extract transaction count if present
			const countMatch = text.match(/(\d+)\s*(transactions?|tx)/i);
			const transactionCount = countMatch ? parseInt(countMatch[1]) : undefined;
			
			// Extract dates if present
			const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
			const dates = text.match(dateRegex);
			const startDate = dates?.[0];
			const endDate = dates?.[1];
			
			elizaLogger.log(`Searching transactions for address: ${address}`);
			elizaLogger.log(`Parameters: count=${transactionCount}, start=${startDate}, end=${endDate}`);

			// Get transactions
			const transactions = await getTransactionService({
				address,
				transactionCount,
				startDate,
				endDate
			});

			// Format transactions directly into the list format
			const transactionsList = transactions.map(tx => 
				` 🕒 Date: ${formatDate(tx.date)}\n` +
				` 🔗 Hash: ${tx.hash}\n` +
				` 💰 Amount: ${tx.amount} XRP\n` +
				` 📊 Status: ${tx.status === "tesSUCCESS" ? "Success" : "Failed"}\n` +
				` 🔍 View on Explorer: https://testnet.xrpl.org/transactions/${tx.hash}` // TODO: Trigger mainnet or testnet explorer link
			).join('\n\n');

			// Update state
			state.address = address;
			state.transactionsList = transactionsList;
			if (transactionCount) state.transactionCount = transactionCount;
			if (startDate) state.startDate = startDate;
			if (endDate) state.endDate = endDate;

			// Generate response
			const context = composeContext({
				state,
				template: formatGetTransactionTemplate
			});

			const formattedResponse = await generateText({
				runtime,
				context,
				modelClass: ModelClass.SMALL
			});

			// Create memory
			await runtime.messageManager.createMemory({
				id: stringToUuid(Date.now().toString()),
				content: { text: formattedResponse },
				userId: runtime.agentId,
				roomId: message.roomId,
				agentId: runtime.agentId
			});

			// Send response
			if (callback) {
				callback({
					text: formattedResponse,
					inReplyTo: message.id
				});
			}

			return true;

		} catch (error: any) {
			elizaLogger.error("Error in the XRP plugin handler:", error);
			if (callback) {
				callback({
					text: `An error occurred while retrieving the transactions. Please try again later.`
				});
			}
			return false;
		}
	},
	examples: getTransactionExamples as ActionExample[][],
} as Action;

export default getTransaction;
