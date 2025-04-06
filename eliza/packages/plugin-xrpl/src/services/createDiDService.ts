import { elizaLogger } from "@elizaos/core";
import { xrplClient } from "./lib/xrplClient";
import { walletService } from "./lib/walletService";
import { error } from "console";

/**
 * Service to create a DID on the XRP Ledger using the DIDSet transaction
 * @param options Configuration options for registering the DID
 * @returns Transaction information including the DID and transaction hash
 */
export async function createDidService(
	options: { issuerAddress: string; didDocument?: string }
): Promise<{ txId: string; status: string; did: string }> {
	try {
		const client = await xrplClient.getClient();
		elizaLogger.log("Using XRPL client for DID registration");

		// Get or create a wallet instance using the wallet service
		const wallet = walletService.getWallet();

		// Define the DID Document (optional)
		const didDocument = options.didDocument ?? JSON.stringify({ id: `did:xrpl:${options.issuerAddress}` });

		// Prepare the AccountSet transaction with DID information in Domain field
		const didValue = `did:xrpl:${options.issuerAddress}`;
		const hexDomain = Buffer.from(didValue).toString('hex').toUpperCase();

		const prepared = await client.autofill({
			TransactionType: "AccountSet",
			Account: options.issuerAddress,
			Domain: hexDomain,
			Fee: "12"
		});

		// Sign the transaction
		let signed;
		if (walletService.isUsingXumm()) {
			signed = await Promise.resolve(wallet.sign(prepared));
		} else {
			signed = wallet.sign(prepared);
		}


		if (!signed || !signed.tx_blob) {
			throw new Error("Transaction signing failed - missing tx_blob");
		}

		// Submit the transaction
		const submit_result = await client.request({
			command: "tx",
			transaction: signed.hash
		});
		elizaLogger.log("DID registration submitted:", JSON.stringify(submit_result, null, 2));

		// Generate a DID based on the issuer address
		const did = `did:xrpl:${options.issuerAddress}`;

		elizaLogger.log(`DID registered: ${did} with transaction hash: ${signed.hash}`);

		return {
			txId: signed.hash,
			status: submit_result.result.validated?.valueOf ? "success" : "error",
			did
		};
	} catch (error) {
		elizaLogger.error("DID registration error:", error);
		throw error;
	}
}

export default createDidService;
