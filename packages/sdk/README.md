### Installation

#### npm

```bash
npm i @lombard.finance/sdk
```

#### yarn

```bash
yarn add @lombard.finance/sdk
```

### Example

```ts
import { getLatestBtcAddress } from '@lombard.finance/sdk';

/**
 * Retrieves the latest Bitcoin address associated with a given blockchain and address.
 *
 * @param {1 | 17000} chainId - The ID of the blockchain to query (Eth Mainnet or Holesky).
 * @param {string} address - User's evm compatible address.
 * @returns {Promise<string | null>} - The latest Bitcoin address or null if none is found.
 * @throws {Error} - Throws an error if the blockchain is not supported or the request fails.
 */
const latestBtcAddress = await getLatestBtcAddress(chainId, address);
```
