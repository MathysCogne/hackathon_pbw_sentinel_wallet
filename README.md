# SENTINEL WALLET - PBW HACK


🚀 Core Features:

🧠 AI Chatbot Interface
A natural-language interface that allows users to manage their wallet, sign transactions, and get explanations using a conversational AI agent powered by ElizaOS.

📋 Task Manager
Users can schedule and automate transactions based on conditions like:

Delayed or recurring transfers

Triggers based on balance or on-chain activity

Smart conditional tasks (e.g. "send X if Y is true")

👁️ Sentinel Mode
A real-time AI-based transaction analysis system that:

Scores each transaction for trust and risk

Flags suspicious activity

Recommends to SIGN, REVIEW or REJECT

Optionally auto-approves low-risk tasks and auto-rejects threats

🔐 Multisignature by AI
AI acts as a co-signer, helping validate and approve secure transactions only when the confidence level is high, with human override options.


### / Environment

```bash
Please copy and fill our variables in back, eliza and front
```


### / Back

Worker for sentinel feature (Task manager and sentinel)

```bash
pnpm install
pnpm dev
```

### / Front

NextApp

```bash
pnpm install
pnpm dev
```

### / Eliza 

Agent IA

```bash
pnpm install --no-frozen-lockfile
pnpm build
SERVER_PORT=3020 pnpm start --characters="characters/sentinel.character.json"
```