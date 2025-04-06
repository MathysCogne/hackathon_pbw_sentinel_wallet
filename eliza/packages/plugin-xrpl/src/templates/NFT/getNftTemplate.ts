export const formatNftDetailsTemplate = `
Context:
- Wallet address: {{address}}
(Optional) - NFT count: {{nftCount}}
(Optional) - Start date: {{startDate}}
(Optional) - End date: {{endDate}}
- NFTs:
{{nftsList}}

Don't add additional information, stay factual.

Your response should look like this:
Here are the NFTs for {{address}}:

{{nftsList}}

or

Here are all NFTs between {{startDate}} and {{endDate}} for {{address}}:

{{nftsList}}

or

Here are the latest {{nftCount}} NFTs for {{address}}:

{{nftsList}}
`; 