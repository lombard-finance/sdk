import { Env } from '@lombard.finance/sdk-common';
import type { WalletClient } from 'viem';
import { beforeAll, describe, expect, it } from 'vitest';

import { evmUnstake } from '../../../chains/evm/actions/unstake';
import { AssetId, Chain } from '../../../core';
import { createTestConfig as createConfig } from '../../helpers/createTestConfig';
import { walletClientToProvider } from '../../test-utils/eip1193-adapter';
import { createTestEvmWallet } from '../../test-utils/evm-wallet';

const runIfConfigured = process.env.TEST_EVM_PRIVATE_KEY
  ? describe
  : describe.skip;

runIfConfigured('EVM Unstake Real Wallet', () => {
  let wallet: WalletClient;

  beforeAll(async () => {
    const res = await createTestEvmWallet(
      process.env.TEST_EVM_PRIVATE_KEY as `0x${string}`,
      'sepolia',
    );
    wallet = res.walletClient;
  });

  it('should prepare unstake transaction', async () => {
    const config = createConfig({
      env: Env.testnet,
      providers: {
        evm: () => walletClientToProvider(wallet),
      },
    });

    const unstake = evmUnstake(config, {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
      sourceChain: Chain.SEPOLIA,
      destChain: Chain.BITCOIN_SIGNET,
    });

    await unstake.prepare({
      amount: '0.0001',
      recipient: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', // Valid testnet address
    });

    // Status depends on whether user has LBTC balance and allowance
    // Without LBTC: might be 'ready' (nothing to approve) or 'needs-approval'
    // With LBTC: 'needs-approval' then 'ready'
    expect(['ready', 'needs-approval', 'needs_approval']).toContain(
      unstake.status,
    );
  });
});
