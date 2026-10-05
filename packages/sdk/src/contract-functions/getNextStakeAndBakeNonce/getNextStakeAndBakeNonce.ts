import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import type { Address } from 'viem';

import { getStakeAndBakePermits } from '../../api-functions/stakeAndBakePermits/getStakeAndBakePermits';
import type { ChainId } from '../../common/chains';
import {
  DefiProtocol,
  getStakeAndBakeStakedToken,
  StakeAndBakeToken,
} from '../../defi/defi-registry';
import { getPermitNonce } from '../getPermitNonce/getPermitNonce';
import { getStakeAndBakeTokenContract } from '../signStakeAndBake/utils';
import { getStakeAndBakeConfig } from '../signStakeAndBake/validation';

export interface IGetNextStakeAndBakeNonceParams {
  /** The permit owner. */
  owner: Address;
  /** The stake-and-bake protocol. */
  protocol: DefiProtocol;
  /** The registry token of the route (`'BTC'`, LBTC, BTC.b). */
  token: StakeAndBakeToken;
  /** The EVM chain. */
  chainId: ChainId;
  /** The environment. Defaults to the SDK default. */
  env?: Env;
  /** JWT from the wallet-auth flow, used to list the pending permits. */
  walletJwt: string;
  /** Optional RPC URL for the on-chain nonce read. */
  rpcUrl?: string;
}

/**
 * The nonce to sign the owner's next stake-and-bake permit with, so that it
 * neither collides with nor skips past the permits already pending.
 *
 * - Permit mode: `nonces(owner)` on the staked token plus the number of
 *   unused permits listed for that token. Every contract that stakes the
 *   token shares the one sequence, so permits for other spenders count too.
 * - Approve mode: the nonce only identifies the permit, so it is one above
 *   the highest listed nonce on the token, or 0 when none is listed.
 *
 * Pass the result as `nonce` to `signStakeAndBake`. To replace a pending
 * permit instead, pass that permit's own nonce.
 *
 * @throws {UnauthorizedWalletJwtError} when the JWT is refused.
 * @throws {StakeAndBakeValidationError} for an unsupported route.
 */
export async function getNextStakeAndBakeNonce({
  owner,
  protocol,
  token,
  chainId,
  env = DEFAULT_ENV,
  walletJwt,
  rpcUrl,
}: IGetNextStakeAndBakeNonceParams): Promise<bigint> {
  const strategy = getStakeAndBakeConfig(protocol, token, chainId, env);
  const stakedToken = getStakeAndBakeStakedToken(strategy);
  const isPermit = strategy.approval.mode === 'permit';

  const [tokenContract, { permits }, onChainNonce] = await Promise.all([
    getStakeAndBakeTokenContract(stakedToken, chainId, env),
    getStakeAndBakePermits({ address: owner, chainId, walletJwt, env }),
    isPermit
      ? getPermitNonce({ owner, token: stakedToken, chainId, rpcUrl, env })
      : Promise.resolve('0'),
  ]);

  const tokenAddress = String(tokenContract.address).toLowerCase();
  const pending = permits.filter(
    (permit) => permit.tokenAddress.toLowerCase() === tokenAddress,
  );

  if (isPermit) {
    return BigInt(onChainNonce) + BigInt(pending.length);
  }

  return pending.reduce<bigint>((next, permit) => {
    const candidate = BigInt(permit.nonce) + 1n;
    return candidate > next ? candidate : next;
  }, 0n);
}
