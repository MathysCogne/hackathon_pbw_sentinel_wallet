import { elizaLogger } from "@elizaos/core";
import { AccountInfoResponse, dropsToXrp } from "xrpl";
import { xrplClient } from "./lib/xrplClient";

export async function getBalanceService(address: string): Promise<string> {
	try {
		const client = await xrplClient.getClient();
		elizaLogger.log("Using XRPL client");

		const response = await client.request({
			command: "account_info",
			account: address,
			ledger_index: "validated"
		});

		elizaLogger.log("Received response:", JSON.stringify(response, null, 2));
		
		// Type assertion to handle potential error response
		const result = response.result as AccountInfoResponse["result"] & { error?: string; error_message?: string };
		
		if (result.error) {
			const errorMessage = result.error_message || result.error;
			elizaLogger.error("API Error:", errorMessage);
			throw new Error(errorMessage);
		}

		// Convert drops to XRP using XRPL's official conversion method
		const xrpBalance = dropsToXrp(result.account_data.Balance);
		elizaLogger.log("XRP Balance:", xrpBalance);

		return xrpBalance.toString();
	} catch (error) {
		elizaLogger.error("Error getting balance:", error);
		throw error;
	}
}