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
import { burnNftService } from "../../services/NFT/burnNftService";
import { burnNftExamples } from "../../examples/NFT/burnNftExamples";
import { formatNftBurnTemplate } from "../../templates";

export const burnNft: Action = {
	name: "BURN_NFT",
	similes: [
		"DELETE_NFT",
		"REMOVE_NFT",
		"DESTROY_NFT",
		"BURN_TOKEN",
		"DELETE_TOKEN",
		"REMOVE_TOKEN"
	],
	description: "Burns (permanently destroys) an NFT on the XRP Ledger",
	suppressInitialMessage: true,
	validate: async (runtime: IAgentRuntime, message: Memory) => {
		// Check if the message contains a valid NFT ID (64 characters hexadecimal)
		const text = message.content.text || '';
		const nftIdMatch = text.match(/[A-F0-9]{64}/i);
		
		if (!nftIdMatch) {
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
			const text = message.content.text || '';
			
			// Extract NFT ID
			const nftIdMatch = text.match(/[A-F0-9]{64}/i);
			if (!nftIdMatch) {
				return false;
			}
			
			const tokenId = nftIdMatch[0];
			elizaLogger.log(`Attempting to burn NFT with ID: ${tokenId}`);

			// Call the service to burn the NFT
			const burnResult = await burnNftService(tokenId);
			
			// Update state with burn details
			state.tokenId = tokenId;
			state.transactionId = burnResult.txId;
			state.transactionStatus = burnResult.status;
			
			// Compose context for text generation
			const context = composeContext({
				state,
				template: formatNftBurnTemplate
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
			elizaLogger.error("Error in XRPL NFT burn handler:", error);
			if (callback) {
				const errorMessage = error.message || "An error occurred while burning the NFT.";
				callback({
					text: `❌ Failed to burn NFT: ${errorMessage}`,
					inReplyTo: message.id
				});
			}
			return false;
		}
	},
	examples: burnNftExamples as ActionExample[][],
} as Action;

export default burnNft; 