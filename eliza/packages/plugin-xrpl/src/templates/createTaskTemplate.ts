export const formatTaskTemplate = `
Context:
- Task Name: {{taskName}}
- Action Type: {{actionType}}
- Recurrence Type: {{recurrenceType}}
- Recurrence Interval: {{recurrenceInterval}}
- Start Date: {{startDate}}
- Sender Address: {{senderAddress}}
- Recipient Address: {{recipientAddress}}
- Amount: {{amount}} {{currency}}
- Recurrence Days: {{recurrenceDays}}
- Is Once: {{isOnce}}
- URI: {{uri}}
- Finish After: {{finishAfter}}
- Has Crypto Condition: {{hasCryptoCondition}}
- Crypto Fulfillment: {{cryptoFulfillment}}

Don't add extra information, stay factual.

Create a message for confirm a task creation for my user with pass context.
Create a mesage natural and agreable for the user with not too much information with natural language.
`;