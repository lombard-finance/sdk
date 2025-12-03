import { keccak_256 } from '@noble/hashes/sha3';

import { getTokenContract, TokenParameters } from '../tokens/lib/tokens';
import { makeDestinationChainId, StarknetChainId } from '../utils/chains';
import { Address, ensureHex } from '../utils/common';
import { EnvParameters } from '../utils/env';
import { parseProofHexToU256Tuples } from '../utils/span';
import { WalletAccountParameters } from '../utils/wallet-account';

export type MintParameters = TokenParameters &
  WalletAccountParameters &
  EnvParameters & {
    /** The amount to be minted, satoshi */
    amount: BigNumber.Value;
    /** The deposit tx index, e.g. 0 */
    depositIndex: number | string;
    /** The raw paylod of the BTC deposit */
    depositPayload: string;
    /** The proof signature of the BTC deposit */
    depositProofSignature: string;
    /** The transaction id of the BTC deposit  */
    depositTxId: string;
    /** The (optional) recipient address. Uses the connected address if left empty */
    recipientAddress?: Address;
  };

/**
 * Mints the specified amount of token (e.g LBTC) and transfers the funds
 * to the recipient given address.
 */
export async function mint({
  amount,
  depositPayload,
  depositTxId,
  depositIndex,
  depositProofSignature,
  token,
  walletAccount,
  recipientAddress,
  env,
}: MintParameters) {
  const chainId = (await walletAccount.getChainId()) as StarknetChainId;

  const btcTxIdBytes = (
    depositTxId.startsWith('0x') ? depositTxId.slice(2) : depositTxId
  ).match(/.{2}/g);
  if (!btcTxIdBytes) {
    throw new Error('Missing deposit tx id');
  }

  const tokenParams = {
    chainId,
    provider: walletAccount,
    token,
  };

  const basculeContract = getTokenContract({
    ...tokenParams,
    contractType: 'bascule',
    env,
  });

  const basculeDepositId = ensureHex(
    Buffer.from(
      keccak_256(Buffer.from(depositPayload.slice(8), 'hex')),
    ).toString('hex'),
  );

  const status = await basculeContract.get_deposit_status(
    BigInt(basculeDepositId),
  );

  if (status.activeVariant() !== 'Reported') {
    const msg = `The deposit cannot be claimed. Bascule status: ${status.activeVariant()}`;
    console.warn(msg); // TODO: Remove when Bascule configured
    // throw new Error(msg); // TODO: Re-enable once configured
  }

  const to_chain = BigInt(makeDestinationChainId(chainId));
  const recipient = recipientAddress || walletAccount.address;
  const tx_id = BigInt(ensureHex(btcTxIdBytes.reverse().join('')));
  const vout = Number(depositIndex);
  const proof = parseProofHexToU256Tuples(depositProofSignature);

  const bridgeContract = getTokenContract({
    ...tokenParams,
    contractType: 'bridge',
    env,
  });

  const { transaction_hash } = await bridgeContract.mint(
    to_chain,
    recipient,
    BigInt(amount.toString()),
    tx_id,
    vout,
    proof,
  );

  return transaction_hash;
}
