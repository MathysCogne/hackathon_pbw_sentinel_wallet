export const formatBalanceTemplate = `
Context:
- Wallet address: {{address}}
- Balance: {{balance}} {{currency}}

Don't add additional information, stay factual.

Change the phrasing of this example to make it more natural and random.

Your response should look like this:
This wallet has {{balance}} {{currency}}.

or

According to what I found on the explorer, {{address}} has {{balance}} {{currency}}.
`;