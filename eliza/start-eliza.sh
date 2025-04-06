#!/bin/bash

# Build ElizaOS
echo "Building ElizaOS..."
pnpm install --no-frozen-lockfile
pnpm build

# Start ElizaOS
echo "Starting Character..."
pnpm start --characters="characters/xrpl.character.json"
