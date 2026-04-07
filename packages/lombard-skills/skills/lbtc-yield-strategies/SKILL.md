---
name: lbtc-yield-strategies
description: Deploy LBTC into DeFi vaults for additional yield beyond base staking
read_when:
  - user wants to earn more yield on LBTC
  - user asks about DeFi vaults or strategies
  - user wants to deploy LBTC to Veda vault
  - user mentions yield optimization for Bitcoin
requires: []
metadata:
  emoji: "📈"
  sdkVersion: ">=4.4.0"
---

# LBTC Yield Strategies

LBTC earns base staking yield from Babylon, but you can earn additional DeFi yield by deploying LBTC into yield vaults. This skill covers discovering available strategies, checking APY/TVL, and deploying LBTC to vaults.

## Available Vaults

### Veda Vault

Veda is the primary yield vault for LBTC. It deploys LBTC into curated DeFi strategies to earn additional yield on top of the base Babylon staking rewards.

- **Chain**: Ethereum mainnet
- **Token**: LBTC
- **Yield**: Base staking yield + DeFi strategy yield
- **Risk**: Smart contract risk of the underlying strategies

## Checking Available Strategies

### Using Agent Tools

```typescript
import { getStrategies } from "@lombard.finance/sdk-agent";

const result = await getStrategies.execute({});
// Returns: {
//   strategies: [
//     {
//       vault: "Veda",
//       chain: "Ethereum",
//       apy: "4.52%",
//       tvlBtc: "1234.5678"
//     }
//   ]
// }
```

### Using the SDK Directly

```typescript
import { getVaultApy, getVaultTVL, Vault, Env } from "@lombard.finance/sdk";

// Get current APY data (returns historical array)
const apyData = await getVaultApy({ env: Env.prod, vaultKey: Vault.Veda });
const latestApy = apyData[apyData.length - 1];
console.log(`Current APY: ${latestApy.apy.toFixed(2)}%`);

// Get current TVL
const tvlData = await getVaultTVL({ env: Env.prod, vaultKey: Vault.Veda });
console.log(`TVL (BTC): ${tvlData.btcBalance.toFixed(4)}`);
```

## Deploying LBTC to a Vault

### Step 1: Approve LBTC Spending

Before depositing into a vault, you must approve the vault contract to spend your LBTC:

```typescript
import {
  getTokenContractInfo,
  Token,
  ChainId,
  Env,
} from "@lombard.finance/sdk";
import { createWalletClient, http, parseUnits } from "viem";
import { mainnet } from "viem/chains";

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(),
  account: userAddress,
});

const lbtcInfo = await getTokenContractInfo(Token.LBTC, ChainId.ethereum, Env.prod);

// Approve the vault contract to spend LBTC
const amount = parseUnits("0.5", 8); // 0.5 LBTC
const approveHash = await walletClient.writeContract({
  address: lbtcInfo.address,
  abi: [{
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  }],
  functionName: "approve",
  args: [vaultContractAddress, amount],
});
```

### Step 2: Deposit into the Vault

```typescript
import { deposit, Vault, ChainId, Env } from "@lombard.finance/sdk";

const txHash = await deposit({
  walletClient,
  chainId: ChainId.ethereum,
  env: Env.prod,
  amount,
  vaultKey: Vault.Veda,
});

console.log(`Deployed to Veda vault: ${txHash}`);
```

### Using Agent Tools

```typescript
import { prepareDeployToVault } from "@lombard.finance/sdk-agent";

const deployTx = await prepareDeployToVault.execute({
  amount: "0.5",
  protocol: "veda",
  chainId: 1, // Ethereum mainnet
});
// Returns: {
//   action: "sign_transaction",
//   type: "deploy_to_vault",
//   description: "Deploy 0.5 LBTC to veda vault on Ethereum",
//   params: { amount: "0.5", protocol: "veda", token: "LBTC", chainId: 1 },
//   note: "Deploying to a vault earns additional DeFi yield on top of base staking rewards."
// }
```

### With Vercel AI SDK

```typescript
import { lombardTools } from "@lombard.finance/sdk-agent/vercel";
import { streamText } from "ai";

const result = streamText({
  model: yourModel,
  tools: lombardTools,
  messages: [
    { role: "user", content: "Show me available yield strategies for my LBTC" },
  ],
});
// The agent will call get_strategies and present vault options with APY/TVL
```

## Yield Considerations

- **Compounding**: Base staking yield from Babylon accrues automatically in the LBTC exchange rate. Vault yield is additional and may compound differently depending on the strategy.
- **Vault APY is variable**: The displayed APY is historical and may change based on market conditions and strategy performance.
- **TVL limits**: Some vaults may have capacity limits. Check TVL and any deposit caps before deploying large amounts.
- **Withdrawal**: Withdrawing from a vault returns LBTC to your wallet. You can then continue holding for base staking yield or unstake entirely.
- **Ethereum only**: Vault deployment is currently available on Ethereum mainnet only. Vault APY and TVL queries always use the production environment regardless of which chain ID you pass.
