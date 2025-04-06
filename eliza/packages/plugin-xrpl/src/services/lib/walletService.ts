import { elizaLogger } from "@elizaos/core";
import { Wallet, Transaction } from "xrpl";
import { XummSdk } from "xumm-sdk";
import type { XummTypes } from "xumm-sdk";
import { CONFIG_KEYS } from "../../environment";
// import { console } from "@elizaos/core";

/**
 * Service to manage XRPL wallets with XUMM integration
 * Implements a singleton pattern to avoid creating multiple SDK instances
 */
class WalletService {
	private static instance: WalletService;
	private xumm: XummSdk;
	private xummUserAddress: string | null = null;
	private isInitialized: boolean = false;

	private constructor() {
		// Initialize XUMM SDK with API keys
		this.xumm = new XummSdk(
			process.env.NEXT_PUBLIC_XUMM_API_KEY || "",
			process.env.XUMM_API_SECRET || ""
		);
		
		// Check if XUMM is properly configured
		const hasXummConfig = Boolean(
			process.env.NEXT_PUBLIC_XUMM_API_KEY && 
			process.env.XUMM_API_SECRET
		);
		
		if (hasXummConfig) {
			// Initialize XUMM user if ID is available
			this.initXummUser();
		} else {
			console.error("XUMM is not configured. Please set NEXT_PUBLIC_XUMM_API_KEY and XUMM_API_SECRET environment variables.");
		}
	}

	/**
	 * Initialize XUMM user if a user ID is available
	 */
	private async initXummUser() {
		const userId = process.env.XUMM_USER_ID;
		if (userId) {
			try {
				// First try as a user token
				try {
					const userToken = await this.xumm.verifyUserToken(userId);
					if (userToken) {
						// The XUMM token is valid, but we need the address
						console.log("XUMM user token verified, but address unknown");
						
						// If we have an address in the environment, use it
						if (process.env.XUMM_USER_ADDRESS) {
							this.xummUserAddress = process.env.XUMM_USER_ADDRESS;
							console.log(`Using XUMM_USER_ADDRESS from env: ${this.xummUserAddress}`);
							this.isInitialized = true;
						}
						return;
					}
				} catch (e) {
					// Not a user token, try as a payload UUID
					const userInfo = await this.xumm.payload.get(userId);
					if (userInfo?.response?.account) {
						this.xummUserAddress = userInfo.response.account;
						console.log(`XUMM user initialized with address from payload: ${this.xummUserAddress}`);
						this.isInitialized = true;
						return;
					}
				}
				
				// If we get here, we couldn't get the address from the user ID
				if (!this.xummUserAddress && process.env.XUMM_USER_ADDRESS) {
					// Use the backup address if available
					this.xummUserAddress = process.env.XUMM_USER_ADDRESS;
					console.log(`Using fallback XUMM_USER_ADDRESS: ${this.xummUserAddress}`);
					this.isInitialized = true;
				} else if (!this.xummUserAddress) {
					// No address found
					console.warn("Could not determine XUMM user address");
					this.isInitialized = false;
				}
			} catch (error) {
				console.error("Failed to initialize XUMM user", error);
				this.isInitialized = false;
			}
		} else {
			// No user ID, check if an address is specified directly
			if (process.env.XUMM_USER_ADDRESS) {
				this.xummUserAddress = process.env.XUMM_USER_ADDRESS;
				console.log(`Using XUMM_USER_ADDRESS without user ID: ${this.xummUserAddress}`);
				this.isInitialized = true;
			} else {
				console.warn("No XUMM_USER_ID or XUMM_USER_ADDRESS provided");
				this.isInitialized = false;
			}
		}
	}

	/**
	 * Get the singleton instance of WalletService
	 */
	public static getInstance(): WalletService {
		if (!WalletService.instance) {
			WalletService.instance = new WalletService();
		}
		return WalletService.instance;
	}

	/**
	 * Get a wallet for XRPL interactions
	 * Returns a wallet proxy that uses XUMM for signatures
	 * @returns The XUMM wallet proxy
	 */
	public getWallet(): Wallet {
		if (!this.isInitialized || !this.xummUserAddress) {
			throw new Error("XUMM wallet not initialized. Make sure XUMM_USER_ID or XUMM_USER_ADDRESS is set.");
		}
		
		console.log("Creating XUMM wallet proxy");
		
		// Create a proxy that intercepts calls to the sign method
		// and redirects them to XUMM
		const xummWalletProxy = new Proxy({} as Wallet, {
			get: (target, prop) => {
				// For the address property, return the XUMM address
				if (prop === 'address') {
					return this.xummUserAddress;
				}
				
				// Intercept calls to the sign method to use XUMM
				if (prop === 'sign') {
					// Our asynchronous implementation of sign with XUMM
					return async (tx: Transaction) => {
						try {
							console.log("Signing transaction with XUMM");
							
							// Create a XUMM payload
							const payload = await this.createXummPayload(tx as unknown as XummTypes.XummJsonTransaction);
							if (!payload || !payload.uuid) {
								throw new Error("Failed to create XUMM payload");
							}
							
							console.log(`XUMM payload created with ID: ${payload.uuid}`);
							console.log(`Please sign the transaction in your XUMM app or by visiting: ${payload.next?.always || "XUMM app"}`);
							
							// Wait for signature via XUMM
							const xummResult = await this.waitForXummSignature(payload.uuid);
							
							// The xrpl Wallet.sign() must return:
							// { tx_blob: string; hash: string }
							if (xummResult && xummResult.tx_blob) {
								return {
									tx_blob: xummResult.tx_blob,
									hash: xummResult.hash
								};
							} else {
								throw new Error("XUMM signature incomplete");
							}
						} catch (error) {
							console.error("Error with XUMM signing:", error);
							throw error;
						}
					};
				}
				
				// For all other properties/methods, throw an error
				throw new Error(`Method ${String(prop)} not implemented in XUMM wallet proxy`);
			}
		});
		
		return xummWalletProxy as unknown as Wallet;
	}
	
	/**
	 * Wait for a transaction signature via XUMM
	 * @param payloadId The XUMM payload ID
	 * @returns The result of the signature containing tx_blob and hash
	 */
	private waitForXummSignature(payloadId: string): Promise<{tx_blob: string, hash: string}> {
		return new Promise((resolve, reject) => {
			let checkCount = 0;
			const maxChecks = 150; // 5 minutes with 2 second interval
			
			// Display a message for the user
			console.log(`⏳ Waiting for XUMM signature... Please open the XUMM app and approve the transaction.`);
			console.log(`📱 URL: https://xumm.app/sign/${payloadId}`);
			
			const checkSignature = async () => {
				try {
					checkCount++;
					const status = await this.getXummPayloadStatus(payloadId);
					
					if (!status) {
						// If no status, continue waiting
						if (checkCount % 10 === 0) {
							console.log(`Waiting for XUMM signature - check ${checkCount}/${maxChecks}`);
						}
						return;
					}
					
					// If the payload has been signed
					if (status.meta && status.meta.signed) {
						clearInterval(interval);
						console.log("Transaction signed with XUMM");
						
						// Get the necessary information from the XUMM response
						const txBlob = status.response?.hex || "";
						const txHash = status.response?.txid || "";
						
						if (!txBlob) {
							console.error("XUMM signature hex data missing");
							reject(new Error("XUMM signature hex data missing"));
							return;
						}
						
						// Return just the tx_blob and the hash
						// That's all xrpl.js needs to submit the transaction
						const result = {
							tx_blob: txBlob,
							hash: txHash
						};
						
						console.log("XUMM signature received successfully");
						resolve(result);
					} 
					// If the payload has been rejected or expired
					else if ((status.meta && status.meta.cancelled) || (status.meta && status.meta.expired)) {
						clearInterval(interval);
						console.warn("XUMM signature rejected or expired");
						reject(new Error("XUMM signature rejected or expired"));
					}
					// Otherwise, keep waiting
					else {
						// Not signed yet, display a message every 10 checks
						if (checkCount % 10 === 0) {
							console.log(`Waiting for XUMM signature - check ${checkCount}/${maxChecks}`);
							console.log(`To sign, visit: https://xumm.app/sign/${payloadId}`);
						}
						
						// If we've reached the maximum number of checks
						if (checkCount >= maxChecks) {
							clearInterval(interval);
							console.warn("XUMM signature timeout");
							reject(new Error("XUMM signature timeout"));
						}
					}
				} catch (error) {
					console.error("Error checking XUMM signature status:", error);
					// Don't reject immediately, keep trying
					// Unless we've reached the maximum number of checks
					if (checkCount >= maxChecks) {
						clearInterval(interval);
						console.warn("XUMM signature timeout after errors");
						reject(error);
					}
				}
			};
			
			// Check the status every 2 seconds
			const interval = setInterval(checkSignature, 2000);
			
			// Check immediately the first time
			checkSignature();
		});
	}

	/**
	 * Create a transaction via XUMM and return a payload for signature
	 * @param txJson The XRPL transaction object
	 * @returns The XUMM payload for signature
	 */
	public async createXummPayload(txJson: XummTypes.XummJsonTransaction) {
		try {
			// Make sure the txjson.Account is set, otherwise use the XUMM address
			if (!txJson.Account && this.xummUserAddress) {
				txJson.Account = this.xummUserAddress;
			}
			
			const payload = await this.xumm.payload.create({
				txjson: txJson,
				user_token: process.env.XUMM_USER_ID
			});
			
			if (payload && payload.uuid) {
				console.log("XUMM payload created:", {
					uuid: payload.uuid,
					qr: payload.refs?.qr_png || "No QR code",
					next: payload.next?.always || "No redirect URL"
				});
			} else {
				console.warn("Created XUMM payload is incomplete");
			}
			
			return payload;
		} catch (error) {
			console.error("Failed to create XUMM payload", error);
			throw error;
		}
	}

	/**
	 * Check the status of a XUMM transaction
	 * @param payloadId The XUMM payload ID
	 * @returns The payload status
	 */
	public async getXummPayloadStatus(payloadId: string) {
		try {
			const status = await this.xumm.payload.get(payloadId);
			return status;
		} catch (error) {
			console.error("Failed to get XUMM payload status", error);
			throw error;
		}
	}

	/**
	 * Check if a payload has been signed
	 * @param payloadId The XUMM payload ID
	 * @returns True if the payload has been signed
	 */
	public async isPayloadSigned(payloadId: string): Promise<boolean> {
		try {
			const status = await this.getXummPayloadStatus(payloadId);
			return Boolean(status?.meta?.signed);
		} catch (error) {
			console.error("Failed to check if payload is signed", error);
			return false;
		}
	}

	/**
	 * Get the XUMM user address
	 * @returns The XUMM wallet address or null if not available
	 */
	public getXummUserAddress(): string | null {
		return this.xummUserAddress;
	}

	/**
	 * Set the XUMM user ID and initialize their address
	 * @param userId The XUMM user ID
	 */
	public async setXummUserId(userId: string) {
		process.env.XUMM_USER_ID = userId;
		await this.initXummUser();
	}
	
	/**
	 * Set the XUMM user address
	 * Useful when the address is not automatically obtained
	 * @param address The XRPL address
	 */
	public setXummUserAddress(address: string): void {
		this.xummUserAddress = address;
		process.env.XUMM_USER_ADDRESS = address;
		this.isInitialized = true;
		console.log(`XUMM user address set: ${address}`);
	}

	/**
	 * Check if XUMM is being used
	 * @returns true if XUMM is initialized and has a user address
	 */
	public isUsingXumm(): boolean {
		return this.isInitialized && this.xummUserAddress !== null;
	}

	/**
	 * Get the XUMM SDK instance
	 * @returns The XUMM SDK instance
	 */
	public getXummSdk(): XummSdk {
		return this.xumm;
	}
}

// Export a singleton instance
export const walletService = WalletService.getInstance();