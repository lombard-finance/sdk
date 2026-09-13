import { createPublicClient, http, parseEther } from 'viem';
import { sepolia, avalancheFuji } from 'viem/chains';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SuiClient } from '@mysten/sui/client';
import { RpcProvider } from 'starknet';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// BFF RPC URLs (same as frontend uses)
const BFF_RPC_BASE = 'https://bff.prod.lombard-fi.com/multi-rpc/v2';
const RPC_URLS = {
  sepolia: `${BFF_RPC_BASE}/eth_sepolia`,
  fuji: 'https://api.avax-test.network/ext/bc/C/rpc',
  solanaDevnet: 'https://api.devnet.solana.com',
  starknetSepolia:
    'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/demo',
};

// Sui Foundation disabled JSON-RPC on its public fullnodes, so `getFullnodeUrl()`
// no longer works. This node still serves it.
const SUI_TESTNET_RPC_URL = 'https://sui-testnet-endpoint.blockvision.org';

interface WalletBalances {
  chain: string;
  address: string;
  native: string;
  lbtc: string;
  btcb: string;
}

async function checkBalances(): Promise<WalletBalances[]> {
  const results: WalletBalances[] = [];

  // Sepolia - using BFF RPC (same as frontend)
  if (process.env.TEST_EVM_ADDRESS) {
    try {
      const sepoliaClient = createPublicClient({
        chain: sepolia,
        transport: http(RPC_URLS.sepolia),
      });

      const sepoliaEthBalance = await sepoliaClient.getBalance({
        address: process.env.TEST_EVM_ADDRESS as `0x${string}`,
      });

      results.push({
        chain: 'Sepolia',
        address: process.env.TEST_EVM_ADDRESS,
        native: `${(Number(sepoliaEthBalance) / 1e18).toFixed(4)} ETH`,
        lbtc: '...',
        btcb: '...',
      });
    } catch (e) {
      results.push({
        chain: 'Sepolia',
        address: process.env.TEST_EVM_ADDRESS || 'N/A',
        native: 'Error fetching',
        lbtc: '...',
        btcb: '...',
      });
    }
  }

  // Avalanche Fuji
  if (process.env.TEST_EVM_ADDRESS) {
    try {
      const fujiClient = createPublicClient({
        chain: avalancheFuji,
        transport: http(RPC_URLS.fuji),
      });

      const fujiAvaxBalance = await fujiClient.getBalance({
        address: process.env.TEST_EVM_ADDRESS as `0x${string}`,
      });

      results.push({
        chain: 'Avalanche Fuji',
        address: process.env.TEST_EVM_ADDRESS,
        native: `${(Number(fujiAvaxBalance) / 1e18).toFixed(4)} AVAX`,
        lbtc: '...',
        btcb: '...',
      });
    } catch (e) {
      results.push({
        chain: 'Avalanche Fuji',
        address: process.env.TEST_EVM_ADDRESS || 'N/A',
        native: 'Error fetching',
        lbtc: '...',
        btcb: '...',
      });
    }
  }

  // Solana Devnet
  if (process.env.TEST_SOLANA_PUBLIC_KEY) {
    try {
      const connection = new Connection(RPC_URLS.solanaDevnet, 'confirmed');
      const pubkey = new PublicKey(process.env.TEST_SOLANA_PUBLIC_KEY);
      const solBalance = await connection.getBalance(pubkey);

      results.push({
        chain: 'Solana Devnet',
        address: process.env.TEST_SOLANA_PUBLIC_KEY,
        native: `${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`,
        lbtc: '...',
        btcb: 'N/A',
      });
    } catch (e) {
      results.push({
        chain: 'Solana Devnet',
        address: process.env.TEST_SOLANA_PUBLIC_KEY || 'N/A',
        native: 'Error fetching',
        lbtc: '...',
        btcb: 'N/A',
      });
    }
  }

  // Sui Testnet
  if (process.env.TEST_SUI_ADDRESS) {
    try {
      const suiClient = new SuiClient({ url: SUI_TESTNET_RPC_URL });
      const suiBalance = await suiClient.getBalance({
        owner: process.env.TEST_SUI_ADDRESS,
      });

      results.push({
        chain: 'Sui Testnet',
        address: process.env.TEST_SUI_ADDRESS,
        native: `${(Number(suiBalance.totalBalance) / 1e9).toFixed(4)} SUI`,
        lbtc: '...',
        btcb: 'N/A',
      });
    } catch (e) {
      results.push({
        chain: 'Sui Testnet',
        address: process.env.TEST_SUI_ADDRESS || 'N/A',
        native: 'Error fetching',
        lbtc: '...',
        btcb: 'N/A',
      });
    }
  }

  // Starknet Sepolia
  if (process.env.TEST_STARKNET_ADDRESS) {
    try {
      const provider = new RpcProvider({ nodeUrl: RPC_URLS.starknetSepolia });
      // ETH contract on Starknet Sepolia
      const ethContractAddress =
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const balance = await provider.callContract({
        contractAddress: ethContractAddress,
        entrypoint: 'balanceOf',
        calldata: [process.env.TEST_STARKNET_ADDRESS],
      });
      const balanceLow = BigInt(balance[0]);
      const ethValue = Number(balanceLow) / 1e18;

      results.push({
        chain: 'Starknet Sepolia',
        address: process.env.TEST_STARKNET_ADDRESS,
        native: `${ethValue.toFixed(4)} ETH`,
        lbtc: '...',
        btcb: 'N/A',
      });
    } catch (e) {
      results.push({
        chain: 'Starknet Sepolia',
        address: process.env.TEST_STARKNET_ADDRESS || 'N/A',
        native: 'Error fetching',
        lbtc: '...',
        btcb: 'N/A',
      });
    }
  }

  return results;
}

async function main() {
  console.log('Checking test wallet balances...\n');

  const balances = await checkBalances();

  console.table(balances);

  console.log('\n⚠️  Fund wallets from faucets if balances are low!');
}

main();
