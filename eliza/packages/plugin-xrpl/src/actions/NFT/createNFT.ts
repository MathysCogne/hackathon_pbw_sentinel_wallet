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
import { createNftService } from "../../services/NFT/createNftService";
import { createNftExamples } from "../../examples/NFT/createNftExamples";
import { formatNftCreationTemplate } from "../../templates";

export const createNft: Action = {
name: "CREATE_NFT",
similes: [
	"MINT_NFT",
	"NFT_MINT",
	"ISSUE_NFT",
	"MAKE_NFT",
	"GENERATE_NFT"
],
description: "Creates a new NFT on the XRP Ledger",
suppressInitialMessage: true,
validate: async (runtime: IAgentRuntime, message: Memory) => {
	// Check if the message contains an XRP address and URI
	const text = message.content.text || '';
	const addressMatch = text.match(/r[A-Za-z0-9]{24,34}/i);
	const uriMatch = text.match(/https?:\/\/\S+/i) || text.match(/ipfs:\/\/\S+/i);
	
	if (!addressMatch || !uriMatch) {
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
	// Extract address and URI from the message
	const text = message.content.text || '';
	const addressMatch = text.match(/r[A-Za-z0-9]{24,34}/i);
	const uriMatch = text.match(/https?:\/\/\S+/i) || text.match(/ipfs:\/\/\S+/i);
	
	if (!addressMatch || !uriMatch) {
		return false;
	}
	
	const issuerAddress = addressMatch[0];
	const tokenURI = uriMatch[0];
	
	// Extract optional parameters if present
	let transferFee = 0;
	const transferFeeMatch = text.match(/(\d+(\.\d+)?)%\s*(?:transfer\s*fee|fee)/i);
	if (transferFeeMatch) {
		transferFee = parseFloat(transferFeeMatch[1]);
	}
	
	const isBurnable = !text.toLowerCase().includes("not burnable");
	const isTransferable = !text.toLowerCase().includes("not transferable");
	
	console.log(`Creating NFT on address ${issuerAddress} with URI ${tokenURI}`);

	// Call the service to create the NFT
	const nftResult = await createNftService({
		issuerAddress,
		tokenURI,
		transferFee,
		isBurnable,
		isTransferable
	});
	
	console.log(`NFT created successfully with ID: ${nftResult.tokenId}`);

	// Update state with NFT details
	state.issuerAddress = issuerAddress;
	state.tokenURI = tokenURI;
	state.tokenId = nftResult.tokenId;
	state.transactionId = nftResult.txId;
	state.transactionStatus = nftResult.status;
	state.transferFee = transferFee;
	state.isBurnable = isBurnable;
	state.isTransferable = isTransferable;
	
	// Compose context for text generation
	const context = composeContext({
		state,
		template: formatNftCreationTemplate
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
	elizaLogger.error("Error in XRPL NFT creation handler:", error);
	if (callback) {
		callback({
		text: `An error occurred while creating the NFT. Please try again later.`
		});
	}
	return false;
	}
},
examples: createNftExamples as ActionExample[][],
} as Action;

export default createNft;