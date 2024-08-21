import { core, eth, FMT_BYTES, FMT_NUMBER, TransactionReceipt } from 'web3';

export interface IGetMaxFeesResult {
  maxPriorityFeePerGas?: number;
  maxFeePerGas?: number;
}

export type PromiEvent<T> = core.Web3PromiEvent<
  T,
  eth.SendTransactionEvents<{
    readonly number: FMT_NUMBER.BIGINT;
    readonly bytes: FMT_BYTES.HEX;
  }>
>;

export interface IWeb3SendResult {
  receiptPromise: PromiEvent<TransactionReceipt>;
  transactionHash: string;
}

export interface ISendOptions {
  /**
   * Txn data.
   */
  data?: string;
  /**
   * Gas limit for transaction.
   * @note When `estimate` is `true`, this value will redefined by estimated gas limit.
   */
  gasLimit?: string;
  /**
   * Multiplier for gas limit when estimating gas.
   * When specified, gas limit will be calculated as `gasLimit * gasLimitMultiplier`.
   * @note works only when `estimate` is `true`.
   * @default 1
   */
  gasLimitMultiplier?: number;
  value?: string;
  /**
   * When `true`, will estimate gas limit for transaction.
   * @note `gasLimit` option will be redefined by estimated gas limit.
   */
  estimate?: boolean;
  /**
   * When `true`, will estimate max fees for transaction.
   * @note `maxPriorityFeePerGas` and `maxFeePerGas` options will be redefined by estimated values.
   * @note Please use only for networks with EIP-1559 support.
   */
  estimateFee?: boolean;
  nonce?: bigint;
  /**
   * Additional gas limit for transaction.
   * @note When `estimate` is `true`, this value will be added to estimated gas limit.
   */
  extendedGasLimit?: number;
  maxPriorityFeePerGas?: number;
  maxFeePerGas?: number;
}
