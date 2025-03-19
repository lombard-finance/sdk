import BigNumber from 'bignumber.js';
import { TChainId } from '../../common/types/types';
import { ReadProvider } from '../../provider/ReadProvider';
import { getRpcUrlConfigFromChain } from '../utils/getRpcUrlConfigFromChain';
import { getErrorMessage } from '../../common/utils/getErrorMessage';
import { VAULTS } from '../../vaults';
import { fromSatoshi } from '../../common/utils/convertSatoshi';

export interface IGetShareValueParameters {
  /**
   * Chain ID for identifying the blockchain network (e.g., Ethereum, Binance Smart Chain, etc.)
   */
  chainId: TChainId;
  /**
   * Optional RPC URL to connect to the blockchain. If not provided, a default RPC URL might be used.
   */
  rpcUrl?: string;
  /**
   * Optional vault key specifying the vault in use
   * @default {string} - "veda"
   */
  vaultKey?: 'veda';
}

/**
 * Gets the value of a single share unit (in LBTC) from the specified vault.
 */
export async function getShareValue({
  chainId,
  rpcUrl,
  vaultKey = 'veda',
}: IGetShareValueParameters): Promise<BigNumber> {
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
    const accountant = provider.createContract<
      typeof vault.accountantContract.abi
    >(vault.accountantContract.abi, vault.accountantContract.address);

    const exchangeRate = await accountant.methods['getRate']().call();
    return fromSatoshi(String(exchangeRate));
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(errorMessage);
  }
}
