import { xrplClient } from "./lib/xrplClient";
import { elizaLogger } from "@elizaos/core";
import { dropsToXrp } from "xrpl";

interface TransactionAnalysisResult {
	txId: string;
	senderAddress: string;
	recipientAddress: string;
	amount: string;
	currency: string;
	confidenceScore: number;
	riskFactors: string[];
	recommendation: "SIGN" | "REJECT" | "REVIEW";
	timestamp: string;
	advancedAnalysis: {
		behavioralScore: number;
		metadataScore: number;
		historicalScore: number;
		simulationScore: number;
		profileScore: number;
	};
}

interface RiskProfile {
	factor: string;
	impact: number;
	description: string;
}

// Define types matching the actual XRPL response structures
interface XrplAmount {
	currency?: string;
	issuer?: string;
	value?: string;
}

interface XrplTxData {
	Account?: string;
	Destination?: string;
	Amount?: string | XrplAmount;
	TransactionType?: string;
	date?: number;
	Fee?: string;
	Flags?: number;
	Memos?: Array<{
		Memo?: {
			MemoData?: string;
			MemoType?: string;
			MemoFormat?: string;
		}
	}>;
	DestinationTag?: number;
	SourceTag?: number;
	[key: string]: any; // For other possible fields
}

interface XrplTransaction {
	meta?: {
		TransactionResult?: string;
		[key: string]: any;
	};
	tx?: XrplTxData;
	validated?: boolean;
	ledger_index?: number;
	[key: string]: any; // For other possible fields
}

/**
 * Check if a string value matches a specific value, handling empty strings and type issues
 * @param value The value to check
 * @param expected The expected value
 * @returns True if the values match
 */
function stringMatches(value: any, expected: string): boolean {
	if (value === null || value === undefined) return false;
	return String(value) === expected;
}

/**
 * Safely extracts a property value from an object, providing a default if not found
 * @param obj Object to extract from
 * @param path Path to the property (e.g., "tx.date")
 * @param defaultValue Default value if property doesn't exist
 */
function safeGet<T>(obj: any, path: string, defaultValue: T): T {
	try {
		const parts = path.split('.');
		let current = obj;
		
		for (const part of parts) {
			if (current === null || current === undefined || typeof current !== 'object') {
				return defaultValue;
			}
			current = current[part];
		}
		
		return current !== undefined && current !== null ? current as T : defaultValue;
	} catch (err) {
		return defaultValue;
	}
}

/**
 * Service to analyze an XRP transaction and determine its legitimacy
 * @param transactionId The transaction ID to analyze
 * @returns Transaction analysis with confidence score and recommendation
 */
export async function analyseTransactionService(
	transactionId: string
): Promise<TransactionAnalysisResult> {
	try {
		console.log(`Analysing transaction: ${transactionId}`);
		const client = await xrplClient.getClient();

		// Get transaction details
		const txResponse = await client.request({
				command: "tx",
				transaction: transactionId
		});

		if (!txResponse.result) {
				throw new Error("Transaction not found");
		}

		const tx = txResponse.result as any;
		// Access tx_json if it exists, otherwise use tx directly
		const txData = safeGet(tx, 'tx_json', tx) as XrplTxData;
		const transactionType = safeGet(txData, 'TransactionType', '');
		
		// Use helper function to safely compare strings
		if (!stringMatches(transactionType, "Payment")) {
				throw new Error("The transaction is not a payment");
		}
		
		// Extract important information with safe getters
		const senderAddress = safeGet(txData, 'Account', '') as string;
		const recipientAddress = safeGet(txData, 'Destination', '') as string;
		
		if (!senderAddress || !recipientAddress) {
				throw new Error("Invalid transaction: missing sender or recipient address");
		}
		
		// Handle amount, which can be a string or an object
		let amount = "0";
		let currency = "XRP";
		
		// Utiliser la même approche que getTransactionService.ts
		// D'abord, vérifier si nous avons delivered_amount dans meta
		const deliveredAmount = safeGet(tx, 'meta.delivered_amount', null);
		const deliverMax = safeGet(txData, 'DeliverMax', null);
		
		console.log("Transaction raw data check:", {
			txId: transactionId,
			hasAmount: txData.Amount !== undefined,
			rawAmount: txData.Amount,
			hasDeliveredAmount: deliveredAmount !== null,
			deliveredAmount,
			hasDeliverMax: deliverMax !== null,
			deliverMax,
			txJson: txData
		});
		
		if (deliveredAmount) {
			// Conversion depuis delivered_amount
			if (typeof deliveredAmount === 'string') {
				try {
					amount = dropsToXrp(deliveredAmount).toString();
				} catch (e) {
					console.warn("Error converting delivered_amount to XRP:", e);
				}
			} else if (deliveredAmount && typeof deliveredAmount === 'object') {
				amount = safeGet(deliveredAmount, 'value', '0');
				currency = safeGet(deliveredAmount, 'currency', 'XRP');
			}
		} else if (deliverMax) {
			// Utiliser DeliverMax comme fallback
			if (typeof deliverMax === 'string') {
				try {
					amount = dropsToXrp(deliverMax).toString();
				} catch (e) {
					console.warn("Error converting DeliverMax to XRP:", e);
				}
			} else if (deliverMax && typeof deliverMax === 'object') {
				amount = safeGet(deliverMax, 'value', '0');
				currency = safeGet(deliverMax, 'currency', 'XRP');
			}
		} else if (txData.Amount) {
			// Utiliser Amount comme dernière option
			const amountField = txData.Amount;
			if (typeof amountField === 'string') {
				try {
					amount = dropsToXrp(amountField).toString();
				} catch (e) {
					console.warn("Error converting Amount to XRP:", e);
				}
			} else if (amountField && typeof amountField === 'object') {
				amount = safeGet(amountField, 'value', '0');
				currency = safeGet(amountField, 'currency', 'XRP');
			}
		}
		
		// Convert string amount to float for calculations
		const amountValue = parseFloat(amount) || 0;
		
		// Ajoutons un log pour débugger
		console.log(`Transaction amount parsed: ${amount} ${currency} (parsed value: ${amountValue})`);
		
		// Analyze sender account
		const senderInfo = await client.request({
				command: "account_info",
				account: senderAddress
		});

		if (!safeGet(senderInfo, 'result.account_data', null)) {
				throw new Error("Could not retrieve sender account information");
		}

		// Get transaction history (more transactions for better analysis)
		const senderHistory = await client.request({
				command: "account_tx",
				account: senderAddress,
				limit: 50 // Increased from 20 to 50 for better pattern detection
		});

		// Get recipient history for relationship analysis
		const recipientHistory = await client.request({
				command: "account_tx",
				account: recipientAddress,
				limit: 30
		});

		// Initialize risk profiles
		const behavioralRisks: RiskProfile[] = [];
		const metadataRisks: RiskProfile[] = [];
		const historicalRisks: RiskProfile[] = [];
		const simulationRisks: RiskProfile[] = [];
		const profileRisks: RiskProfile[] = [];

		// Track individual scoring components
		let behavioralScore = 100;
		let metadataScore = 100;
		let historicalScore = 100;
		let simulationScore = 100;
		let profileScore = 100;

		// Initialize global confidence score and risk factors
		let confidenceScore = 100;
		let riskFactors: string[] = [];

		// ===== 1. BASIC ANALYSIS (from original implementation) =====
		
		// 1.1 Check account age based on ledger sequence
		const accountCreationLedger = safeGet(senderInfo, 'result.account_data.Sequence', 0) as number;
		const currentLedger = safeGet(tx, 'ledger_index', 0) as number;
		const isNewAccount = accountCreationLedger > 0 && (currentLedger - accountCreationLedger < 1000);
		
		if (isNewAccount) {
				profileScore -= 20;
				profileRisks.push({
						factor: "New account",
						impact: 20,
						description: "Sender account created recently"
				});
		}

		// 1.2 Check transaction amount
		if (amountValue > 1000) {
				profileScore -= 80;
				profileRisks.push({
						factor: "High amount",
						impact: 80,
						description: "High transaction amount"
				});
		}

		// 1.3 Check transaction history length
		const transactions = safeGet(senderHistory, 'result.transactions', []) as XrplTransaction[];
		const transactionCount = transactions.length;
		if (transactionCount < 5) {
				profileScore -= 10;
				profileRisks.push({
						factor: "Limited history",
						impact: 10,
						description: "Limited transaction history"
				});
		}


		// 1.5 Check if transaction has destination tags
		// Ne considérer l'absence de tag que pour les transactions importantes
		if (!safeGet(txData, 'DestinationTag', null) && amountValue > 40) {
				metadataScore -= 100; // Impact réduit
				metadataRisks.push({
						factor: "No tag",
						impact: 100,
						description: "No destination tag on a high-value transaction"
				});
		}

		// ===== 2. BEHAVIOR ANALYSIS =====
		
		// 2.1 Detect rapid/unusual transaction patterns
		if (transactions.length > 3) {
				try {
						// Sort transactions by date, with additional error checking
						const sortedTxs = [...transactions].sort((a, b) => {
								const dateA = safeGet(a, 'tx.date', 0);
								const dateB = safeGet(b, 'tx.date', 0);
								return dateA - dateB;
						});
						
						// Look for rapid transaction patterns (less than 2 minutes between multiple transactions)
						let rapidTransactionCount = 0;
						for (let i = 1; i < sortedTxs.length; i++) {
								const prevTx = sortedTxs[i-1];
								const currentTx = sortedTxs[i];
								
								const prevDate = safeGet(prevTx, 'tx.date', 0);
								const currentDate = safeGet(currentTx, 'tx.date', 0);
								
								if (prevDate > 0 && currentDate > 0 && (currentDate - prevDate < 120)) { // Less than 2 minutes
										rapidTransactionCount++;
								}
						}
						
						if (rapidTransactionCount >= 3) {
								behavioralScore -= 20;
								behavioralRisks.push({
										factor: "Rapid transactions",
										impact: 20,
										description: "Rapid transaction pattern detected"
								});
						}
				} catch (error) {
						console.warn("Error during rapid transaction analysis:", error);
				}
		}
		
		// 2.2 Check for unusual amount patterns
		if (transactions.length > 5) {
				try {
						// Get average transaction amount
						let totalAmount = 0;
						let paymentCount = 0;
						
						for (const txItem of transactions) {
								const txDetail = safeGet(txItem, 'tx', {}) as XrplTxData;
								const txType = safeGet(txDetail, 'TransactionType', '');
								const txAmount = safeGet(txDetail, 'Amount', '');
								
								// Use helper function to safely compare strings
								if (stringMatches(txType, 'Payment') && typeof txAmount === 'string') {
										const amountInXrp = parseInt(txAmount, 10) / 1000000;
										if (!isNaN(amountInXrp)) {
												totalAmount += amountInXrp;
												paymentCount++;
										}
								}
						}
						
						const averageAmount = paymentCount > 0 ? totalAmount / paymentCount : 0;
						
						// Check if current transaction amount is significantly higher than average
						if (averageAmount > 0 && amountValue > averageAmount * 5) {
								behavioralScore -= 15;
								behavioralRisks.push({
										factor: "Unusual amount",
										impact: 15,
										description: "Transaction amount significantly higher than usual"
								});
						}
				} catch (error) {
						console.warn("Error during amount pattern analysis:", error);
				}
		}
		
		// 2.3 Detect repetitive transaction patterns to varied destinations
		try {
				const recentDestinations = new Set<string>();
				const recentTxs = transactions.slice(0, Math.min(10, transactions.length));
				
				for (const txItem of recentTxs) {
						const txDetail = safeGet(txItem, 'tx', {}) as XrplTxData;
						const txType = safeGet(txDetail, 'TransactionType', '');
						const destination = safeGet(txDetail, 'Destination', '');
						
						// Use helper function to safely compare strings
						if (stringMatches(txType, 'Payment') && destination) {
								recentDestinations.add(destination);
						}
				}
				
				if (recentDestinations.size > 7) { // Many different destinations in recent history
						behavioralScore -= 10;
						behavioralRisks.push({
								factor: "Multiple destinations",
								impact: 10,
								description: "Multiple different destinations in recent transaction history"
						});
				}
		} catch (error) {
				console.warn("Error during destination pattern analysis:", error);
		}

		// ===== 3. METADATA ANALYSIS =====
		
		// 3.1 Check for suspicious memos
		try {
				const memos = safeGet(txData, 'Memos', []);
				const suspiciousKeywords = [
						"reward", "investment", "return", "profit", "bonus", "free", 
						"roi", "double", "multiply", "guaranteed", "scam", "urgent", 
						"ico", "token", "airdrop", "lottery", "winner", "claim"
				];
				
				for (const memo of memos) {
						const memoData = safeGet<string>(memo, 'Memo.MemoData', '');
						if (memoData) {
								try {
										// Try to convert hex data to string
										let memoText = '';
										
										// Convert hex to string if it looks like hex
										if (/^[0-9A-F]+$/i.test(memoData)) {
												memoText = Buffer.from(memoData, 'hex').toString('utf8').toLowerCase();
										} else {
												memoText = memoData.toLowerCase();
										}
												
										// Check for suspicious keywords
										for (const keyword of suspiciousKeywords) {
												if (memoText.includes(keyword)) {
														metadataScore -= 15;
														metadataRisks.push({
																factor: "Suspicious memo",
																impact: 15,
																description: `Suspicious memo detected (contains '${keyword}')`
														});
														break;
												}
										}
								} catch (e) {
										// Ignore memo parsing errors
								}
						}
				}
		} catch (error) {
				console.warn("Error during memo analysis:", error);
		}
		
		// 3.2 Check for unusual or missing tags
		const destTag = safeGet(txData, 'DestinationTag', null);
		if (destTag !== null) {
				// Check if destination tag is suspiciously high or low
				if (destTag === 1 || destTag === 0 || destTag > 999999999) {
						metadataScore -= 10;
						metadataRisks.push({
								factor: "Unusual tag",
								impact: 10,
								description: "Unusual destination tag value"
						});
				}
		}
		
		// 3.3 Check for source tag
		// Ne pas considérer l'absence de source tag comme un risque significatif
		if (!safeGet(txData, 'SourceTag', null) && amountValue > 100) {
				metadataScore -= 2; // Impact très réduit
				metadataRisks.push({
						factor: "No source tag",
						impact: 2,
						description: "No source tag on a high-value transaction"
				});
		}

		// ===== 4. HISTORICAL INTERACTION ANALYSIS =====
		
		// 4.1 Check previous interactions with recipient
		try {
				// Filter transactions where recipient matches
				const previousInteractions = transactions.filter(txItem => {
						const destination = safeGet(txItem, 'tx.Destination', '');
						return destination === recipientAddress;
				});
				
				// First-time interaction check - seulement pour les montants importants
				if (previousInteractions.length === 0 && amountValue > 100) {
						historicalScore -= 50; // Impact réduit
						historicalRisks.push({
								factor: "First interaction",
								impact: 50,
								description: "First-time interaction"
						});
				} else if (previousInteractions.length === 0) {
						// Pour les petits montants, réduire encore plus l'impact
						historicalScore -= 3;
						// Ne pas ajouter aux facteurs de risque visibles
				} else {
						// 4.2 Check consistency with previous transactions to this recipient
						let prevTotalAmount = 0;
						let validAmountCount = 0;
						
						for (const txItem of previousInteractions) {
								const txAmount = safeGet(txItem, 'tx.Amount', '');
								if (typeof txAmount === 'string') {
										const amountInXrp = parseInt(txAmount, 10) / 1000000;
										if (!isNaN(amountInXrp)) {
												prevTotalAmount += amountInXrp;
												validAmountCount++;
										}
								}
						}
						
						if (validAmountCount > 0) {
								const avgPrevAmount = prevTotalAmount / validAmountCount;
								
								// Check if current amount is significantly different from previous transactions
								if (amountValue > avgPrevAmount * 3) {
										historicalScore -= 15;
										historicalRisks.push({
												factor: "Unusual amount pattern",
												impact: 15,
												description: "Transaction amount significantly different from previous interactions"
										});
								}
						}
				}
		} catch (error) {
				console.warn("Error during historical interaction analysis:", error);
		}
		
		// 4.3 Check if recipient has sent funds back in the past (two-way relationship)
		try {
				const recipientTxs = safeGet(recipientHistory, 'result.transactions', []) as XrplTransaction[];
				const hasTwoWayRelationship = recipientTxs.some(txItem => {
						const txType = safeGet(txItem, 'tx.TransactionType', '');
						const destination = safeGet(txItem, 'tx.Destination', '');
						// Use helper function to safely compare strings
						return stringMatches(txType, 'Payment') && destination === senderAddress;
				});
				
				if (!hasTwoWayRelationship && transactions.some(tx => safeGet(tx, 'tx.Destination', '') === recipientAddress)) {
						historicalScore -= 5;
						historicalRisks.push({
								factor: "One-way relationship",
								impact: 5,
								description: "Recipient has never sent funds back to sender"
						});
				}
		} catch (error) {
				console.warn("Error during two-way relationship analysis:", error);
		}

		// ===== 5. TRANSACTION SIMULATION & IMPACT ANALYSIS =====
		
		// 5.1 Check impact on sender's balance
		try {
				const rawBalance = safeGet(senderInfo, 'result.account_data.Balance', '0');
				const currentBalance = typeof rawBalance === 'string' ? 
					parseInt(rawBalance, 10) / 1000000 : 0;
				const reserveRequirement = 10; // Base reserve in XRP
				const remainingBalance = currentBalance - amountValue;
				
				// Logging for debugging
				console.log(`Balance check: current=${currentBalance}, amount=${amountValue}, remaining=${remainingBalance}`);
				
				// Check if transaction would leave account close to reserve requirement
				if (remainingBalance < reserveRequirement * 2) {
						simulationScore -= 20;
						simulationRisks.push({
								factor: "Low remaining balance",
								impact: 20,
								description: "Transaction would leave account with low reserve"
						});
				}
				
				// 5.2 Check if transaction is a significant portion of total balance
				if (currentBalance > 0) {
						const balancePercentage = (amountValue / currentBalance) * 100;
						if (balancePercentage > 90) {
								simulationScore -= 60;
								simulationRisks.push({
										factor: "High balance percentage with a new sender",
										impact: 60,
										description: "Transaction represents over 70% of account balance"
								});
						} else if (balancePercentage > 95) {
								simulationScore -= 100;
								simulationRisks.push({
										factor: "Significant balance percentage",
										impact: 100,
										description: "Transaction represents over 50% of account balance"
								});
						}
				}
		} catch (error) {
				console.warn("Error during balance impact analysis:", error);
		}
		
		// 5.3 Check transaction fee relative to transaction size
		try {
				const transactionFee = parseInt(safeGet(tx, 'Fee', '0')) / 1000000;
				if (transactionFee > 0.01 && amountValue > 0 && transactionFee > amountValue * 0.05) {
						// Fee is more than 5% of transaction amount and higher than 0.01 XRP
						simulationScore -= 10;
						simulationRisks.push({
								factor: "High fee ratio",
								impact: 10,
								description: "Transaction fee is unusually high relative to amount"
						});
				}
		} catch (error) {
				console.warn("Error during fee analysis:", error);
		}

		// ===== 6. ACCOUNT PROFILING & ADVANCED SCORING =====
		
		// 6.1 Check account flags and settings
		try {
				const accountFlags = safeGet(senderInfo, 'result.account_data.Flags', 0) as number;
				
				// Check if account has required destination tags flag
				if ((accountFlags & 0x00020000) !== 0) {
						// Account requires destination tags but transaction doesn't have one
						if (!safeGet(txData, 'DestinationTag', null)) {
								profileScore -= 25;
								profileRisks.push({
										factor: "Missing required tag",
										impact: 25,
										description: "Recipient requires destination tags but none provided"
								});
						}
				}
		} catch (error) {
				console.warn("Error during account flags analysis:", error);
		}
		
		// 6.2 Check account domain verification
		if (safeGet(senderInfo, 'result.account_data.Domain', null)) {
				// Account has a domain, which is a good sign
				profileScore += 10;
				// Cap at 100
				profileScore = Math.min(100, profileScore);
		}
		
		// 6.3 Check for account transaction frequency patterns
		try {
				const dayInSeconds = 24 * 60 * 60;
				const now = Math.floor(Date.now() / 1000);
				let recentTxCount = 0;
				
				for (const txItem of transactions) {
						const txTime = safeGet(txItem, 'tx.date', 0) as number;
						
						if (txTime > 0 && now - txTime < dayInSeconds) {
								recentTxCount++;
						}
				}
				
				// If this account suddenly has high activity
				if (recentTxCount > 15 && transactions.length > 0) {
						const txsPerDay = recentTxCount;
						// Calculate historical daily average excluding today
						const olderTxs = transactions.length - recentTxCount;
						// Assuming we have data for at least 7 days
						const historicalAvgPerDay = olderTxs / 7;
						
						if (txsPerDay > historicalAvgPerDay * 3) {
								profileScore -= 15;
								profileRisks.push({
										factor: "Activity spike", 
										impact: 15,
										description: "Account activity significantly higher than usual"
								});
						}
				}
		} catch (error) {
				console.warn("Error during activity pattern analysis:", error);
		}

		// ===== CALCULATE FINAL CONFIDENCE SCORE =====
		
		// Ajuster le score en fonction du montant de la transaction
		// Pour les petites transactions, nous sommes plus tolérants
		let amountBasedBonus = 0;
		if (amountValue < 20) {
				amountBasedBonus = 10; // +10 points pour les très petites transactions
		} else if (amountValue < 50) {
				amountBasedBonus = 5;  // +5 points pour les petites transactions
		}

		// Calculate weighted confidence score from all components avec bonus pour petites transactions
		confidenceScore = Math.round(
				(profileScore * 0.20) +        // 20% weight for profile score
				(behavioralScore * 0.25) +     // 25% weight for behavioral analysis
				(metadataScore * 0.15) +       // 15% weight for metadata analysis
				(historicalScore * 0.20) +     // 20% weight for historical interaction
				(simulationScore * 0.20) +     // 20% weight for simulation & impact
				amountBasedBonus               // Bonus pour petites transactions
		);

		// Filtrer les facteurs de risque moins significatifs en fonction du score final
		// N'afficher que les risques réellement importants
		if (confidenceScore > 85) {
				// Pour les transactions à faible risque, ne montrer que les facteurs de risque importants
				const significantRisks = [];
				for (const risk of [...behavioralRisks, ...metadataRisks, ...historicalRisks, ...simulationRisks, ...profileRisks]) {
						// Ne garder que les risques avec impact >= 10
						if (risk.impact >= 10) {
								significantRisks.push(risk.description);
						}
				}
				riskFactors = significantRisks;
		} else {
				// Pour les transactions à risque plus élevé, afficher tous les facteurs
				for (const risk of [...behavioralRisks, ...metadataRisks, ...historicalRisks, ...simulationRisks, ...profileRisks]) {
						riskFactors.push(risk.description);
				}
		}
		
		// Determine recommendation
		let recommendation: "SIGN" | "REJECT" | "REVIEW";
		if (confidenceScore >= 80) {
				recommendation = "SIGN";
		} else if (confidenceScore < 50) {
				recommendation = "REJECT";
		} else {
				recommendation = "REVIEW";
		}

		// Normalize score between 0 and 100
		confidenceScore = Math.max(0, Math.min(100, confidenceScore));
		behavioralScore = Math.max(0, Math.min(100, behavioralScore));
		metadataScore = Math.max(0, Math.min(100, metadataScore));
		historicalScore = Math.max(0, Math.min(100, historicalScore));
		simulationScore = Math.max(0, Math.min(100, simulationScore));
		profileScore = Math.max(0, Math.min(100, profileScore));

		const analysisResult: TransactionAnalysisResult = {
				txId: transactionId,
				senderAddress,
				recipientAddress,
				amount,
				currency,
				confidenceScore,
				riskFactors,
				recommendation,
				timestamp: new Date().toISOString(),
				advancedAnalysis: {
						behavioralScore,
						metadataScore,
						historicalScore,
						simulationScore,
						profileScore
				}
		};

		console.log("Transaction analysis complete:", JSON.stringify(analysisResult, null, 2));
		return analysisResult;

	} catch (error) {
		console.error("Error analyzing transaction:", error);
				throw error;
		}
}