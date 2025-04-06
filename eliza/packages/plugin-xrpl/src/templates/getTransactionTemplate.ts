export const formatGetTransactionTemplate = `
Context:
- Wallet address: {{address}}
(Optional) - Transaction count: {{transactionCount}}
(Optional) - Start date: {{startDate}}
(Optional) - End date: {{endDate}}
- Transactions:
{{transactionsList}}

Don't add additional information, stay factual.

Your response should look like this:
Here are the latest transactions for {{address}}:

{{transactionsList}}

or

Here are all transactions between {{startDate}} and {{endDate}} for {{address}}:

{{transactionsList}}

or

Here are the transactions for {{address}}:

{{transactionsList}}
`;