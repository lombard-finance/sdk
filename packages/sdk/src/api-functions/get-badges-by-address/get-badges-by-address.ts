import { Address } from 'viem';
import { IEnvParam } from '../../common/parameters';

export type GetBadgesByAddress = {
  /** The account address */
  address: Address;
} & IEnvParam;

export async function getBadgesByAddress({ address, env }: GetBadgesByAddress) {
  // TODO: Move badges logic to SDK
  throw new Error('Not implemented');
}
