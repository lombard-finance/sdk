import axios from 'axios';
import { supportedChains } from './chainConfig';

export async function getLatestBtcAddress(
  chainId: keyof typeof supportedChains,
  address: string,
): Promise<string | null> {
  const chainConfig = supportedChains[chainId];

  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  try {
    const {
      data: { addresses },
    } = await axios.get(`${chainConfig.baseUrl}/api/v1/address`, {
      params: {
        to_address: address,
        to_blockchain: 'DESTINATION_BLOCKCHAIN_ETHEREUM',
        limit: 1,
        offset: 0,
        asc: false,
      },
    });

    if (addresses && addresses.length > 0) {
      return addresses[0].btc_address;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching the latest BTC address:', error);
    throw error;
  }
}
