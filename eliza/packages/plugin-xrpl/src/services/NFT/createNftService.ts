import { elizaLogger } from "@elizaos/core";
import { xrplClient } from "../lib/xrplClient";
import { walletService } from "../lib/walletService";


/**
 * Service to create an NFT on the XRP Ledger
 * @param options Configuration options for minting the NFT
 * @returns Transaction information including the token ID and transaction hash
 */
export async function createNftService(
	options: NFTMintOptions
): Promise<{ txId: string; status: string; tokenId: string }> {
	try {
		const client = await xrplClient.getClient();
		elizaLogger.log("Using XRPL client");
		
		// Get wallet instance using the wallet service
		const wallet = walletService.getWallet();

		// Calculate flags based on provided options
		let flags = 0;
		
		// Only modify flags if the options are explicitly set
		if (options.isBurnable === false) flags |= 1;      // lsfBurnable - default is burnable
		if (options.isTransferable === false) flags |= 8;  // lsfTransferable - default is transferable

		// Convert transfer fee to proper format (e.g., 10% = 10000) if provided
		const formattedTransferFee = options.transferFee !== undefined 
		? Math.min(Math.max(Math.floor(options.transferFee * 100), 0), 50000)
		: 0; // Default to 0 if not provided

		// Get initial NFT count
		const initialNfts = await client.request({
			command: "account_nfts",
			account: options.issuerAddress
		});
		const initialCount = initialNfts.result.account_nfts.length;

		// Prepare the NFToken minting transaction
		const prepared = await client.autofill({
			TransactionType: "NFTokenMint",
			Account: options.issuerAddress,
			URI: Buffer.from(options.tokenURI).toString("hex").toUpperCase(),
			Flags: flags,
			TransferFee: formattedTransferFee,
			NFTokenTaxon: 0 // Required field, can be any value
		});

		// Sign the transaction 
		elizaLogger.log("Signing NFT minting transaction with XUMM...");
		
		// asyn for XUMM
		const signed = await Promise.resolve(wallet.sign(prepared));
		
		if (!signed || !signed.tx_blob) {
			throw new Error("NFT minting transaction signing failed");
		}

		elizaLogger.log("NFT minting transaction signed successfully with XUMM");

		// Submit the transaction
		const submit_result = await client.submit(signed.tx_blob);
		elizaLogger.log("NFT minting submitted:", JSON.stringify(submit_result, null, 2));

		// Wait for validation
		// elizaLogger.log("Waiting for transaction validation...");
		// await new Promise(resolve => setTimeout(resolve, 5000));

		// Get updated NFT list
		const updatedNfts = await client.request({
			command: "account_nfts",
			account: options.issuerAddress
		});

		// Find the newly created NFT
		const newNfts = updatedNfts.result.account_nfts;
		let tokenId = "";
		
		if (newNfts.length > initialCount) {
			// The last NFT in the list should be our newly created one
			const newNft = newNfts[newNfts.length - 1];
			tokenId = newNft.NFTokenID;
			elizaLogger.log(`Found new NFT with ID: ${tokenId}`);
		} else {
			elizaLogger.warn("Could not find newly created NFT, using fallback");
			tokenId = `${signed.hash.substring(0, 16)}...`;
		}

		elizaLogger.log(`NFT minted with ID: ${tokenId} and transaction hash: ${signed.hash}`);

		return {
			txId: signed.hash,
			status: submit_result.result.engine_result,
			tokenId
		};

	} catch (error) {
		elizaLogger.error("NFT minting error:", error);
		throw error;
	}
}