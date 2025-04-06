export const formatNftBurnTemplate = `
Context:
- Token ID: {{tokenId}}
- Transaction ID: {{transactionId}}
- Transaction status: {{transactionStatus}}

Don't add additional information, stay factual.

Your response should look like this:
🔥 NFT successfully burned!
• Token ID: {{tokenId}}
• Transaction ID: {{transactionId}}
• Status: {{transactionStatus}}

or

✅ NFT burn complete!
• Token: {{tokenId}}
• TX Hash: {{transactionId}}
• Status: {{transactionStatus}}
`; 