import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { evmStakeAndDeployConfig } from '../../../chains/btc/actions/stakeAndDeploy/config/evm';
import { ChainId } from '../../../common/chains';
import { getStakeAndBakeConfig } from '../../../contract-functions/signStakeAndBake/validation';
import {
  DEFI_REGISTRY,
  DefiProtocol,
  DefiProtocols,
  getStakeAndBakeStakedToken,
  getStakeAndBakeSupportedChains,
  ON_CHAIN_CREDIT_SPENDER_CONTRACT_ETHEREUM,
} from '../../../defi/defi-registry';
import { Token } from '../../../tokens/token-addresses';
import { SILO_VAULT_SPENDER_ABI } from '../../../vaults/abi';

describe('OnChainCredit stake-and-bake registry', () => {
  it('is a protocol with metadata', () => {
    expect(DefiProtocol.OnChainCredit).toBe('onChainCredit');
    expect(DefiProtocols[DefiProtocol.OnChainCredit].name).toBe(
      'Bitcoin On-Chain Credit',
    );
  });

  it.each([Token.BTCb, 'BTC'] as const)(
    'registers %s on Ethereum mainnet in prod only',
    (token) => {
      expect(
        getStakeAndBakeSupportedChains(
          DefiProtocol.OnChainCredit,
          token,
          Env.prod,
        ),
      ).toEqual([ChainId.ethereum]);
      for (const env of Object.values(Env)) {
        if (env === Env.prod) continue;
        expect(
          getStakeAndBakeSupportedChains(
            DefiProtocol.OnChainCredit,
            token,
            env,
          ),
        ).toEqual([]);
      }
    },
  );

  it.each([Token.BTCb, 'BTC'] as const)(
    'signs %s as a BTC.b permit with the amount as-is',
    (token) => {
      const strategy = getStakeAndBakeConfig(
        DefiProtocol.OnChainCredit,
        token,
        ChainId.ethereum,
        Env.prod,
      );

      expect(strategy.amountStrategy).toBe('identity');
      expect(strategy.stakedToken).toBe(Token.BTCb);
      expect(getStakeAndBakeStakedToken(strategy)).toBe(Token.BTCb);
      expect(strategy.approval).toEqual({
        mode: 'permit',
        domainName: 'Bitcoin',
        domainVersion: '1',
        deadlineStrategy: 'expiry',
        nonceStrategy: 'chain',
      });
      expect(strategy.spenderContract.address).toBe(
        '0xCa12BFa58ee1a686aF2437bf1dc7460Df3A59a4d',
      );
      expect(strategy.spenderContract.address).toBe(
        ON_CHAIN_CREDIT_SPENDER_CONTRACT_ETHEREUM,
      );
      expect(strategy.spenderContract.chainId).toBe(ChainId.ethereum);
      // The deployed spender implements the Silo spender interface in full.
      expect(strategy.spenderContract.abi).toBe(SILO_VAULT_SPENDER_ABI);
      // viem needs the ABI array itself, not a JSON module namespace.
      expect(Array.isArray(strategy.spenderContract.abi)).toBe(true);
    },
  );

  it('keeps the existing staked tokens', () => {
    expect(
      getStakeAndBakeStakedToken(
        getStakeAndBakeConfig(
          DefiProtocol.Veda,
          'BTC',
          ChainId.ethereum,
          Env.prod,
        ),
      ),
    ).toBe(Token.LBTC);
    expect(
      getStakeAndBakeStakedToken(
        getStakeAndBakeConfig(
          DefiProtocol.Veda,
          Token.LBTC,
          ChainId.ethereum,
          Env.prod,
        ),
      ),
    ).toBe(Token.LBTC);
    expect(
      getStakeAndBakeStakedToken(
        DEFI_REGISTRY[DefiProtocol.Silo][Token.BTCb]![Env.testnet]![
          ChainId.avalancheFuji
        ]!,
      ),
    ).toBe(Token.BTCb);
  });

  it('falls back on the registry token when no staked token is set', () => {
    expect(getStakeAndBakeStakedToken({ token: Token.BTCb })).toBe(Token.BTCb);
    expect(getStakeAndBakeStakedToken({ token: 'BTC' })).toBe(Token.LBTC);
    expect(getStakeAndBakeStakedToken({})).toBe(Token.LBTC);
  });

  it('is not offered by the LBTC stake-and-deploy action', () => {
    expect(evmStakeAndDeployConfig.supportedProtocols).not.toContain(
      DefiProtocol.OnChainCredit,
    );
  });
});
