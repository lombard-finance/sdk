import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';

import { CommonWriteParameters } from '../../common/parameters';
import {
  ApprovalMode,
  DefiProtocol,
  StakeAndBakeToken,
} from '../../defi/defi-registry';
import { LombardError, ValidationErrorCode } from '../../shared/errors';
import { DAY, now, toUnix } from '../../utils/time';
import { getPermitNonce } from '../getPermitNonce/getPermitNonce';
import { handleApproveFlow } from './handleApprove';
import { handlePermitFlow } from './handlePermit';
import { buildTypedData } from './typed-data-builder';
import {
  calculateStakeAndBakeLBTCAmount,
  getStakeAndBakeTokenContract,
} from './utils';
import { getStakeAndBakeConfig } from './validation';

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
  vaultKey?: DefiProtocol;
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
   * The approval mode used for this signature.
   * - `permit`: Off-chain signature (EIP-2612), can be used directly by backend
   * - `approve`: On-chain approval transaction was submitted
   */
  mode: ApprovalMode;

  /**
   * The signature.
   * - For permit mode: Contains the EIP-2612 signature
   * - For approve mode: Empty string (approval was done on-chain)
   */
  signature: string;

  /**
   * The typed data used to generate the signature.
   * Contains the full EIP-712 structure for both permit and approve modes.
   */
  typedData: string;

  /**
   * Transaction hash for approve mode (when allowance was set).
   * Only present when mode is 'approve' and a transaction was submitted.
   */
  approvalTxHash?: string;
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
 * @param {DefiProtocol} parameters.vaultKey - The optional DeFi vault identifier.
 * @param {Address} parameters.account - The EVM account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The EIP1193 provider.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 *
 * @returns {Promise<ISignStakeAndBakeResult>} - The signature and typed data.
 */
/**
 * Rejects an expiry that cannot become a permit deadline.
 *
 * The parameter is an absolute UNIX timestamp in **seconds**. A fractional
 * value is almost always milliseconds, or `Date.now() / 1000` without a
 * `Math.floor`, and `BigInt()` would reject it with a message that names
 * neither the parameter nor the unit.
 */
function assertValidExpiry(expiry: number): void {
  if (!Number.isSafeInteger(expiry) || expiry <= 0) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `expiry must be a positive whole number of seconds since the epoch, ` +
        `received ${String(expiry)}. It is an absolute UNIX timestamp in ` +
        `seconds — a fractional value usually means milliseconds, or ` +
        `Date.now() / 1000 without Math.floor.`,
    );
  }
}

export async function signStakeAndBake({
  account,
  expiry = toUnix(now() + DAY),
  value,
  // TODO: Rename vaultKey to protocol
  vaultKey: protocol = DefiProtocol.Veda,
  token = 'BTC',
  chainId,
  provider,
  rpcUrl,
  env = DEFAULT_ENV,
}: ISignStakeAndBakeParams): Promise<ISignStakeAndBakeResult> {
  const strategy = getStakeAndBakeConfig(protocol, token, chainId, env);

  const spenderAddress = strategy.spenderContract.address;

  // Calculate permit value (with conversion if needed)
  const permitValue =
    strategy.amountStrategy === 'btcToLbtc'
      ? await calculateStakeAndBakeLBTCAmount(value, env)
      : new BigNumber(value);

  // Get token contract (always use Token address for permits/approves, not adapter)
  const tokenContract = await getStakeAndBakeTokenContract(token, chainId, env);
  const tokenAddress = tokenContract.address;
  const tokenAbi = tokenContract.abi;

  // Calculate deadline based on expiry behavior.
  //
  // `BigInt()` throws a RangeError for anything that is not an integer, so a
  // caller passing `Date.now() / 1000` unfloored — the obvious mistake, since
  // the parameter is in seconds and `Date.now()` is in milliseconds — would get
  // an opaque failure from inside the permit build. Check it here and say what
  // was wrong. Zero-deadline strategies never read the value, so they are exempt.
  if (strategy.approval.deadlineStrategy !== 'zero') {
    assertValidExpiry(expiry);
  }

  const deadline =
    strategy.approval.deadlineStrategy === 'zero' ? 0n : BigInt(expiry);

  // Get nonce if required
  const nonce =
    strategy.approval.nonceStrategy === 'chain'
      ? BigInt(await getPermitNonce({ owner: account, chainId, rpcUrl, env }))
      : 0n;

  // Build typed data using config
  const typedData = buildTypedData({
    mode: strategy.approval.mode,
    account,
    chainId,
    verifyingContract: tokenAddress,
    domainName: strategy.approval.domainName,
    domainVersion: strategy.approval.domainVersion,
    spender: spenderAddress,
    value: BigInt(permitValue.toFixed(0, BigNumber.ROUND_DOWN)),
    nonce,
    deadline,
  });

  // Delegate to appropriate handler based on mode
  if (strategy.approval.mode === 'approve') {
    return handleApproveFlow({
      account,
      chainId,
      provider,
      rpcUrl,
      tokenAddress,
      tokenAbi,
      spenderAddress,
      typedData,
      requiredAmount: BigInt(permitValue.toFixed(0, BigNumber.ROUND_DOWN)),
    });
  }

  // Permit mode
  return handlePermitFlow({ chainId, provider, typedData });
}
