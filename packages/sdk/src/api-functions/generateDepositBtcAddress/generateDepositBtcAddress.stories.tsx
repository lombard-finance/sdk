import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { useCallback, useState } from 'react';

import { ChainId, SOLANA_DEVNET_CHAIN } from '../../common/chains';
import { allChainSelector, makeTokenSelector } from '../../stories/arg-types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import { Token } from '../../tokens/token-addresses';
import {
  generateDepositBtcAddress,
  IGenerateDepositBtcAddressParams,
} from './generateDepositBtcAddress';

// --- EVM story (original) ---

export function StoryView(props: IGenerateDepositBtcAddressParams) {
  const { data, error, isLoading, refetch } = useQuery(
    () => generateDepositBtcAddress(props),
    [props],
    false,
  );

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={generateDepositBtcAddress.name}
      />
      <CodeBlock text={error || data} />
    </>
  );
}

// --- Solana story with wallet connect + sign ---

const SOLANA_UNIFIED_CHAIN_IDS: Record<string, string> = {
  'solana:devnet':
    '1063388738761200999231335106130623820923059005171000690717713454345365488555',
  'solana:mainnet-beta':
    '977795225684978869420534708198397830756781198870511151491297393641706520304',
};

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: { toBase58: () => string; toBytes: () => Uint8Array };
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<{
    signature: Uint8Array;
    publicKey: { toBase58: () => string };
  }>;
}

function getPhantom(): PhantomProvider | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w?.phantom?.solana ?? w?.solana ?? null;
}

function base58Encode(bytes: Uint8Array): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = BigInt(0);
  for (const byte of bytes) num = num * 256n + BigInt(byte);
  let str = '';
  while (num > 0n) {
    str = ALPHABET[Number(num % 58n)] + str;
    num /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    str = '1' + str;
  }
  return str || '1';
}

interface SolanaStoryArgs {
  token: Token;
  chainId: string;
  env: Env;
  partnerId: string;
}

function SolanaStoryView({ token, chainId, env, partnerId }: SolanaStoryArgs) {
  const [address, setAddress] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [signLoading, setSignLoading] = useState(false);

  const handleConnect = useCallback(async () => {
    setConnectError(null);
    const phantom = getPhantom();
    if (!phantom) {
      setConnectError('Phantom wallet not found. Please install it.');
      return;
    }
    try {
      const resp = await phantom.connect();
      setAddress(resp.publicKey.toBase58());
      setSignature(null);
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    const phantom = getPhantom();
    if (phantom) await phantom.disconnect().catch(() => {});
    setAddress(null);
    setSignature(null);
  }, []);

  const handleSign = useCallback(async () => {
    const phantom = getPhantom();
    if (!phantom || !address) return;

    const unifiedId = SOLANA_UNIFIED_CHAIN_IDS[chainId];
    if (!unifiedId) {
      setConnectError(`No unified chain ID for ${chainId}`);
      return;
    }

    setSignLoading(true);
    setConnectError(null);
    try {
      const message = `destination chain id is ${unifiedId}`;
      const messageBytes = new TextEncoder().encode(message);
      const { signature: sigBytes } = await phantom.signMessage(messageBytes);
      setSignature(base58Encode(sigBytes));
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : String(e));
    } finally {
      setSignLoading(false);
    }
  }, [address, chainId]);

  const { data, error, isLoading, refetch } = useQuery(
    () => {
      if (!address || !signature) throw new Error('Connect and sign first.');
      return generateDepositBtcAddress({
        address,
        token,
        chainId: chainId as typeof SOLANA_DEVNET_CHAIN,
        signature,
        env,
        partnerId,
      });
    },
    [address, signature, token, chainId, env, partnerId],
    false,
  );

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        {!address ? (
          <Button onClick={handleConnect}>Connect Phantom</Button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <Button size="small" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {connectError && (
        <div style={{ color: 'red', marginBottom: 8, fontSize: 13 }}>
          {connectError}
        </div>
      )}

      {address && !signature && (
        <div style={{ marginBottom: 12 }}>
          <Button
            onClick={handleSign}
            isLoading={signLoading}
            disabled={signLoading}
          >
            Sign Destination Address
          </Button>
        </div>
      )}

      {signature && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
            Signature:
          </div>
          <code style={{ fontSize: 11, wordBreak: 'break-all' }}>
            {signature}
          </code>
        </div>
      )}

      {address && signature && (
        <Button
          onClick={refetch}
          disabled={isLoading}
          isLoading={isLoading}
          actionName={generateDepositBtcAddress.name}
        />
      )}

      <CodeBlock text={error || data} />
    </div>
  );
}

// --- Meta ---

const meta = {
  title: 'api/generateDepositBtcAddress',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-post')],
  argTypes: {
    ...allChainSelector,
    ...makeTokenSelector([Token.LBTC, Token.BTCK, Token.BTCb]),
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

// --- Stories ---

const evmExample = {
  signature:
    '0x9ca1c54532b42da150d7e1c87a55d2601a245d2a34f5c442e40d2793e2e7b739095cd1213aadd45db96d8459dd3a612daa01a08f661a5d67290bd806e4862f101c',
  typedData:
    '{"account":"0x659579F1460c38C3ce3288b47b074646CEF855fc","domain":{"name":"Lombard Staked Bitcoin","version":"1","chainId":1,"verifyingContract":"0x8236a87084f8b84306f72007f36f2618a5634494"},"message":{"chainId":1,"fee":"1100","expiry":1746119680},"primaryType":"feeApproval","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"feeApproval":[{"name":"chainId","type":"uint256"},{"name":"fee","type":"uint256"},{"name":"expiry","type":"uint256"}]}}',
};

export const EVM: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    token: Token.LBTC,
    chainId: ChainId.ethereum,
    signature: evmExample.signature,
    eip712Data: evmExample.typedData,
    env: DEFAULT_ENV,
    referrerCode: '',
    partnerId: 'lombard',
  },
};

export const SolanaBTCb: StoryObj<typeof SolanaStoryView> = {
  name: 'Solana — BTC.b',
  render: (args) => <SolanaStoryView {...args} />,
  args: {
    token: Token.BTCb,
    chainId: SOLANA_DEVNET_CHAIN,
    env: Env.dev,
    partnerId: 'test',
  },
  argTypes: {
    ...makeTokenSelector([Token.LBTC, Token.BTCb]),
  },
};

export const SolanaLBTC: StoryObj<typeof SolanaStoryView> = {
  name: 'Solana — LBTC',
  render: (args) => <SolanaStoryView {...args} />,
  args: {
    token: Token.LBTC,
    chainId: SOLANA_DEVNET_CHAIN,
    env: Env.dev,
    partnerId: 'test',
  },
  argTypes: {
    ...makeTokenSelector([Token.LBTC, Token.BTCb]),
  },
};
