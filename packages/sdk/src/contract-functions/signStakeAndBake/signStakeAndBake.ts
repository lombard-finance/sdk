import { makeWalletClient } from '../../clients/wallet-client';
import { CommonWriteParameters } from '../../common/parameters';
import {
  isVedaVaultStakeAndBakeChain,
  Vault,
  VAULTS,
} from '../../vaults/lib/config';
import { getPermitNonce } from '../getPermitNonce/getPermitNonce';
import BigNumber from 'bignumber.js';
import { DAY, now, toUnix } from '../../utils/time';
import { getTokenContractInfo } from '../../tokens/tokens';
import { Token } from '../../tokens/token-addresses';

export interface ISignStakeAndBakeParams extends CommonWriteParameters {
  /**
   * The approved value that will be automatically claimed and deposited
   * to the chosen vault.
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
 * amount of BTC (LBTC) and deposit that amount directly to the specified DeFi
 * vault.
 *
 * In order for the "stake and bake" process to work a user has to store the
 * signature to the Lombard's system, see: `storeStakeAndBakeSignature`
 *
 * @param {ISignStakeAndBakeParams} parameters - The parameters.
 * @param {BigNumber.Value} parameters.value - The amount of BTC that's going to be claimed and deposited to the DeFi vault.
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

  const lbtcContract = getTokenContractInfo(Token.LBTC, chainId, env);
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
      value: BigInt(BigNumber(value).toFixed()),
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
