import { elizaLogger } from "@elizaos/core";
import { dropsToXrp } from "xrpl";
import { xrplClient } from "./lib/xrplClient";
import { walletService } from "./lib/walletService";

const DEFAULT_COUNT_TRANSACTIONS = 15;
// Ripple epoch is January 1st, 2000 00:00:00 UTC
const RIPPLE_EPOCH_OFFSET = 946684800;

export async function getTransactionService({ 
	address, 
	transactionCount,
	startDate,
	endDate
}: TransactionParams): Promise<Transaction[]> {
	try {
		const client = await xrplClient.getClient();
		elizaLogger.log("Using XRPL client");

		// If no address provided, use wallet address
		const useAddress = address || walletService.getWallet().address;

		const response = await client.request({
			command: "account_tx",
			account: useAddress,
			limit: transactionCount || DEFAULT_COUNT_TRANSACTIONS,
			ledger_index_min: -1,
			ledger_index_max: -1
		});

		elizaLogger.log("Received response:", JSON.stringify(response, null, 2));

		const transactions = response.result.transactions
			.filter((tx: any) => {
				if (!startDate && !endDate) return true;
				
				const txDate = new Date(tx.tx_json.date * 1000); // Convert XRPL timestamp to JS Date
				const start = startDate ? new Date(startDate) : null;
				const end = endDate ? new Date(endDate) : null;
				
				if (start && end) {
					return txDate >= start && txDate <= end;
				} else if (start) {
					return txDate >= start;
				} else if (end) {
					return txDate <= end;
				}
				return true;
			})
			.map((tx: any) => {
				const amount = tx.meta.delivered_amount 
					? dropsToXrp(tx.meta.delivered_amount).toString()
					: tx.tx_json.DeliverMax 
						? dropsToXrp(tx.tx_json.DeliverMax).toString()
						: "0";

				elizaLogger.log("Raw transaction date:", tx.tx_json.date);
				// Convert XRPL timestamp (seconds since Ripple epoch) to JS timestamp (milliseconds since Unix epoch)
				const date = new Date((tx.tx_json.date + RIPPLE_EPOCH_OFFSET) * 1000);
				elizaLogger.log("Converted date:", date.toISOString());

				return {
					type: tx.tx_json.TransactionType,
					hash: tx.hash,
					date: date.toISOString(),
					meta: tx.meta,
					amount: amount,
					from: tx.tx_json.Account,
					to: tx.tx_json.Destination,
					status: tx.meta.TransactionResult
				};
			});

		elizaLogger.log("Processed transactions:", JSON.stringify(transactions, null, 2));
		return transactions;

	} catch (error) {
		elizaLogger.error("Error getting transactions:", error);
		throw error;
	}
}