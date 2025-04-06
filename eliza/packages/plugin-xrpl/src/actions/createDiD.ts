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
import { createDidService } from "../services/createDiDService";
import { createDidExamples } from "../examples/createDiDExamples";
import { formatDidCreationTemplate } from "../templates/createDIDtemplate";

export const createDid: Action = {
name: "CREATE_DID",
similes: [
	"REGISTER_DID",
	"DID_REGISTER",
	"ISSUE_DID",
	"MAKE_DID",
	"GENERATE_DID"
],
description: "Creates a new Decentralized Identifier (DID) on the XRP Ledger",
suppressInitialMessage: true,
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
		const text = message.content.text || '';
		const addressMatch = text.match(/r[A-Za-z0-9]{24,34}/i);
		if (!addressMatch) {
			return false;
		}
		const issuerAddress = addressMatch[0];
		
		console.log(`Creating DID for address ${issuerAddress} on XRPL`);
		
		const didResult = await createDidService({
			issuerAddress
		});
		
		console.log(`DID created successfully: ${didResult.did}`);
		
		state.issuerAddress = issuerAddress;
		state.did = didResult.did;
		state.transactionId = didResult.txId;
		state.transactionStatus = didResult.status;

		const context = composeContext({
			state,
			template: formatDidCreationTemplate
		});
		
		const formattedResponse = await generateText({
			runtime,
			context,
			modelClass: ModelClass.SMALL
		});

		await runtime.messageManager.createMemory({
			id: stringToUuid(Date.now().toString()),
			content: { text: formattedResponse },
			userId: runtime.agentId,
			roomId: message.roomId,
			agentId: runtime.agentId
		});

		if (callback) {
			callback({
				text: formattedResponse,
				inReplyTo: message.id
			});
		}
		return true;
	} catch (error: any) {
		elizaLogger.error("Error in XRPL DID creation handler:", error);
		if (callback) {
			callback({
				text: `An error occurred while creating the DID. Please try again later.`
			});
		}
		return false;
	}
},
examples: createDidExamples as ActionExample[][],
} as Action;

export default createDid;
