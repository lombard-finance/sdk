import BigNumber from 'bignumber.js';
import { isVedaVaultChain, Vault, VAULTS } from '../config';
import { CommonWriteParameters } from '../../../common/parameters';
import { makePublicClient } from '../../../clients/public-client';
import { makeWalletClient } from '../../../clients/wallet-client';
import toBigInt from '../../../utils/numbers';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../../common/chains';
import { getErrorMessage } from '../../../utils/err';
import {
  fromBaseDenomination,
  getTokenInfo,
  toBaseDenomination,
} from '../../../tokens/tokens';
import { Token } from '../../../tokens/token-addresses';

export type DepositParameters = {
  /** The amount to be deposited into the DeFi vault. */
  amount: BigNumber.Value;
  /**
   * A flag determining whether the amount should be approved within
   * the execution of this function. If set to `false` it will
   * throw an error when the deposit amount exceeds allowance.
   */
  approve?: boolean;
  /** The optional deposit asset. */
  token?: Token;
  /** The vault identifier. */
  vaultKey?: Vault;
} & CommonWriteParameters;

/**
 * Deposits specified amount to the chosen DeFi vault.
 * @param {DepositParameters} parameters
 * @param {BigNumber.Value} parameters.amount - The deposit amount.
 * @param {boolean} parameters.approve - The optional flag determining whether approve actions should be performed.
 * @param {Token} parameters.token - The optional deposit asset.
 * @param {Vault} parameters.vaultKey - The vault identifier.
 * @param {Address} parameters.account - The EVM account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The EIP1193 provider.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 *
 * @returns {Promise<Hash>}
 */
export async function deposit({
  amount: amountRaw,
  approve = true,
  token = Token.LBTC,
  vaultKey = Vault.Veda,
  account,
  chainId,
  provider,
  rpcUrl,
  env,
}: DepositParameters) {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  if (!isVedaVaultChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(', ')}`,
    );
  }

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ provider, chainId });

  const depositToken = await getTokenInfo(token, chainId, env, rpcUrl);
  if (!depositToken) {
    throw new Error(`Unknown deposit token: ${token}`);
  }

  const amount = BigNumber(amountRaw);
  const amountBase = toBigInt(
    toBaseDenomination(amount, depositToken.decimals),
  );

  const allowanceRaw = await publicClient.readContract({
    address: depositToken.address,
    abi: depositToken.abi,
    functionName: 'allowance',
    args: [account, vault.vaultContract.address],
  });
  const allowance = fromBaseDenomination(
    String(allowanceRaw),
    depositToken.decimals,
  );

  const balanceRaw = await publicClient.readContract({
    address: depositToken.address,
    abi: depositToken.abi,
    functionName: 'balanceOf',
    args: [account],
  });
  const balance = fromBaseDenomination(
    String(balanceRaw),
    depositToken.decimals,
  );

  // check if amount exceeds balance
  if (amount.isGreaterThan(balance)) {
    throw new Error(
      `The deposit amount exceeds the account's balance. \nDeposit amount: ${amount.toFixed()} \nBalance: ${balance.toFixed()}`,
    );
  }

  // check if amount exceeds allowance
  if (amount.isGreaterThan(allowance)) {
    const exceededMessage = `The deposit amount exceeds allowance. \nDeposit amount: ${amount.toFixed()} \nAllowance: ${allowance.toFixed()}`;
    if (!approve) {
      throw new Error(exceededMessage);
    }

    // try to approve new amount
    console.info(exceededMessage);
    try {
      console.info(`Trying to approve ${amountBase}`);
      const { request } = await publicClient.simulateContract({
        account,
        chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
        address: depositToken.address,
        abi: depositToken.abi,
        functionName: 'approve',
        args: [vault.vaultContract.address, amountBase],
      });

      const txHash = await walletClient.writeContract(request);
      console.info(`Approve tx hash: ${txHash}`);
      console.info(`Approved ${amountBase} for ${vault.vaultContract.address}`);
    } catch (err) {
      const msg = getErrorMessage(err);
      throw new Error(
        `Could not approve ${amountBase} for ${vault.vaultContract.address}. \nReason: ${msg}`,
      );
    }
  }

  // deposit funds via the teller contract
  const { request } = await publicClient.simulateContract({
    account,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    address: vault.tellerContracts[chainId].address,
    abi: vault.tellerContracts[chainId].abi,
    functionName: 'deposit',
    args: [depositToken.address, amountBase, 0n],
  });
  const txHash = await walletClient.writeContract(request);
  return txHash;
}
