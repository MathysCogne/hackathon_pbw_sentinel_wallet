import { ActionExample } from "@elizaos/core";

export const burnNftExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: { text: "Burn NFT with ID {tokenId}" }
        },
        {
            user: "{{agent}}",
            content: { text: "I'll burn this NFT right away! 🔥", action: "BURN_NFT" }
        }
    ],
    [
        {
            user: "{{user1}}",
            content: { text: "Can you burn my NFT {tokenId}?" }
        },
        {
            user: "{{agent}}",
            content: { text: "I'll help you burn this NFT. 🗑️", action: "BURN_NFT" }
        }
    ],
    [
        {
            user: "{{user1}}",
            content: { text: "Delete NFT {tokenId}" }
        },
        {
            user: "{{agent}}",
            content: { text: "I'll proceed with burning this NFT. ♨️", action: "BURN_NFT" }
        }
    ],
    [
        {
            user: "{{user1}}",
            content: { text: "Remove NFT {tokenId} from my wallet" }
        },
        {
            user: "{{agent}}",
            content: { text: "I'll remove this NFT by burning it. 🔥", action: "BURN_NFT" }
        }
    ]
]; 