/**
 * Smoke test for LombardActionProvider with AgentKit.
 *
 * Creates a ViemWalletProvider on Sepolia, registers the Lombard provider,
 * and exercises read-only actions against real infrastructure.
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts
 */
import "reflect-metadata";

import { AgentKit, ViemWalletProvider } from "@coinbase/agentkit";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// Import from built dist to get proper decorator metadata
import { lombardActionProvider } from "../dist/index.js";

// Read test private key from environment - no real funds required for read operations
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY;
if (!TEST_PRIVATE_KEY) {
  console.error("Set TEST_PRIVATE_KEY env var to run smoke test");
  process.exit(1);
}

async function main() {
  console.log("=== Lombard AgentKit Smoke Test ===\n");

  // 1. Create a viem wallet client on Sepolia
  const account = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  });

  console.log(`Wallet address: ${account.address}`);
  console.log(`Network: ethereum-sepolia (chainId ${sepolia.id})\n`);

  // 2. Create ViemWalletProvider and AgentKit with our provider
  const walletProvider = new ViemWalletProvider(walletClient);
  const agentkit = await AgentKit.from({
    walletProvider,
    actionProviders: [lombardActionProvider()],
  });

  // 3. List all registered actions
  const actions = agentkit.getActions();
  console.log(`Registered ${actions.length} actions:`);
  for (const action of actions) {
    console.log(`  - ${action.name}`);
  }
  console.log();

  // 4. Verify our 10 actions are all present
  const lombardActions = [
    "stake_btcb_to_lbtc",
    "unstake_lbtc",
    "redeem_lbtc_to_btcb",
    "deploy_to_defi",
    "claim_deposit",
    "get_lbtc_balance",
    "get_btcb_balance",
    "get_lbtc_exchange_rate",
    "get_deposit_status",
    "get_unstake_status",
  ];

  // AgentKit prefixes action names with the provider class name
  const actionNames = new Set(actions.map((a) => a.name));
  const missing = lombardActions.filter(
    (name) =>
      !actionNames.has(name) &&
      !actionNames.has(`LombardActionProvider_${name}`),
  );
  if (missing.length > 0) {
    console.error(`FAIL: Missing actions: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("PASS: All 10 Lombard actions registered\n");

  // Helper to find actions by suffix
  const findAction = (name: string) =>
    actions.find((a) => a.name === name || a.name.endsWith(`_${name}`))!;

  // 5. Call read-only actions
  console.log("--- Testing get_lbtc_exchange_rate ---");
  const rateAction = findAction("get_lbtc_exchange_rate");
  const rateResult = await rateAction.invoke({});
  const rateParsed = JSON.parse(rateResult);
  console.log(`  Result: ${JSON.stringify(rateParsed, null, 2)}`);
  if (!rateParsed.success) {
    console.error(`  FAIL: ${rateParsed.error}`);
  } else {
    console.log("  PASS\n");
  }

  console.log("--- Testing get_lbtc_balance ---");
  const balanceAction = findAction("get_lbtc_balance");
  const balanceResult = await balanceAction.invoke({});
  const balanceParsed = JSON.parse(balanceResult);
  console.log(`  Result: ${JSON.stringify(balanceParsed, null, 2)}`);
  if (!balanceParsed.success) {
    console.error(`  FAIL: ${balanceParsed.error}`);
  } else {
    console.log("  PASS\n");
  }

  console.log("--- Testing get_btcb_balance ---");
  const btcbAction = findAction("get_btcb_balance");
  const btcbResult = await btcbAction.invoke({});
  const btcbParsed = JSON.parse(btcbResult);
  console.log(`  Result: ${JSON.stringify(btcbParsed, null, 2)}`);
  if (!btcbParsed.success) {
    console.error(`  FAIL: ${btcbParsed.error}`);
  } else {
    console.log("  PASS\n");
  }

  console.log("--- Testing get_deposit_status ---");
  const depositAction = findAction("get_deposit_status");
  const depositResult = await depositAction.invoke({});
  const depositParsed = JSON.parse(depositResult);
  console.log(`  Result: ${JSON.stringify(depositParsed, null, 2)}`);
  if (!depositParsed.success) {
    console.error(`  FAIL: ${depositParsed.error}`);
  } else {
    console.log("  PASS\n");
  }

  console.log("--- Testing get_unstake_status ---");
  const unstakeAction = findAction("get_unstake_status");
  const unstakeResult = await unstakeAction.invoke({});
  const unstakeParsed = JSON.parse(unstakeResult);
  console.log(`  Result: ${JSON.stringify(unstakeParsed, null, 2)}`);
  if (!unstakeParsed.success) {
    console.error(`  FAIL: ${unstakeParsed.error}`);
  } else {
    console.log("  PASS\n");
  }

  console.log("=== Smoke test complete ===");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
