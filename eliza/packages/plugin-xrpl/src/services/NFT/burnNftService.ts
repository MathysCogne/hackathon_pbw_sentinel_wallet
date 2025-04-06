import { elizaLogger } from "@elizaos/core";
import { xrplClient } from "../lib/xrplClient";
import { walletService } from "../lib/walletService";

/**
 * Service to burn an NFT on the XRP Ledger
 * @param tokenId The ID of the NFT to burn
 * @returns Transaction information including the transaction ID and status
 */
export async function burnNftService(
	tokenId: string
): Promise<{ txId: string; status: string }> {
	try {
		const client = await xrplClient.getClient();
		elizaLogger.log("Using XRPL client for NFT burn");

		// Get wallet instance
		const wallet = walletService.getWallet();

		// Prepare the NFTokenBurn transaction
		const prepared = await client.autofill({
			TransactionType: "NFTokenBurn",
			Account: wallet.address,
			NFTokenID: tokenId
		});

		// Sign the transaction with XUMM (asynchronous)
		elizaLogger.log("Signing NFT burn transaction with XUMM...");
		const signed = await Promise.resolve(wallet.sign(prepared));
		
		// Verify signature was successful
		if (!signed || !signed.tx_blob) {
			throw new Error("NFT burn transaction signing failed - missing tx_blob");
		}
		
		elizaLogger.log("NFT burn transaction signed successfully with XUMM");

		const tx_result = await client.request({
			command: "tx",
			transaction: signed.hash
		});

		const status = tx_result.result.validated?.valueOf ? "success" : "error";

		elizaLogger.log(`NFT burn complete. Transaction ID: ${signed.hash}, Status: ${status}`);

		return {
			txId: signed.hash,
			status
		};

	} catch (error: any) {
		elizaLogger.error("NFT burn error:", error);
		throw error;
	}
} 