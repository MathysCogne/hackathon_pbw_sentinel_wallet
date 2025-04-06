import { ActionExample } from "@elizaos/core";

export const getNftExamples: ActionExample[][] = [
	[
		{
			user: "{{user1}}",
			content: { text: "Show me the details of NFT {nftId}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll fetch the information for this specific NFT! 🔍", action: "GET_NFT" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "List all NFTs for {walletAddress}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll get all NFTs for this wallet! 🎨", action: "GET_NFT" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Show me the last {count} NFTs in my wallet" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll fetch your {count} most recent NFTs! 📋", action: "GET_NFT" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Get NFTs between {startDate} and {endDate} for {walletAddress}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll retrieve all NFTs between those dates! 📅", action: "GET_NFT" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "Show {count} NFTs from {walletAddress} before {endDate}" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll get the {count} NFTs before {endDate}! 🕒", action: "GET_NFT" }
		}
	],
	[
		{
			user: "{{user1}}",
			content: { text: "List my NFTs" }
		},
		{
			user: "{{agent}}",
			content: { text: "I'll show you all NFTs in your wallet! 🖼️", action: "GET_NFT" }
		}
	]
]; 