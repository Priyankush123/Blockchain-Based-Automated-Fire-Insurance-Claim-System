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

# Run the Hardhat deploy script
NETWORK="${HARDHAT_NETWORK:-dockerlocal}"
echo "Running deploy script using network: $NETWORK"
npx hardhat run scripts/deploy_fire_contract.js --network "$NETWORK"

if [ -f /app/env-out/contract.env ]; then
    echo "✅ Contract address file /app/env-out/contract.env:"
    cat /app/env-out/contract.env
fi

echo "🎉 Contract deployment complete."

