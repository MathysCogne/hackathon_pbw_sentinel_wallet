import { ActionExample } from "@elizaos/core";

export const createDidExamples: ActionExample[][] = [
	[
		{
			user: "{{user1}}",
			content: { text: "Create a DID for me on the XRPL" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'm generating your Decentralized Identifier (DID) on the XRPL now! 🔐", action: "CREATE_DID" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Generate a DID linked to my wallet {walletXrpAddress}" }
		},
		{
			user: "{{agent}}",
			content: { text: "Generating a DID associated with your XRPL wallet now! 🔗", action: "CREATE_DID" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Register a decentralized identifier (DID) on XRPL with public key {publicKey}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'm registering your DID with the provided public key! 🔏", action: "CREATE_DID" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Can you set up a DID on XRPL with my wallet {walletXrpAddress} and associate it with my domain example.com?" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll create your DID and link it to your domain right away! 🌐", action: "CREATE_DID" }
		}
	]
];
