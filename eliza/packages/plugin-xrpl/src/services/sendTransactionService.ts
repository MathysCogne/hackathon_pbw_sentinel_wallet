import { xrpToDrops } from "xrpl";
import { xrplClient } from "./lib/xrplClient";
import { walletService } from "./lib/walletService";
import { elizaLogger } from "@elizaos/core";

/**
 * Service to send XRP from one account to another
 * @param fromAddress The address to send XRP from
 * @param toAddress The address to send XRP to
 * @param amount The amount of XRP to send
 * @returns Transaction information including the transaction ID and status
 */
export async function sendTransactionService(
		fromAddress: string,
		toAddress: string,
		amount: string
): Promise<{ txId: string; status: string }> {
		try {
				console.log(`Sending ${amount} XRP from ${fromAddress} to ${toAddress}`);
				const client = await xrplClient.getClient();
				console.log("Using XRPL client");

				// Get or create a wallet instance using the wallet service
				const wallet = walletService.getWallet();

				// Verify that the wallet's address matches the sender's address
				if (wallet.address !== fromAddress) {
						throw new Error(`Unauthorized: This wallet (${wallet.address}) is not authorized to send from ${fromAddress}`);
				}

				// Obtenir les informations actuelles du compte
				const accountInfo = await client.request({
						command: "account_info",
						account: fromAddress
				});

				console.log("Account info retrieved:", JSON.stringify(accountInfo.result, null, 2));

				// Préparer la transaction avec la séquence correcte du compte
				const prepared = await client.autofill({
						TransactionType: "Payment",
						Account: fromAddress,
						Amount: xrpToDrops(amount),
						Destination: toAddress,
						// Utiliser la séquence correcte pour éviter les doublons
						Sequence: accountInfo.result.account_data.Sequence
				});

				console.log("Transaction prepared:", JSON.stringify(prepared, null, 2));

				// Sign the transaction - traiter le cas où sign est asynchrone (XUMM)
				let signed;
				if (walletService.isUsingXumm()) {
						// Si XUMM est utilisé, la méthode sign est asynchrone
						console.log("Using XUMM for signing, waiting for user confirmation...");
						signed = await Promise.resolve(wallet.sign(prepared));
						console.log("Transaction signed with XUMM");
				} else {
						// Sinon, utiliser la méthode synchrone normale
						signed = wallet.sign(prepared);
						console.log("Transaction signed with local key");
				}
				
				// Vérifier que la signature est réussie
				if (!signed || !signed.tx_blob) {
						throw new Error("Transaction signing failed - missing tx_blob");
				}

				const tx_result = await client.request({
						command: "tx",
						transaction: signed.hash
				});
				console.log("Transaction result:", JSON.stringify(tx_result, null, 2));
				// elizaLogger.log("Transaction result:", JSON.stringify(tx_result, null, 2));

				// Extract transaction ID and status
				const txId = signed.hash;
				const status = tx_result.result.validated?.valueOf ? "success" : "error";
				console.log(`Transaction complete. ID: ${txId}, Status: ${status}`);
				return {
						txId,
						status
				};

		} catch (error) {
				console.error("Transaction error:", error);
				throw error;
		}
}