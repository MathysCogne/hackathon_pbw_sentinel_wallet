import { ActionExample } from "@elizaos/core";

export const sendTransactionExamples: ActionExample[][] = [
	[
		{
			user: "{{user1}}",
			content: { text: "Send 20 XRP to {recipientXrpAddress}" }
		},
		{
			user: "{{agent}}",
			content: { text: "To infinity and beyond ! Transfer 20 XRP right away! 🚀", action: "SEND_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Send 20 XRP from {walletXrpAddress} to {recipientXrpAddress}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll take care of that 20 XRP transfer right away! 🚀", action: "SEND_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Can you transfer 50 XRP to {recipientXrpAddress} from {walletXrpAddress}?" }
		},
		{
			user: "{{agent}}",
			content: { text: "Of course, I'm preparing the 50 XRP transfer now! 💸", action: "SEND_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Make a transaction of 100 XRP from {walletXrpAddress} to {recipientXrpAddress} please" }
		},
		{
			user: "{{agent}}",
			content: { text: "Absolutely! I'm initiating the 100 XRP transaction now! 🔥", action: "SEND_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "I need to send 75 XRP to {recipientXrpAddress} from my wallet {walletXrpAddress}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll handle that right away! Sending those 75 XRP no problem! 😎", action: "SEND_TRANSACTION" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Can you make a transfer of 30 XRP to {recipientXrpAddress}?" }
		},
		{
			user: "{{agent}}",
			content: { text: "Let's do this 30 XRP transfer! I'm preparing it immediately! ⚡", action: "SEND_TRANSACTION" }
		}
	]
];