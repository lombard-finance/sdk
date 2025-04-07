import { Address } from 'viem';
import { Vault, VAULTS } from '..';
import axios from 'axios';

export type GetVaultPointsParameters = {
  /** The account address. */
  account: Address;
  /** The optional vault identifier */
  vaultKey?: Vault;
};

const POINTS_URL = 'https://api.veda.tech/points/user/{account}';

type Response = {
  Response: {
    [network: string]: {
      userChainVedaPointsSum: number;
      vaults: {
        [vaultAddress: string]: {
          name: string;
          timestamp: string;
          totalPoints: number;
        };
      };
    };
  };
};

/**
 * Gets the points earned by specified account in the DeFi vault.
 */
export async function getVaultPoints({
  account,
  vaultKey = Vault.Veda,
}: GetVaultPointsParameters) {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  const url = POINTS_URL.replace('{account}', account);
  const { data } = await axios.get<Response>(url, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });

  const vedaPointsBreakdown: Record<string, number> = {};
  const entries = Object.entries(data.Response);
  for (const [network, points] of entries) {
    if (network === 'userTotalVedaPointsSum') continue;

    const vaultPoints = Object.entries(points.vaults).find(
      ([v]) => v === vault.vaultContract.address,
    );
    if (vaultPoints) {
      const [, data] = vaultPoints;
      const p = Number.isNaN(data.totalPoints) ? 0 : data.totalPoints;
      vedaPointsBreakdown[network] = p;
    }
  }

  let totalPoints = 0;
  for (const p of Object.values(vedaPointsBreakdown)) {
    totalPoints += p;
  }

  return {
    totalPoints,
    pointsBreakdown: vedaPointsBreakdown,
  };
}
