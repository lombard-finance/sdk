import Web3, { Contract, ContractAbi, Transaction, utils } from 'web3';
import { IEIP1193Provider } from '../common/types/types';
import { IReadProviderParams, ReadProvider } from './ReadProvider';
import {
  TRpcUrlConfig,
  rpcUrlConfig as defaultRpcUrlConfig,
} from './rpcUrlConfig';
import { ISendOptions, IWeb3SendResult } from './types';

export interface IProviderParams extends IReadProviderParams {
  /**
   * The EIP-1193 provider instance.
   */
  provider: IEIP1193Provider;
  /**
   * The сurrent account address.
   */
  account: string;
}

/**
 * Provider for interacting with a blockchain network.
 */
export class Provider extends ReadProvider {
  web3: Web3;
  account: string;
  rpcConfig: TRpcUrlConfig;

  constructor({ provider, account, chainId, rpcUrlConfig }: IProviderParams) {
    super({ chainId, rpcUrlConfig });
    this.web3 = new Web3(provider);
    this.account = account;
    this.chainId = chainId;
    this.rpcConfig = { ...defaultRpcUrlConfig, ...rpcUrlConfig };
  }

  /**
   * Signs a message using the current provider and account.
   * @public
   * @param message - The message to be signed.
   * @returns A promise that resolves to the signed message as a string.
   */
  public async signMessage(message: string): Promise<string> {
    const { account } = this;

    const messageHex = `0x${Buffer.from(message, 'utf8').toString('hex')}`;

    const ethereum = this.web3.currentProvider as any;

    return ethereum.request({
      method: 'personal_sign',
      params: [messageHex, account],
    });
  }

  /**
   * Custom replacement for web3js [send](https://docs.web3js.org/libdocs/Contract#send).
   *
   * @public
   * @param {string} from - Address of the sender.
   * @param {string} to - Address of the recipient.
   * @param {ISendOptions} sendOptions - Options for sending transaction.
   * @returns {Promise<IWeb3SendResult>} Promise with transaction hash and receipt promise.
   */
  public async sendTransactionAsync(
    from: string,
    to: string,
    sendOptions: ISendOptions,
  ): Promise<IWeb3SendResult> {
    const { chainId, web3: web3Write } = this;
    const web3Read = this.getReadWeb3();

    const {
      data,
      estimate = false,
      estimateFee = false,
      extendedGasLimit,
      gasLimit = '0',
      value = '0',
      gasLimitMultiplier = 1,
    } = sendOptions;
    let { nonce } = sendOptions;

    if (!nonce) {
      nonce = await web3Read.eth.getTransactionCount(from);
    }

    console.log(`Nonce: ${nonce}`);

    const tx: Transaction = {
      from,
      to,
      value: utils.numberToHex(value),
      gas: utils.numberToHex(gasLimit),
      data,
      nonce,
      chainId: utils.numberToHex(chainId),
    };

    if (estimate) {
      try {
        const estimatedGas = await web3Read.eth.estimateGas(tx);
        const multipliedGasLimit = Math.round(
          Number(estimatedGas) * gasLimitMultiplier,
        );

        if (extendedGasLimit) {
          tx.gas = utils.numberToHex(multipliedGasLimit + extendedGasLimit);
        } else {
          tx.gas = utils.numberToHex(multipliedGasLimit);
        }
      } catch (e) {
        throw new Error(
          (e as Partial<Error>).message ??
            'Failed to estimate gas limit for transaction.',
        );
      }
    }

    const { maxFeePerGas, maxPriorityFeePerGas } = estimateFee
      ? await this.getMaxFees().catch(() => sendOptions)
      : sendOptions;

    if (maxPriorityFeePerGas !== undefined) {
      tx.maxPriorityFeePerGas = utils.numberToHex(maxPriorityFeePerGas);
    }

    if (maxFeePerGas !== undefined) {
      tx.maxFeePerGas = utils.numberToHex(maxFeePerGas);
    }

    if (!tx.maxFeePerGas && !tx.maxPriorityFeePerGas) {
      const safeGasPrice = await this.getSafeGasPriceWei();
      tx.gasPrice = safeGasPrice.toString(10);
    }

    if (!tx.maxFeePerGas && !tx.maxPriorityFeePerGas) {
      const safeGasPrice = await this.getSafeGasPriceWei();
      tx.gasPrice = safeGasPrice.toString(10);
    }

    console.log('Sending transaction via Web3: ', tx);

    return new Promise((resolve, reject) => {
      const promise = web3Write.eth.sendTransaction(tx);

      promise
        .once('transactionHash', async (transactionHash: string) => {
          console.log(`Just signed transaction has is: ${transactionHash}`);

          const rawTx = await web3Read.eth.getTransaction(transactionHash);

          console.log(
            'Found transaction in node: ',
            JSON.stringify(
              rawTx,
              (_, value) =>
                typeof value === 'bigint' ? value.toString() : value,
              2,
            ),
          );

          resolve({
            receiptPromise: promise,
            transactionHash,
          });
        })
        .catch(reject);
    });
  }

  public createContract<AbiType extends ContractAbi>(
    abi: any,
    address: string,
  ): Contract<AbiType> {
    return new this.web3.eth.Contract<AbiType>(abi, address);
  }
}
