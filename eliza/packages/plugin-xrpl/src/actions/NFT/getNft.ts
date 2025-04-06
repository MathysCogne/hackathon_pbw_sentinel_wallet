import {
	elizaLogger,
	Action,
	HandlerCallback,
	IAgentRuntime,
	Memory,
	State,
	generateText,
	ModelClass,
	composeContext,
	ActionExample,
	stringToUuid
} from "@elizaos/core";
import { getNftService } from "../../services/NFT/getNftService";
import { formatNftDetailsTemplate } from "../../templates";
import { getNftExamples } from "../../examples/NFT/getNftExamples";
import { walletService } from "../../services/lib/walletService";
import { formatDate } from "../../utils/formatDate";

export const getNft: Action = {
	name: "GET_NFT",
	similes: [
		"NFT_INFO",
		"NFT_DETAILS",
		"CHECK_NFT",
		"VIEW_NFT",
		"SHOW_NFT",
		"LIST_NFTS",
		"GET_NFTS"
	],
	description: "Gets details about NFTs on the XRP Ledger for a given address",
	suppressInitialMessage: true,
	validate: async (runtime: IAgentRuntime, message: Memory) => {
		const text = message.content.text || '';
		// Accept messages with optional NFT ID, address, or count
		return text.match(/nft|token/i) !== null;
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
			
			// Extract optional NFT ID if present
			const nftIdMatch = text.match(/[A-F0-9]{64}/i);
			const tokenId = nftIdMatch ? nftIdMatch[0] : undefined;
			
			// Extract optional address if present
			const addressMatch = text.match(/r[A-Za-z0-9]{24,34}/i);
			const address = addressMatch ? addressMatch[0] : walletService.getWallet().address;
			
			// Extract count if present
			const countMatch = text.match(/(\d+)\s*(nfts?|tokens?)/i);
			const count = countMatch ? parseInt(countMatch[0]) : undefined;
			console.error("count", count);
			
			// Extract dates if present
			const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
			const dates = text.match(dateRegex);
			const startDate = dates?.[0];
			const endDate = dates?.[1];

			elizaLogger.log(`Fetching NFTs with params:`, {
				tokenId,
				address,
				count,
				startDate,
				endDate
			});

			const nfts = await getNftService({
				tokenId,
				address,
				count,
				startDate,
				endDate
			});

			// Format NFTs into a list
			const nftsList = nfts.map(nft => 
				`🖼️ NFT #${nft.serialNumber}\n` +
				`• ID: ${nft.tokenId}\n` +
				`• URI: ${nft.uri}\n` +
				`• Transfer Fee: ${nft.transferFee / 1000}%\n` +
				`• Properties: ${!(nft.flags & 1) ? "Burnable" : "Not Burnable"}, ` +
				`${!(nft.flags & 8) ? "Transferable" : "Not Transferable"}\n` +
				`• Minted: ${formatDate(nft.mintDate)}`
			).join('\n\n');

			// Update state
			state.address = address;
			state.nftsList = nftsList;
			if (count) state.nftCount = count;
			if (startDate) state.startDate = startDate;
			if (endDate) state.endDate = endDate;

			const context = composeContext({
				state,
				template: formatNftDetailsTemplate
			});

			const response = await generateText({
				runtime,
				context,
				modelClass: ModelClass.SMALL
			});

			// Create memory
			await runtime.messageManager.createMemory({
				id: stringToUuid(Date.now().toString()),
				content: { text: response },
				userId: runtime.agentId,
				roomId: message.roomId,
				agentId: runtime.agentId
			});

			if (callback) {
				callback({
					text: response,
					inReplyTo: message.id
				});
			}

			return true;

		} catch (error: any) {
			elizaLogger.error("Error in XRPL NFT info handler:", error);
			if (callback) {
				const errorMessage = error.message || "An error occurred while retrieving the NFT details.";
				callback({
					text: `❌ Failed to get NFT details: ${errorMessage}`,
					inReplyTo: message.id
				});
			}
			return false;
		}
	},
	examples: getNftExamples,
} as Action; 