# DeFi Registry

Configuration registry for stake-and-bake integrations across DeFi protocols, tokens, chains, and environments.

## 📋 Overview

The DeFi Registry is a **configuration-driven system** that defines which tokens can be used with which DeFi protocols for stake-and-bake operations. Instead of hard-coding approval logic in functions, we store it in a structured registry.

**Key Concept:** Adding support for new tokens or protocols requires **configuration changes only** - no code changes to core functions.

---

## 🏗️ Architecture

```
DEFI_REGISTRY
├── Protocol (Veda, Silo, etc.)
│   └── Token (LBTC, BTC, BTCb, etc.)
│       └── Environment (prod, testnet, etc.)
│           └── Chain (Ethereum, BSC, Avalanche, etc.)
│               ├── approvalConfig (permit vs approve, EIP-712 settings)
│               └── spenderContract (address, ABI, chainId)
```

### Components

1. **`ApprovalMode`** - How tokens are approved:
   - `'permit'` - Off-chain EIP-2612 signature (gasless for user)
   - `'approve'` - On-chain ERC-20 approval transaction (user pays gas)

2. **`TokenApprovalConfig`** - Defines approval behavior:
   ```typescript
   {
     mode: 'permit' | 'approve',
     eip712Domain: { name: string, version: string },
     requiresConversion?: boolean,  // e.g., BTC → LBTC
     requiresNonce: boolean,         // Fetch nonce from chain?
     expiryBehavior?: 'standard' | 'zero',
   }
   ```

3. **`DefiRegistryEntry`** - Complete registration:
   ```typescript
   {
     approvalConfig: TokenApprovalConfig,
     spenderContract: ContractInfo,
   }
   ```

---

## 📖 How It Works

### 1. **Query the Registry**

The `getStakeAndBakeConfig()` function queries the registry:

```typescript
import { getStakeAndBakeConfig } from './validation';

const { tokenConfig, spenderContract } = getStakeAndBakeConfig(
  'Veda',              // Protocol
  Token.LBTC,          // Token
  ChainId.ethereum,    // Chain
  Env.prod,            // Environment
);

// Returns:
// tokenConfig = { mode: 'permit', eip712Domain: {...}, ... }
// spenderContract = { address: '0x...', abi: [...], chainId: 1 }
```

### 2. **Used By `signStakeAndBake()`**

The main function uses the registry to determine behavior:

```typescript
// packages/sdk/src/contract-functions/signStakeAndBake/signStakeAndBake.ts

export async function signStakeAndBake(params) {
  // 1. Get config from registry
  const { tokenConfig, spenderContract } = getStakeAndBakeConfig(...);
  
  // 2. Build typed data based on config
  const typedData = buildTypedData({
    mode: tokenConfig.mode,              // permit or approve
    domainName: tokenConfig.eip712Domain.name,
    // ...
  });
  
  // 3. Route to appropriate handler
  if (tokenConfig.mode === 'approve') {
    return handleApproveFlow({ ... });   // Submit transaction
  }
  return handlePermitFlow({ ... });      // Sign message
}
```

---

## 🔧 Adding New Integrations

### Example 1: Add Existing Token to New Chain

**Scenario:** Add LBTC support on Base for Veda protocol.

```typescript
// In defi-registry.ts

const VEDA_STAKE_AND_BAKE_CHAINS = [
  ChainId.ethereum,
  ChainId.binanceSmartChain,
  ChainId.base,  // ← ADD THIS
  // Testnets:
  ChainId.binanceSmartChainTestnet,
  ChainId.holesky,
] as const;

// That's it! LBTC now works on Base because it uses forChains()
// which generates config for all chains in the array.
```

**What Happens:**
- `forChains()` automatically creates registry entries for all chains
- LBTC inherits the same `LBTC_PERMIT_CONFIG` on Base
- Uses the correct spender contract from `VEDA_VAULT_SPENDER_CONTRACTS[ChainId.base]`

---

### Example 2: Add New Token to Existing Protocol

**Scenario:** Add wBTC support for Veda on Ethereum (uses permit).

```typescript
// In defi-registry.ts

// 1. Define approval config (or reuse existing)
const WBTC_PERMIT_CONFIG: TokenApprovalConfig = {
  mode: 'permit',
  eip712Domain: {
    name: 'Wrapped Bitcoin',  // Check wBTC contract
    version: '1',
  },
  requiresNonce: true,
  expiryBehavior: 'standard',
};

// 2. Add to DEFI_REGISTRY
export const DEFI_REGISTRY = {
  Veda: {
    [Token.LBTC]: { /* existing */ },
    BTC: { /* existing */ },
    
    // Add wBTC
    [Token.wBTC]: forEnvs([Env.prod, Env.testnet], (env) => {
      return forChains([ChainId.ethereum, ChainId.base], (chain) => ({
        approvalConfig: WBTC_PERMIT_CONFIG,
        spenderContract: VEDA_VAULT_SPENDER_CONTRACTS[chain],
      }));
    }),
  },
  // ...
};
```

---

### Example 3: Add New DeFi Protocol (Aave)

**Scenario:** Add Aave protocol that accepts LBTC on Ethereum and Base.

```typescript
// In defi-registry.ts

// 1. Add protocol to DefiProtocol enum
export const DefiProtocol = {
  Veda: 'Veda',
  Silo: 'Silo',
  Aave: 'Aave',  // ← ADD THIS
} as const;

// 2. Add protocol metadata
export const DefiProtocols = {
  [DefiProtocol.Veda]: { /* existing */ },
  [DefiProtocol.Silo]: { /* existing */ },
  [DefiProtocol.Aave]: {
    name: 'Aave v3',
    url: 'https://aave.com',
  },
};

// 3. Define spender contracts
const AAVE_SPENDER_CONTRACTS = {
  [ChainId.ethereum]: {
    abi: AAVE_POOL_ABI,
    address: '0xAavePoolAddressOnEthereum',
    chainId: ChainId.ethereum,
  },
  [ChainId.base]: {
    abi: AAVE_POOL_ABI,
    address: '0xAavePoolAddressOnBase',
    chainId: ChainId.base,
  },
};

// 4. Add to registry
export const DEFI_REGISTRY = {
  // ... existing protocols
  
  Aave: {
    // LBTC uses standard permit
    [Token.LBTC]: forEnvs([Env.prod], () => {
      return forChains([ChainId.ethereum, ChainId.base], (chain) => ({
        approvalConfig: LBTC_PERMIT_CONFIG,  // Reuse existing config
        spenderContract: AAVE_SPENDER_CONTRACTS[chain],
      }));
    }),
  },
};
```

**That's it!** Now you can call:
```typescript
await signStakeAndBake({
  vaultKey: 'Aave',
  token: Token.LBTC,
  chainId: ChainId.ethereum,
  // ...
});
```

---

### Example 4: Token That Uses Approve Mode

**Scenario:** Add USDC to Silo on Avalanche (requires on-chain approve).

```typescript
// In defi-registry.ts

// 1. Define approval config for USDC
const USDC_APPROVE_CONFIG: TokenApprovalConfig = {
  mode: 'approve',  // On-chain transaction
  eip712Domain: {
    name: 'USD Coin',
    version: '2',
  },
  requiresNonce: false,   // Approve doesn't use nonce
  expiryBehavior: 'zero', // Approve uses zero deadline
};

// 2. Add to Silo registry
export const DEFI_REGISTRY = {
  // ...
  Silo: {
    [Token.BTCb]: { /* existing */ },
    
    // Add USDC
    [Token.USDC]: forEnvs([Env.testnet], () => {
      return forChains([ChainId.avalancheFuji], () => ({
        approvalConfig: USDC_APPROVE_CONFIG,
        spenderContract: {
          abi: SILO_VAULT_SPENDER_ABI,
          address: '0xSiloSpenderOnAvalancheFuji',
          chainId: ChainId.avalancheFuji,
        },
      }));
    }),
  },
};
```

---

## 🔍 Validation & Error Handling

The registry automatically validates:

```typescript
// Example: Unsupported token
await signStakeAndBake({
  vaultKey: 'Veda',
  token: Token.BTCb,  // BTCb not configured for Veda
  chainId: ChainId.ethereum,
});
// Throws: StakeAndBakeValidationError
// "Token BTC.b is not supported for stake and bake on vault Veda.
//  Supported tokens: LBTC, BTC"
```

**Error Codes:**
- `UNSUPPORTED_VAULT` - Protocol not in registry
- `UNSUPPORTED_CHAIN` - Chain not in vault's `stakeAndBakeChains`
- `UNSUPPORTED_TOKEN` - Token not configured for protocol
- `UNSUPPORTED_ENV` - Environment not configured
- `UNSUPPORTED_TOKEN_CHAIN` - Token not configured for specific chain

---

## 🛠️ Helper Functions

### `forChains()`
Generate config for multiple chains with same settings:

```typescript
forChains([ChainId.ethereum, ChainId.base, ChainId.bsc], (chain) => ({
  approvalConfig: LBTC_PERMIT_CONFIG,
  spenderContract: SPENDER_CONTRACTS[chain],
}))

// Generates:
// {
//   1: { approvalConfig: {...}, spenderContract: {...} },
//   8453: { approvalConfig: {...}, spenderContract: {...} },
//   56: { approvalConfig: {...}, spenderContract: {...} },
// }
```

### `forEnvs()`
Generate config for multiple environments:

```typescript
forEnvs([Env.prod, Env.testnet], (env) => ({
  // Config for this env
}))

// Generates:
// {
//   prod: { ... },
//   testnet: { ... },
// }
```

---

## 📂 File Structure

```
defi/
├── README.md              ← You are here
├── index.ts               ← Exports
└── defi-registry.ts       ← Registry definition
```

**Related Files:**
```
contract-functions/signStakeAndBake/
├── signStakeAndBake.ts    ← Main function (uses registry)
├── validation.ts          ← getStakeAndBakeConfig() queries registry
├── handleApprove.ts       ← Handles 'approve' mode
├── handlePermit.ts        ← Handles 'permit' mode
├── typed-data-builder.ts  ← Builds EIP-712 data
└── utils.ts               ← Helper functions
```

---

## 🎯 Best Practices

### 1. **Reuse Approval Configs**
Don't duplicate configs for the same token behavior:
```typescript
// ✅ Good: Reuse
[Token.LBTC]: forEnvs(..., () => ({
  approvalConfig: LBTC_PERMIT_CONFIG,  // Reused
  ...
}))

// ❌ Bad: Duplicate
[Token.LBTC]: forEnvs(..., () => ({
  approvalConfig: {
    mode: 'permit',
    eip712Domain: { name: 'Lombard...', version: '1' },
    // ... duplicated values
  },
  ...
}))
```

### 2. **Use forChains() for Multi-Chain Support**
```typescript
// ✅ Good: DRY with forChains()
[Token.LBTC]: forEnvs([Env.prod], () => 
  forChains([ChainId.ethereum, ChainId.base], (chain) => ({
    approvalConfig: LBTC_PERMIT_CONFIG,
    spenderContract: SPENDER_CONTRACTS[chain],
  }))
)

// ❌ Bad: Repetitive
[Token.LBTC]: {
  [Env.prod]: {
    [ChainId.ethereum]: { ... },
    [ChainId.base]: { ... },  // Same config, duplicated
  }
}
```

### 3. **Define Spender Contracts Once**
Store spender contracts in a map:
```typescript
// At top of file
const VEDA_VAULT_SPENDER_CONTRACTS = {
  [ChainId.ethereum]: { abi, address: '0x...', chainId: 1 },
  [ChainId.base]: { abi, address: '0x...', chainId: 8453 },
  // ...
};

// Then reference them
spenderContract: VEDA_VAULT_SPENDER_CONTRACTS[chain]
```

### 4. **Document Token-Specific Behavior**
Use comments for special cases:
```typescript
// BTC is a virtual token that converts to LBTC via exchange ratio
BTC: forEnvs(Object.values(Env), () => {
  return forChains(VEDA_STAKE_AND_BAKE_CHAINS, (chain) => ({
    approvalConfig: BTC_PERMIT_CONFIG,  // Has requiresConversion: true
    spenderContract: VEDA_VAULT_SPENDER_CONTRACTS[chain],
  }));
}),
```

---

## 🧪 Testing New Integrations

### 1. **Unit Tests**
Add test cases in `signStakeAndBake.test.ts`:
```typescript
it('should handle NewToken on NewProtocol', async () => {
  const result = await signStakeAndBake({
    token: Token.NewToken,
    vaultKey: 'NewProtocol',
    chainId: ChainId.ethereum,
    // ...
  });
  
  expect(result.mode).toBe('permit');  // or 'approve'
  expect(result.signature).toBeTruthy();
});
```

### 2. **Storybook Testing**
Test in Storybook UI:
```bash
yarn storybook
# Navigate to: write/signStakeAndBake
# Select your new token/protocol in controls
```

### 3. **Integration Testing**
Use the verification script:
```bash
yarn verify:stake-and-bake
```

---

## 🚀 Quick Start Checklist

Adding a new integration? Follow these steps:

- [ ] Define or reuse `TokenApprovalConfig`
- [ ] Add token to `DEFI_REGISTRY` under appropriate protocol
- [ ] Use `forChains()` and `forEnvs()` helpers
- [ ] Ensure spender contracts are defined
- [ ] Add test case(s)
- [ ] Test in Storybook
- [ ] Update exports in `index.ts` if adding new protocol

