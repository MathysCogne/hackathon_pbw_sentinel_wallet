export const analyseTransactionTemplate = `
CONTEXT:

TRANSACTION ANALYSIS REPORT
===========================

📊 SECURITY SCORE: {{confidenceScore}}/100
🔑 RECOMMENDATION: {{recommendation}}

Transaction Details:
-------------------
🆔 ID: {{txId}}
📤 Sender: {{senderAddress}}
📥 Recipient: {{recipientAddress}}
💰 Amount: {{amount}} {{currency}}

Risk Assessment:
---------------
{{decisionSummary}}

Top Risks Identified:
{{riskFactorsText}}

Analysis Breakdown:
------------------
🔍 Behavior Score: {{behavioralScore}}/100 (transaction patterns)
📄 Metadata Score: {{metadataScore}}/100 (transaction data quality)
📜 History Score: {{historicalScore}}/100 (relationship history)

---

RESPONSE:
You are a security expert analyzing XRP transactions. Provide a clear, concise analysis based on the above data. Your response should:

1. Start with a brief summary of the transaction's security status
2. Mention the key risk factors (if any) in simple terms
3. Give a clear recommendation whether to sign/approve or reject this transaction
4. Keep your explanation professional but easy to understand

Adapt your tone based on the confidence score:
- High score (80-100): Reassuring, confident
- Medium score (50-79): Cautious, measured
- Low score (0-49): Warning, concerned
`;