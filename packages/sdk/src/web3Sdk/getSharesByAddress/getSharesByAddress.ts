import BigNumber from 'bignumber.js';
import { TChainId } from '../../common/types/types';
import { ReadProvider } from '../../provider/ReadProvider';
import { getRpcUrlConfigFromChain } from '../utils/getRpcUrlConfigFromChain';
import { getErrorMessage } from '../../common/utils/getErrorMessage';
import { VAULTS } from '../../vaults';
import { fromSatoshi } from '../../common/utils/convertSatoshi';
import { getShareValue } from '../getShareValue';

export interface IGetSharesByAddressParameters {
  /**
   * Chain ID for identifying the blockchain network (e.g., Ethereum, Binance Smart Chain, etc.)
   */
  chainId: TChainId;
  /**
   * Optional RPC URL to connect to the blockchain. If not provided, a default RPC URL might be used.
   */
  rpcUrl?: string;
  /**
   * The address of the share holder.
   */
  address: string;
  /**
   * Optional vault key specifying the vault in use
   * @default {string} - "veda"
   */
  vaultKey?: 'veda';
}

interface IGetSharesByAddressResponse {
  /** The amount of share owned. */
  balance: BigNumber;
  /** The value of a single share unit */
  exchangeRate: BigNumber;
  /** The balance represented in BTC. */
  balanceLbtc: BigNumber;
}

/**
 * Gets the amount of shares (LBTCv) owned by the provided address.
 */
export async function getSharesByAddress({
  chainId,
  rpcUrl,
  address,
  vaultKey = 'veda',
}: IGetSharesByAddressParameters): Promise<IGetSharesByAddressResponse> {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  if (!(vault.chains as unknown as number[]).includes(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(', ')}`,
    );
  }

  const rpcUrlConfig = getRpcUrlConfigFromChain(chainId, rpcUrl);
  const provider = new ReadProvider({ chainId, rpcUrlConfig });

  try {
    const lensContract = provider.createContract<typeof vault.lensContract.abi>(
      vault.lensContract.abi,
      vault.lensContract.address,
    );

    const balanceValue = await lensContract.methods
      .balanceOf(address, vault.vaultContract.address)
      .call();
    const balance = fromSatoshi(String(balanceValue));

    const exchangeRate = await getShareValue({ chainId, rpcUrl, vaultKey });

    return {
      balance,
      exchangeRate,
      balanceLbtc: balance.multipliedBy(exchangeRate),
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(errorMessage);
  }
}
