import BigNumber from 'bignumber.js';
import { makeWalletClient } from '../../clients/wallet-client';
import { CommonWriteParameters } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import { getTokenContractInfo } from '../../tokens/tokens';
import { DAY, now, toUnix } from '../../utils/time';
import {
  VAULTS,
  Vault,
  isVedaVaultStakeAndBakeChain,
} from '../../vaults/lib/config';
import { getPermitNonce } from '../getPermitNonce/getPermitNonce';
import { getExchangeRatio } from '../../api-functions/getLBTCExchangeRate/get-exchange-ratio';
import { Env } from '@lombard.finance/sdk-common';

export type StakeAndBakeToken = Token.LBTC | 'BTC';

export interface ISignStakeAndBakeParams extends CommonWriteParameters {
  /**
   * The approved BTC value that will be automatically claimed and deposited
   * to the chosen vault. The function will internally calculate the correct LBTC amount using the current ratio.
   */
  value: BigNumber.Value;
  /**
   * The expiration UNIX time of the signature.
   * Defaults to 24 hours from the time of signing.
   */
  expiry?: number;
  /**
   * The chosen DeFi vault to which the funds will be deposited.
   */
  vaultKey?: Vault;
  /**
   * The token for which the signature is generated.
   * - Defaults to **BTC**: the amount will be converted to the corresponding
   *   **LBTC** value based on the current ratio.
   * - If **LBTC** is chosen: no conversion is performed.
   */
  token?: StakeAndBakeToken;
}

export interface ISignStakeAndBakeResult {
  /**
   * The signature.
   */
  signature: string;
  /**
   * The typed data used to generate the signature.
   */
  typedData: string;
}

/**
 * Signs the "stake and bake" signature that allows Lombard to claim specified
 * amount of BTC (converted to LBTC using current ratio) and deposit that amount directly to the specified DeFi
 * vault.
 *
 * In order for the "stake and bake" process to work a user has to store the
 * signature to the Lombard's system, see: `storeStakeAndBakeSignature`
 *
 * @param {ISignStakeAndBakeParams} parameters - The parameters.
 * @param {BigNumber.Value} parameters.value - The amount of BTC that will be converted to LBTC using current ratio and deposited to the DeFi vault.
 * @param {number} parameters.expiry = The optional expiration UNIX time of the signature.
 * @param {Vault} parameters.vaultKey - The optional DeFi vault identifier.
 * @param {Address} parameters.account - The EVM account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The EIP1193 provider.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 *
 * @returns {Promise<ISignStakeAndBakeResult>} - The signature and typed data.
 */
export async function signStakeAndBake({
  account,
  expiry = toUnix(now() + DAY),
  value,
  vaultKey = Vault.Veda,
  token = 'BTC',
  chainId,
  provider,
  rpcUrl,
  env,
}: ISignStakeAndBakeParams): Promise<ISignStakeAndBakeResult> {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  if (!isVedaVaultStakeAndBakeChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.stakeAndBakeChains.join(', ')}`,
    );
  }

  const lbtcAmount =
    !token || token === 'BTC'
      ? await calculateStakeAndBakeLBTCAmount(value, env)
      : BigNumber(value);
  const lbtcContract = await getTokenContractInfo(Token.LBTC, chainId, env);
  const walletClient = makeWalletClient({ chainId, provider });
  const spenderContract = vault.spenderContracts[chainId];

  const nonce = await getPermitNonce({
    owner: account,
    chainId,
    rpcUrl,
  });

  const typedData: Parameters<typeof walletClient.signTypedData>[0] = {
    account,
    domain: {
      name: 'Lombard Staked Bitcoin',
      version: '1',
      chainId: BigInt(chainId),
      verifyingContract: lbtcContract.address,
    },
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    message: {
      owner: account,
      spender: spenderContract.address,
      value: BigInt(lbtcAmount.toFixed(0, BigNumber.ROUND_DOWN)),
      nonce: BigInt(nonce),
      deadline: BigInt(expiry),
    },
  };

  const signature = await walletClient.signTypedData(typedData);

  return {
    signature,
    typedData: JSON.stringify(typedData, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    ),
  };
}

/**
 * Helper function to calculate the correct LBTC amount for stake and bake
 * based on the current BTC to LBTC ratio.
 *
 * @param btcAmount - The original BTC amount entered by the user
 * @param env - The environment for fetching the exchange ratio
 * @returns The calculated LBTC amount that should be used in the permit signature
 */
export async function calculateStakeAndBakeLBTCAmount(
  btcAmount: BigNumber.Value,
  env?: Env,
): Promise<BigNumber> {
  try {
    const ratios = await getExchangeRatio({ env });
    const btcTokenRatio = ratios.LBTC?.BTCTokenRatio || new BigNumber(1);
    const lbtcAmount = new BigNumber(btcAmount).dividedBy(btcTokenRatio);

    return lbtcAmount;
  } catch (error) {
    throw new Error('Failed to get exchange ratio for stake and bake');
  }
}
