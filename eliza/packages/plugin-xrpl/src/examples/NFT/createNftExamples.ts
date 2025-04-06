import { ActionExample } from "@elizaos/core";

export const createNftExamples: ActionExample[][] = [
	[
		{
			user: "{{user1}}",
			content: { text: "Create an NFT with URI https://example.com/metadata.json" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll create that NFT for you right away! 🚀", action: "CREATE_NFT" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Create an NFT on {walletXrpAddress} with URI https://example.com/metadata.json" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll create that NFT for you right away! 🚀", action: "CREATE_NFT" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Mint a new NFT for me using {walletXrpAddress} and the metadata at https://ipfs.io/ipfs/QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX" }
		},
		{
			user: "{{agent}}",
			content: { text: "On it! I'm minting your NFT on the XRP Ledger now! 🎨", action: "CREATE_NFT" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Issue an NFT from my wallet {walletXrpAddress} with this URI: https://mysite.com/nft/123 and a 2% transfer fee" }
		},
		{
			user: "{{agent}}",
			content: { text: "Creating your NFT with a 2% transfer fee now! 💎", action: "CREATE_NFT" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Can you create a non-burnable NFT on {walletXrpAddress} with URI https://metadata.com/token1?" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll create that non-burnable NFT for you right now! 🔒", action: "CREATE_NFT" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Generate an NFT on {walletXrpAddress} with the URI https://art.com/collection/1 that's not transferable" }
		},
		{
			user: "{{agent}}",
			content: { text: "Creating your non-transferable NFT immediately! 🏆", action: "CREATE_NFT" }
		}
	]
];