import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';

import { CommonWriteParameters } from '../../common/parameters';
import {
  ApprovalMode,
  DefiProtocol,
  getStakeAndBakeStakedToken,
  StakeAndBakeToken,
} from '../../defi/defi-registry';
import { LombardError, ValidationErrorCode } from '../../shared/errors';
import {
  assertPositiveBaseUnits,
  assertValidExpiry,
} from '../../shared/validation/signing';
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
   * The approved amount that will be automatically claimed and deposited to the
   * chosen vault, **in token base units** — satoshis on the BTC routes, where
   * 0.001 BTC is `100000`.
   *
   * This is base units rather than the human-readable amount the other write
   * helpers take, because the value goes into the permit as it stands. On a
   * route whose amount strategy converts (BTC to LBTC) the current ratio is
   * applied to it internally.
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
  /**
   * Explicit permit nonce. When omitted, permit-mode strategies read
   * `nonces(owner)` from the staked token and approve-mode strategies use 0.
   *
   * Pass it to sign the next permit in a sequence while earlier ones are still
   * pending (see `getNextStakeAndBakeNonce`), or to replace a pending permit by
   * re-signing its nonce with a new value or deadline.
   */
  nonce?: bigint | number | string;
  /**
   * Approve mode only: the sum, in token base units, of the spender's other
   * pending deposits for this owner. The allowance checked and, if short,
   * approved is `pendingAllowance + value`, so a new deposit does not shrink
   * the allowance the pending ones rely on. Defaults to 0. Ignored in permit
   * mode.
   */
  pendingAllowance?: BigNumber.Value;
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
 * @param {BigNumber.Value} parameters.value - The amount to authorise, in token base units (satoshis on the BTC routes). Converted to LBTC using the current ratio where the route calls for it.
 * @param {number} parameters.expiry = The optional expiration UNIX time of the signature.
 * @param {DefiProtocol} parameters.vaultKey - The optional DeFi vault identifier.
 * @param {bigint | number | string} parameters.nonce - The optional explicit permit nonce.
 * @param {BigNumber.Value} parameters.pendingAllowance - Approve mode: base units already owed to the spender by other pending deposits.
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
  // TODO: Rename vaultKey to protocol
  vaultKey: protocol = DefiProtocol.Veda,
  token = 'BTC',
  chainId,
  provider,
  rpcUrl,
  env = DEFAULT_ENV,
  nonce: nonceOverride,
  pendingAllowance,
}: ISignStakeAndBakeParams): Promise<ISignStakeAndBakeResult> {
  const strategy = getStakeAndBakeConfig(protocol, token, chainId, env);

  // Both validated here, before anything reaches the network. Left until the
  // deadline was built, a bad expiry first cost an exchange-ratio request, and
  // a failure there reported itself instead of the parameter that was wrong.
  // Zero-deadline strategies never read the expiry, so they are exempt from
  // that half; every route reads the value.
  assertPositiveBaseUnits(
    value,
    'value',
    'an amount in token base units — satoshis on the BTC routes',
  );
  if (strategy.approval.deadlineStrategy !== 'zero') {
    assertValidExpiry(expiry);
  }
  const explicitNonce =
    nonceOverride === undefined ? undefined : parseNonce(nonceOverride);
  const pendingBaseUnits =
    pendingAllowance === undefined
      ? 0n
      : parseNonNegativeBaseUnits(pendingAllowance, 'pendingAllowance');

  const spenderAddress = strategy.spenderContract.address;

  // Calculate permit value (with conversion if needed)
  const permitValue =
    strategy.amountStrategy === 'btcToLbtc'
      ? await calculateStakeAndBakeLBTCAmount(value, env)
      : new BigNumber(value);

  // The ratio divides, so a value small enough in satoshis rounds down to
  // nothing: one satoshi over a ratio above 1 is zero LBTC. Authorising zero
  // has no downstream symptom — the permit signs, stores and reports success
  // while granting nothing — so it is refused here rather than shipped.
  const permitBaseUnits = BigInt(permitValue.toFixed(0, BigNumber.ROUND_DOWN));
  if (permitBaseUnits <= 0n) {
    throw new LombardError(
      ValidationErrorCode.AMOUNT_TOO_SMALL,
      `value ${String(value)} converts to ${permitValue.toFixed()} on this ` +
        `route, which rounds down to zero base units. Nothing would be ` +
        `authorised.`,
    );
  }

  // The permit is signed over the token the spender actually stakes, which is
  // not always the registry token: the virtual 'BTC' token stakes LBTC on one
  // strategy and BTC.b on another. Always the token address, never an adapter.
  const stakedToken = getStakeAndBakeStakedToken(strategy);
  const tokenContract = await getStakeAndBakeTokenContract(
    stakedToken,
    chainId,
    env,
  );
  const tokenAddress = tokenContract.address;
  const tokenAbi = tokenContract.abi;

  const deadline =
    strategy.approval.deadlineStrategy === 'zero' ? 0n : BigInt(expiry);

  // An explicit nonce wins; otherwise read it from the staked token.
  const nonce =
    explicitNonce ??
    (strategy.approval.nonceStrategy === 'chain'
      ? BigInt(
          await getPermitNonce({
            owner: account,
            token: stakedToken,
            chainId,
            rpcUrl,
            env,
          }),
        )
      : 0n);

  // Build typed data using config
  const typedData = buildTypedData({
    mode: strategy.approval.mode,
    account,
    chainId,
    verifyingContract: tokenAddress,
    domainName: strategy.approval.domainName,
    domainVersion: strategy.approval.domainVersion,
    spender: spenderAddress,
    value: permitBaseUnits,
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
      requiredAmount: pendingBaseUnits + permitBaseUnits,
    });
  }

  // Permit mode
  return handlePermitFlow({ chainId, provider, typedData });
}

function parseNonce(value: bigint | number | string): bigint {
  let parsed: bigint | undefined;
  try {
    if (typeof value === 'bigint') {
      parsed = value;
    } else if (typeof value === 'number') {
      parsed = Number.isSafeInteger(value) ? BigInt(value) : undefined;
    } else if (/^\d+$/.test(value.trim())) {
      parsed = BigInt(value.trim());
    }
  } catch {
    parsed = undefined;
  }
  if (parsed === undefined || parsed < 0n) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `nonce must be a non-negative integer, received ${String(value)}.`,
    );
  }
  return parsed;
}

function parseNonNegativeBaseUnits(
  value: BigNumber.Value,
  paramName: string,
): bigint {
  const amount = new BigNumber(value);
  if (!amount.isFinite() || amount.isNegative() || !amount.isInteger()) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `${paramName} must be a non-negative whole number of token base ` +
        `units, received ${String(value)}.`,
    );
  }
  return BigInt(amount.toFixed(0));
}
