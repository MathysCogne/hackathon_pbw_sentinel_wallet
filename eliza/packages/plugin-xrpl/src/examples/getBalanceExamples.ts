import { ActionExample } from "@elizaos/core";

export const getBalanceExamples: ActionExample[][] = [
	[
		{
			user: "{{user1}}",
			content: { text: "What is my  wallet balance ?" }
		},
		{
			user: "{{agent}}",
			content: { text: "Yes buddy! I'll check what this wallet has in it! 🚀", action: "GET_BALANCE" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "How much XRP does {walletXrpAddress} have?" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll check that right away bro, let's see how much XRP is in there! 😎", action: "GET_BALANCE" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "What's the balance of {walletXrpAddress} please" }
		},
		{
			user: "{{agent}}",
			content: { text: "Absolutely! I'm taking a look at the XRP in this wallet, just a sec! 🔥", action: "GET_BALANCE" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "How much does this address {walletXrpAddress} have" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll check that for you, one moment! 🔍", action: "GET_BALANCE" }
		}
	]
];