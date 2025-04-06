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
import { getBalanceService } from "../services/getBalanceService";
import { getBalanceExamples } from "../examples/getBalanceExamples";
import { formatBalanceTemplate } from "../templates";

export const getBalance: Action = {
	name: "GET_BALANCE",
	similes: [
		"CHECK_BALANCE",
		"SHOW_BALANCE",
		"BALANCE",
		"GET_XRP_BALANCE",
		"VIEW_XRP_BALANCE"
	],
	description: "Retrieve and display the XRP balance of a given address on the XRP Ledger network",
	suppressInitialMessage: true,
	// Validate the message to check if it contains an XRP address
	validate: async (runtime: IAgentRuntime, message: Memory) => {
		const text = message.content.text || '';
		const addressMatch = text.match(/r[A-Za-z0-9]{24,34}/i);
		if (!addressMatch) {
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
			// Extract addresses from the message
			const text = message.content.text || '';
			const addressMatch = text.match(/r[A-Za-z0-9]{24,34}/i);
			if (!addressMatch) {
				return false;
			}
			const address = addressMatch[0];
			elizaLogger.log(`Searching for balance for address: ${address}`);

			// Pass runtime to the service
			const xrpBalance = await getBalanceService(address);

			// Update the state with the address and balance
			state.address = address;
			state.balance = xrpBalance;
			state.currency = "XRP";
			// Compose the context for text generation with the state (So with the address and balance)
			const context = composeContext({
				state,
				template: formatBalanceTemplate
			});

			// Generate the response with the context
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
			elizaLogger.error("Error in the XRP plugin handler:", error);
			if (callback) {
				callback({
					text: `An error occurred while retrieving the balance. Please try again later. ${error}`
				});
			}
			return false;
		}
	},
	examples: getBalanceExamples as ActionExample[][],
} as Action;

export default getBalance;
