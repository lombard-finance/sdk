import Web3, { FMT_BYTES, FMT_NUMBER } from 'web3';

interface IGetWalletInfo {
  account: string;
  chainId: number;
}

/**
 * Retrieves wallet information.
 *
 * @param web3 - The Web3 instance.
 * @returns A promise that resolves to an object containing the account and chainId.
 * @throws An error if no account is found.
 */
export async function getWalletInfo(web3: Web3): Promise<IGetWalletInfo> {
  const [account] = await web3.eth.getAccounts();

  if (!account) {
    throw new Error('No account found');
  }

  const chainId = await web3.eth.getChainId({
    bytes: FMT_BYTES.HEX,
    number: FMT_NUMBER.NUMBER,
  });

  return {
    account,
    chainId,
  };
}
