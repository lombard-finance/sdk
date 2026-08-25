import { Env } from '@lombard.finance/sdk-common';
import type { WalletClient } from 'viem';
import { beforeAll, describe, expect, it } from 'vitest';

import { evmStake } from '../../../chains/evm/actions/deposit-btcb';
import { AssetId, Chain } from '../../../core';
import { createTestConfig as createConfig } from '../../helpers/createTestConfig';
import { walletClientToProvider } from '../../test-utils/eip1193-adapter';
import { createTestEvmWallet } from '../../test-utils/evm-wallet';

const runIfConfigured = process.env.TEST_EVM_PRIVATE_KEY
  ? describe
  : describe.skip;

runIfConfigured('EVM Stake Real Wallet', () => {
  let wallet: WalletClient;

  beforeAll(async () => {
    // EVM Stake usually happens on Avalanche (BTC.b -> LBTC)
    const res = await createTestEvmWallet(
      process.env.TEST_EVM_PRIVATE_KEY as `0x${string}`,
      'avalanche-fuji',
    );
    wallet = res.walletClient;
  });

  it('should prepare stake transaction', async () => {
    const config = createConfig({
      env: Env.testnet,
      providers: {
        evm: () => walletClientToProvider(wallet),
      },
    });

    const stake = evmStake(config, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      sourceChain: Chain.AVALANCHE,
      destChain: Chain.AVALANCHE,
    });

    await stake.prepare({
      amount: '0.0001',
    });

    expect(stake.status).toBe('needs-approval');
  });
});
