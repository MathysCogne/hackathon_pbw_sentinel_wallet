import { ActionExample } from "@elizaos/core";

export const getTransactionExamples: ActionExample[][] = [
	[
		{
			user: "{{user1}}",
			content: { text: "Show me the last transactions" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll fetch the last transactions ! 🔍", action: "GET_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Show me the last {transactionCount} transactions for wallet {walletXrpAddress}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll fetch the last {transactionCount} transactions for this wallet! 🔍", action: "GET_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "What are the latest transactions for {walletXrpAddress}?" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll fetch the transaction history right away! 📊", action: "GET_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Can you show me all transactions for {walletXrpAddress} since {startDate}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll look up all transactions since {startDate} for this wallet. 🔎", action: "GET_TRANSACTION" }
		}
	],
	
	[
		{
			user: "{{user1}}",
			content: { text: "List {transactionCount} transactions for {walletXrpAddress} please" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll get {transactionCount} transactions for you right now! 📝", action: "GET_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Show transactions between {startDate} and {endDate} for {walletXrpAddress}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll retrieve all transactions between those dates! 📅", action: "GET_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Get me the transaction history for {walletXrpAddress} from last month" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll fetch the transactions from last month for you! 📆", action: "GET_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Show me the {transactionCount} most recent transactions for {walletXrpAddress} before {endDate}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll get the {transactionCount} most recent transactions before {endDate}! 🕒", action: "GET_TRANSACTION" }
		}
	]
];