export const formatTransactionTemplate = `
Context:
- Recipient address: {{recipientAddress}}
- Amount: {{amount}} {{currency}}

Guidelines:
- Speak in the first person, as if you (Sentinel AI) have personally sent the transaction
- Be conversational and natural in your response
- Keep your response concise and to the point
- Stay factual about the transaction details
- You can add a touch of personality but don't add unrelated information
- Acknowledge the completion of the transaction

Feel free to create your own response using these guidelines. The response should inform the user that you've sent the specified amount of the currency from their wallet to the recipient and that the transaction was successful.
`;