#!/bin/sh
# docker/deploy_contract.sh
# ─────────────────────────────────────────────────────────────────────────────
# Waits for the Hardhat node to be ready, deploys FireInsurance.sol,
# and writes the deployed address back to /app/.env so the backend picks it up.
# ─────────────────────────────────────────────────────────────────────────────

set -e

HARDHAT_URL="${WEB3_RPC_URL:-http://hardhat-node:8545}"
MAX_WAIT=60
WAITED=0

echo "⏳  Waiting for Hardhat node at $HARDHAT_URL ..."
until curl -sf -X POST "$HARDHAT_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        > /dev/null 2>&1; do
    if [ "$WAITED" -ge "$MAX_WAIT" ]; then
        echo "❌  Hardhat node did not become ready within ${MAX_WAIT}s. Aborting."
        exit 1
    fi
    echo "   ... still waiting (${WAITED}s)"
    sleep 3
    WAITED=$((WAITED + 3))
done

echo "✅  Hardhat node is up. Deploying FireInsurance contract..."

# Run the Hardhat deploy script and capture output
DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy_fire_contract.js --network local 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract the deployed contract address from output line:
#   "✅ FireInsurance deployed to: 0x..."
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '(?<=deployed to: )0x[0-9a-fA-F]+')

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌  Could not extract contract address from deploy output."
    exit 1
fi

echo "📝  Contract address: $CONTRACT_ADDRESS"

# Write/update FI_CONTRACT_ADDRESS in the .env file
ENV_FILE="/app/.env"
if grep -q "^FI_CONTRACT_ADDRESS=" "$ENV_FILE" 2>/dev/null; then
    # Replace existing line (portable sed)
    sed -i "s|^FI_CONTRACT_ADDRESS=.*|FI_CONTRACT_ADDRESS=$CONTRACT_ADDRESS|" "$ENV_FILE"
else
    echo "FI_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> "$ENV_FILE"
fi

echo "✅  FI_CONTRACT_ADDRESS written to $ENV_FILE"
echo "🎉  Contract deployment complete."
