import BigNumber from 'bignumber.js';
import Web3, { Contract, ContractAbi } from 'web3';
import {
  TRpcUrlConfig,
  rpcUrlConfig as defaultRpcUrlConfig,
} from './rpcUrlConfig';
import { IGetMaxFeesResult } from './types';
import { getMaxPriorityFeePerGas } from './utils/getMaxPriorityFeePerGas';

const FEE_MULTIPLIER = 2;
const ADDITIONAL_SAFE_GAS_PRICE_WEI = 25_000;

export interface IReadProviderParams {
  /**
   * Chain ID of the network to interact with.
   */
  chainId: number;
  /**
   * The RPC URL configuration. If not provided, the default configuration will be used.
   */
  rpcUrlConfig?: TRpcUrlConfig;
}

export class ReadProvider {
  chainId: number;
  rpcConfig: TRpcUrlConfig;

  constructor({ chainId, rpcUrlConfig }: IReadProviderParams) {
    this.chainId = chainId;
    this.rpcConfig = { ...defaultRpcUrlConfig, ...rpcUrlConfig };
  }

  /**
   * Returns web3 instance for read operations.
   *
   * @public
   * @returns {Web3} Web3 instance.
   */
  public getReadWeb3(): Web3 {
    const rpcUrl = this.getRpcUrl();
    const readWeb3 = new Web3();
    const provider = new Web3.providers.HttpProvider(rpcUrl);
    readWeb3.setProvider(provider);
    return readWeb3;
  }

  /**
   * Retrieves the RPC URL based on the current chain ID.
   * @returns The RPC URL for the current chain ID.
   * @throws Error if the RPC URL for the current chain ID is not found.
   */
  getRpcUrl(): string {
    const { chainId } = this;
    const rpcUrl = this.rpcConfig?.[chainId];

    if (!rpcUrl) {
      console.error(
        `You might need to add the rpcConfig for the ${chainId} chain ID when creating the provider.`,
      );
      throw new Error(`RPC URL for chainId ${chainId} not found`);
    }

    return rpcUrl;
  }

  /**
   * Calculates max fees for transaction. Thess values are available for networks
   * with EIP-1559 support.
   *
   * @public
   * @note If current network is Binance Smart Chain, will return default values.
   * @returns {Promise<IGetMaxFeesResult>} Max fees for transaction.
   */
  public async getMaxFees(): Promise<IGetMaxFeesResult> {
    const web3 = this.getReadWeb3();
    const rpcUrl = this.getRpcUrl();

    const [block, maxPriorityFeePerGas] = await Promise.all([
      web3.eth.getBlock('latest'),
      getMaxPriorityFeePerGas(rpcUrl),
    ]);

    if (!block?.baseFeePerGas && typeof block?.baseFeePerGas !== 'bigint') {
      return {};
    }

    const maxFeePerGas = new BigNumber(block.baseFeePerGas.toString(10))
      .multipliedBy(FEE_MULTIPLIER)
      .plus(maxPriorityFeePerGas);

    return {
      maxFeePerGas: +maxFeePerGas,
      maxPriorityFeePerGas: +maxPriorityFeePerGas,
    };
  }

  /**
   * Returns safe gas price for transaction.
   *
   * @public
   * @returns {Promise<BigNumber>} Safe gas price.
   */
  public async getSafeGasPriceWei(): Promise<BigNumber> {
    const pureGasPriceWei = await this.getReadWeb3().eth.getGasPrice();

    return new BigNumber(pureGasPriceWei.toString(10)).plus(
      ADDITIONAL_SAFE_GAS_PRICE_WEI,
    );
  }

  /**
   * Creates a contract instance with the given ABI and address.
   *
   * @template AbiType - The type of the contract ABI.
   * @param {any} abi - The ABI of the contract.
   * @param {string} address - The address of the contract.
   * @returns {Contract<AbiType>} The contract instance.
   */
  public createContract<AbiType extends ContractAbi>(
    abi: any,
    address: string,
  ): Contract<AbiType> {
    const web3 = this.getReadWeb3();
    return new web3.eth.Contract<AbiType>(abi, address);
  }
}
