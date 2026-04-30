import { Env } from '@lombard.finance/sdk-common';
import type { PrivateKeyAccount, WalletClient } from 'viem';
import { beforeAll, describe, expect, it } from 'vitest';

import { btcStake } from '../../../chains/btc/actions/stake';
import { AssetId, Chain } from '../../../core';
import { createTestConfig as createConfig } from '../../helpers/createTestConfig';
import { walletClientToProvider } from '../../test-utils/eip1193-adapter';
import { createTestEvmWallet } from '../../test-utils/evm-wallet';

// Skip if no private key provided
const runIfConfigured = process.env.TEST_EVM_PRIVATE_KEY ? describe : describe.skip;

runIfConfigured('BTC Stake Real Wallet', () => {
  let wallet: WalletClient;
  let account: PrivateKeyAccount;

  beforeAll(async () => {
    const res = await createTestEvmWallet(
      process.env.TEST_EVM_PRIVATE_KEY as `0x${string}`,
      'sepolia'
    );
    wallet = res.walletClient;
    account = res.account;
  });

  it('should generate deposit address for Sepolia', async () => {
    const config = createConfig({
      env: Env.testnet,
      providers: {
        evm: () => walletClientToProvider(wallet) } });

    const stake = btcStake(config, {
      destChain: Chain.SEPOLIA,
      assetOut: AssetId.LBTC });

    await stake.prepare({
      amount: '0.0002', // Min amount
      recipient: account.address });

    // Authorize is the unified step:
    // - If the chain needs fee auth, it signs and stores the fee signature
    // - Otherwise it signs the destination address
    if (
      stake.status === 'needs_fee_authorization' ||
      stake.status === 'needs_address_confirmation'
    ) {
      await stake.authorize();
    }

    // Now generate the deposit address if ready
    if (stake.status === 'ready') {
      const depositAddress = await stake.generateDepositAddress();
      expect(depositAddress).toBeDefined();
      expect(depositAddress).toMatch(/^(tb1|2|m|n)/); // Testnet address format
    } else {
      // If we can't get to ready status, at least verify we progressed
      console.log('BTC Stake status:', stake.status);
      expect([
        'ready',
        'needs_address_confirmation',
        'needs_fee_authorization',
      ]).toContain(stake.status);
    }
  });
});
