import { ActionExample } from "@elizaos/core";

export const createTaskExamples: ActionExample[][] = [
	[
		{
			user: "{{user1}}",
			content: { text: "Create task to pay 20 XRP to {recipientXrpAddress} every day" }
		},
		{
			user: "{{agent}}",
			content: { text: "I've set up a daily payment of 20 XRP to that address! It's all automated now. 🚀", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task for a recurring transfer of 50 XRP from {walletXrpAddress} to {recipientXrpAddress} every week" }
		},
		{
			user: "{{agent}}",
			content: { text: "Weekly payment of 50 XRP scheduled! I'll handle this automatically from now on. ⏰", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task for a monthly payment of 100 XRP to {recipientXrpAddress}" }
		},
		{
			user: "{{agent}}",
			content: { text: "Monthly payment of 100 XRP is now scheduled! I've got you covered. 💸", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task to send 100 XRP to {recipientXrpAddress} once" }
		},
		{
			user: "{{agent}}",
			content: { text: "I've created a one-time task to send 100 XRP. It will be executed once. 💫", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task for a one-time payment of 50 XRP to {recipientXrpAddress}" }
		},
		{
			user: "{{agent}}",
			content: { text: "Your one-time payment of 50 XRP has been scheduled! I'll handle it for you. 👍", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task to set up an escrow of 100 XRP to {recipientXrpAddress} for 3 days" }
		},
		{
			user: "{{agent}}",
			content: { text: "I've scheduled an escrow of 100 XRP that will last for 3 days. The funds will be locked until then. 🔒", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task for a recurring escrow of 50 XRP to {recipientXrpAddress} every month" }
		},
		{
			user: "{{agent}}",
			content: { text: "I've set up a monthly escrow of 50 XRP. Each escrow will be created automatically every month. 📆", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task to set up a secure escrow of 100 XRP to {recipientXrpAddress} with crypto condition" }
		},
		{
			user: "{{agent}}",
			content: { text: "I've scheduled a cryptographically secured escrow of 100 XRP. You'll need the fulfillment code to release the funds. Extra security for your transaction! 🔐", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task for an escrow of 200 XRP with password: 'hackathon2023'" }
		},
		{
			user: "{{agent}}",
			content: { text: "I've set up a password-protected escrow of 200 XRP. The funds can only be released with the password you provided. Your assets are secure! 🛡️", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task for a monthly escrow of 75 XRP with secret phrase: 'xrpl is the future'" }
		},
		{
			user: "{{agent}}",
			content: { text: "I've scheduled monthly cryptographically secured escrows of 75 XRP. Each escrow will require the secret phrase for release. Advanced security at your service! 🔒🔄", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task to mint an NFT with URI: https://example.com/nft123.json" }
		},
		{
			user: "{{agent}}",
			content: { text: "I've scheduled an NFT minting task with your URI. Your NFT will be created soon! 🎨", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task to mint a non-transferable NFT with URI: ipfs://Qm123456789" }
		},
		{
			user: "{{agent}}",
			content: { text: "I've set up a task to mint a non-transferable NFT with your IPFS URI. It will be created shortly! 🖼️", action: "CREATE_TASK" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create task for weekly NFT minting with URI: https://metadata.example.com/series/" }
		},
		{
			user: "{{agent}}",
			content: { text: "I've scheduled weekly NFT minting with your URI. A new NFT will be created every week! 🚀", action: "CREATE_TASK" }
		}
	]
];