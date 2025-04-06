import { elizaLogger } from "@elizaos/core";
import { xrplClient } from "../lib/xrplClient";
import { walletService } from "../lib/walletService";
import { getTransactionService } from "../getTransactionService";

const DEFAULT_COUNT_NFTS = 15;
const DEFAULT_COUNT_NFTS_LIMIT_PAGE = 2; // One page is 32 NFTs
const DEFAULT_TRANSACTIONS_SEARCH_MINT_DATE = 50;

/**
 * Service to get NFT details from the XRP Ledger
 * @param params Parameters for NFT query
 * @returns Array of NFT details
 */
export async function getNftService(params: NFTParams): Promise<NFTDetails[]> {
	const client = await xrplClient.getClient();
	elizaLogger.log("Using XRPL client to fetch NFT details");

	try {
		// If no address provided, use wallet address
		const address = params.address || walletService.getWallet().address;
		elizaLogger.log(`Checking NFTs for address ${address}`);

		const accountNfts = await client.request({
			command: "account_nfts",
			account: address,
			limit: DEFAULT_COUNT_NFTS_LIMIT_PAGE
		});

		let nfts = accountNfts.result.account_nfts;

		// Filter by specific tokenId if provided
		if (params.tokenId) {
			nfts = nfts.filter((nft: any) => nft.NFTokenID === params.tokenId);
		}

		// Get transactions for the address to find mint dates
		const transactions = await getTransactionService({
			address,
			transactionCount: DEFAULT_TRANSACTIONS_SEARCH_MINT_DATE
		}) as NFTMintTransaction[];

		elizaLogger.log("Transactions received:", JSON.stringify(transactions, null, 2));

		// Create a map of NFT IDs to their mint dates
		const nftMintDates = new Map<string, string>();
		transactions.forEach(tx => {
			if (tx.type === "NFTokenMint" && tx.meta?.nftoken_id) {
				elizaLogger.log("Processing NFT mint transaction:", {
					type: tx.type,
					date: tx.date,
					nftokenId: tx.meta.nftoken_id
				});
				// Convert XRPL timestamp to ISO string
				const mintDate = new Date(tx.date).toISOString();
				elizaLogger.log("Converted mint date:", mintDate);
				nftMintDates.set(tx.meta.nftoken_id, mintDate);
			}
		});

		// Map NFTs to our format
		const nftDetails = await Promise.all(nfts.map(async (nft: any) => {
			const hexUri = nft.URI || "";
			const decodedUri = hexUri ? Buffer.from(hexUri, 'hex').toString('utf-8') : '';
			const transferFee = (nft.Flags & 0x000FF000) >> 12;
			const serialNumber = parseInt(nft.NFTokenID.slice(-8), 16);

			return {
				tokenId: nft.NFTokenID,
				uri: decodedUri,
				owner: address,
				flags: nft.Flags,
				transferFee: transferFee,
				serialNumber: serialNumber,
				taxon: nft.NFTokenTaxon,
				mintDate: nftMintDates.get(nft.NFTokenID) || "Error fetching mint date"
			};
		}));

		// Filter by date if provided
		const filteredNfts = nftDetails.filter((nft: NFTDetails) => {
			if (!params.startDate && !params.endDate) return true;
			
			const nftDate = new Date(nft.mintDate);
			const start = params.startDate ? new Date(params.startDate) : null;
			const end = params.endDate ? new Date(params.endDate) : null;
			
			if (start && end) {
				return nftDate >= start && nftDate <= end;
			} else if (start) {
				return nftDate >= start;
			} else if (end) {
				return nftDate <= end;
			}
			return true;
		});

		// Limit the number of NFTs returned
		const limitedNfts = filteredNfts.slice(0, params.count || DEFAULT_COUNT_NFTS);

		elizaLogger.log(`Found ${filteredNfts.length} NFTs, returning ${limitedNfts.length}`);
		return limitedNfts;

	} catch (error: any) {
		elizaLogger.error("Error fetching NFTs:", error.message);
		throw new Error("Failed to fetch NFTs: " + error.message);
	}
} 