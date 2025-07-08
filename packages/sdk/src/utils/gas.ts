import BigNumber from 'bignumber.js';
import { PublicClient } from 'viem';

export const estimateGasFees = async (
  publicClient: PublicClient,
  callData: Parameters<PublicClient['estimateContractGas']>[0],
  overwriteMaxPriorityFeePerGas?: bigint,
) => {
  const fees = await publicClient.estimateFeesPerGas();

  const multiplier = BigNumber(String(fees.maxFeePerGas)).dividedBy(
    String(fees.maxPriorityFeePerGas),
  );

  const maxPriorityFeePerGas = overwriteMaxPriorityFeePerGas
    ? overwriteMaxPriorityFeePerGas
    : fees.maxPriorityFeePerGas;

  const maxFeePerGas = overwriteMaxPriorityFeePerGas
    ? BigInt(
        BigNumber(String(maxPriorityFeePerGas))
          .multipliedBy(multiplier)
          .toFixed(0),
      )
    : fees.maxFeePerGas;

  const gas = await publicClient.estimateContractGas(callData);

  const gasEstimationData = {
    gas,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };

  return gasEstimationData;
};
