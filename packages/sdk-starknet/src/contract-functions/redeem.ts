import { Env, getOutputScript } from '@lombard.finance/sdk-common';
import {
  BtcAddressType,
  getBtcAddressType,
} from '@lombard.finance/sdk-common/utils/btc-address-type';
import { StarknetChainId } from '../utils/chains';
import { WalletAccountParameters } from '../utils/wallet-account';
import { getTokenContract, TokenParameters } from '../tokens/lib/tokens';
import { toBaseDenomination } from '@lombard.finance/sdk-common/utils/numbers';
import { ByteArray, CallData, uint256 } from 'starknet';
import { ERR_UNEXPECTED_OUTPUT_SCRIPT } from '../utils/err';
import { EnvParameters } from '../utils/env';

export type RedeemParameters = TokenParameters &
  WalletAccountParameters &
  EnvParameters & {
    /** The amount, e.g. 1.2 LBTC */
    amount: BigNumber.Value;
    /** The destination BTC address */
    btcAddress: string;
  };

/**
 * Redeems (unstakes) specified amount of token and sends equivalent amount of
 * BTC to the provided BTC address.
 */
export async function redeem({
  amount,
  btcAddress,
  token,
  walletAccount,
  env,
}: RedeemParameters) {
  const chainId = (await walletAccount.getChainId()) as StarknetChainId;

  const tokenParams = {
    token,
    chainId,
    provider: walletAccount,
  };

  const tokenContract = getTokenContract({
    ...tokenParams,
    contractType: 'token',
    env,
  });

  const decimals = Number(await tokenContract.decimals());
  const amountBaseDenom = toBaseDenomination(amount, decimals);

  const bridgeContract = getTokenContract({
    ...tokenParams,
    contractType: 'bridge',
    env,
  });

  const script = getOutputScript(
    btcAddress,
    chainId === StarknetChainId.SN_MAIN ? Env.prod : Env.stage,
  );

  const addressType = getBtcAddressType(btcAddress);

  let script_pub_key: ByteArray | undefined = undefined;
  if (
    addressType === BtcAddressType.p2tr ||
    addressType === BtcAddressType.p2wsh
  ) {
    const word = `0x${script.slice(2, 64)}`;
    const pending_word = `0x${script.slice(64) || '0'}`;

    script_pub_key = {
      data: [word],
      pending_word: pending_word,
      pending_word_len: script.slice(64).length / 2,
    };
  }

  if (addressType === BtcAddressType.p2wpkh) {
    script_pub_key = {
      data: [],
      pending_word: `0x${script.slice(2)}`,
      pending_word_len: script.slice(2).length / 2,
    };
  }

  if (!script_pub_key) {
    throw ERR_UNEXPECTED_OUTPUT_SCRIPT;
  }

  const { transaction_hash } = await walletAccount.execute({
    contractAddress: bridgeContract.address,
    entrypoint: 'redeem',
    calldata: CallData.compile({
      script_pub_key,
      amount: uint256.bnToUint256(amountBaseDenom.toNumber()),
    }),
  });

  return transaction_hash;
}
