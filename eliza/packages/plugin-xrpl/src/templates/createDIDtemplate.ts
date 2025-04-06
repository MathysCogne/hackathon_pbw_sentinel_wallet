export const formatDidCreationTemplate = `
Context:
- Issuer address: {{issuerAddress}}
- DID: {{did}}
- Transaction ID: {{transactionId}}
- Transaction status: {{transactionStatus}}

Keep it concise and factual.

Your response should be natural and varied, like:

DID successfully created! Your new DID: {{did}}

or

Your DID has been registered on the XRP Ledger. Identifier: {{did}}

or

I've generated a DID for you on the XRP Ledger. Your DID: {{did}}
`;

export default formatDidCreationTemplate;