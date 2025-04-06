export const formatNftCreationTemplate = `
Context:
- Issuer address: {{issuerAddress}}
- Token URI: {{tokenURI}}
- Token ID: {{tokenId}}
- Transaction ID: {{transactionId}}
- Transaction status: {{transactionStatus}}
- Transfer fee: {{transferFee}}%
- Is burnable: {{isBurnable}}
- Is transferable: {{isTransferable}}

Don't add extra information, stay factual.

Change the phrasing of this example to make it more natural and random.

Your response should look like this:
NFT created successfully!

`;