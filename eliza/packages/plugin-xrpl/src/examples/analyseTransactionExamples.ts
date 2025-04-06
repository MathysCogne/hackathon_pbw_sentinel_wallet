import { ActionExample } from "@elizaos/core";

export const analyseTransactionExamples: ActionExample[][] = [
	[
		{
			user: "{{user1}}",
			content: { text: "Analyze this transaction: {transactionId}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'm analyzing this transaction to verify its legitimacy. One moment...", action: "ANALYSE_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Should I sign transaction {transactionId}?" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll examine this transaction to give you advice. Let me check...", action: "ANALYSE_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Check if transaction {transactionId} is secure" }
		},
		{
			user: "{{agent}}",
			content: { text: "Security analysis in progress for this transaction. Please wait...", action: "ANALYSE_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Give me your opinion on transaction {transactionId}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll evaluate this transaction and give you my objective opinion. Analysis in progress...", action: "ANALYSE_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Calculate the confidence score for transaction {transactionId}" }
		},
		{
			user: "{{agent}}",
			content: { text: "Calculating confidence score now. Detecting potential risks...", action: "ANALYSE_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Analyze the risks of transaction with ID {transactionId}" }
		},
		{
			user: "{{agent}}",
			content: { text: "Risk factor analysis in progress for this transaction. One moment...", action: "ANALYSE_TRANSACTION" }
		}
	]
];