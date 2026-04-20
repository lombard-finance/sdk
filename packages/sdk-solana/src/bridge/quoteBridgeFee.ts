import { oft } from '@layerzerolabs/oft-v2-solana-sdk';
import { Env } from '@lombard.finance/sdk-common';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import BigNumber from 'bignumber.js';

import { getConfig, getRpcEndpoint } from '../const/getConfig';
import { ISolanaWalletProvider } from '../types';
import {
  getMinimalUmiInstance,
  getRecipientBytes32,
  validateBridgeAmount,
} from '../utils/bridgeUtils';

interface QuoteBridgeFeeParams {
  env: Env;
  provider: ISolanaWalletProvider;
  sendParams: {
    dstEid?: number;
    to: string;
    amountLD: number;
    minAmountLD: number;
    extraOptions: string;
    composeMsg: string;
    oftCmd: string;
  };
}

interface BridgeFeeQuote {
  nativeFee: string;
  lzTokenFee: string;
}

export async function quoteBridgeFee({
  env,
  provider,
  sendParams,
}: QuoteBridgeFeeParams): Promise<BridgeFeeQuote> {
  if (!provider.publicKey) {
    throw new Error('Wallet provider not connected. Cannot quote bridge fee.');
  }

  if (!sendParams.dstEid) {
    throw new Error('Destination chain LayerZero Endpoint ID is required.');
  }

  validateBridgeAmount(new BigNumber(sendParams.amountLD));

  const config = getConfig(env);
  const umi = getMinimalUmiInstance(getRpcEndpoint(env));
  const oftProgramId = umiPublicKey(config.lzOftAdapter);
  const mintPublicKey = umiPublicKey(config.lbtcTokenMint);
  const tokenEscrowPublicKey = umiPublicKey(config.lzEscrow);
  const recipientBytes32 = getRecipientBytes32(sendParams.to);

  try {
    const providerPublicKeyUmi = umiPublicKey(provider.publicKey.toBase58());

    const quote = await oft.quote(
      umi.rpc,
      {
        payer: providerPublicKeyUmi,
        tokenMint: mintPublicKey,
        tokenEscrow: tokenEscrowPublicKey,
      },
      {
        payInLzToken: false,
        to: recipientBytes32,
        dstEid: sendParams.dstEid,
        amountLd: BigInt(sendParams.amountLD),
        minAmountLd: 1n,
        options: new Uint8Array(),
        composeMsg: undefined,
      },
      {
        oft: oftProgramId,
      },
    );

    return {
      nativeFee: quote.nativeFee.toString(),
      lzTokenFee: quote.lzTokenFee.toString(),
    };
  } catch (error) {
    console.error('Error quoting Solana LayerZero fee:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to get LayerZero bridge quote: ${error.message}`);
    }
    throw new Error(
      'An unknown error occurred while quoting LayerZero bridge fee.',
    );
  }
}
