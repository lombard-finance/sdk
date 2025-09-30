import type { Meta, StoryObj } from '@storybook/react';
import { functionType } from './components/decorators';
import { Button } from './components/Button';
import useQuery from './hooks/use-query';
import { ConnectButton } from './components/ConnectButton';
import { ReactNode, useState } from 'react';
import { useConnection } from './hooks/use-connection';
import { starknetContext } from './components/decorators/starknet-context';
import { Token } from '../tokens/lib/tokens';
import {
  Env,
  generateDepositBtcAddress,
  getDepositBtcAddress,
  getDepositsByAddress,
  IDeposit,
} from '@lombard.finance/sdk';
import { signLbtcDestinationAddrStarknet } from '../wallet-functions/sign-message';
import { balanceOf } from '../contract-functions/balance-of';
import BigNumber from 'bignumber.js';
import { mint } from '../contract-functions/mint';
import { redeem } from '../contract-functions/redeem';

const meta = {
  title: 'flow',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('flow'), starknetContext()],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    env: Env.stage,
    partnerId: 'test',
  },
};

type Props = { env: Env; partnerId: string };

export function StoryView(props: Props) {
  const [btcDepositAddress, setBtcDepositAddress] = useState<
    string | undefined
  >(undefined);

  const [destinationSignature, setDestinationSignature] = useState<
    string | undefined
  >(undefined);

  const [pubKey, setPubKey] = useState<string | undefined>(undefined);

  const [deposits, setDeposits] = useState<IDeposit[]>([]);

  const [selectedDeposit, setSelectedDeposit] = useState<string | undefined>(
    undefined,
  );

  const [mintTx, setMintTx] = useState<string | undefined>(undefined);

  const [balance, setBalance] = useState<BigNumber>(BigNumber(0));

  const [redeemData, setRedeemData] = useState({
    amount: balance,
    btcAddress: '',
    token: Token.LBTC,
  });
  const [redeemTx, setRedeemTx] = useState<string | undefined>(undefined);

  const { account } = useConnection();

  // 1 - Check deposit address
  const s01_action = async () => {
    if (!account) return;

    const chainId = await account.getChainId();

    const depositAddress = await getDepositBtcAddress({
      address: account.address,
      chainId,
      env: props.env,
      partnerId: props.partnerId,
    });

    setBtcDepositAddress(depositAddress);
  };
  const {
    error: s01_error,
    isLoading: s01_loading,
    refetch: s01_init,
  } = useQuery(s01_action, [], false);

  // 2 - Generate deposit address
  const s02_action = async () => {
    if (!account) return;

    const chainId = await account.getChainId();

    const sig = await signLbtcDestinationAddrStarknet({
      walletAccount: account,
      chainId,
    });

    setDestinationSignature(sig.signatureHex);
    setPubKey(sig.pubKey);

    const depositAddress = await generateDepositBtcAddress({
      address: account.address,
      chainId,
      signature: sig.signatureHex,
      pubKey: sig.pubKey,
      env: props.env,
      partnerId: props.partnerId,
    });

    setBtcDepositAddress(depositAddress);
  };
  const {
    error: s02_error,
    isLoading: s02_loading,
    refetch: s02_init,
  } = useQuery(s02_action, [], false);

  // 3.0 - Make deposit
  // 3.1 - Check deposits
  const s03_action = async () => {
    if (!account) return;

    const deposits = await getDepositsByAddress({
      address: account.address,
      env: props.env,
    });

    setDeposits(deposits);
  };
  const {
    error: s03_error,
    isLoading: s03_loading,
    refetch: s03_init,
  } = useQuery(s03_action, [], false);

  // 4 - Mint
  const s04_action = async () => {
    if (!account) return;

    const chainId = await account.getChainId();

    if (deposits.length === 0) {
      throw new Error('No deposits fetched');
    }
    const d = deposits.find(d => d.txid === selectedDeposit);
    if (!selectedDeposit || !d) {
      throw new Error('Deposit not selected');
    }

    if (!d.index || !d.rawPayload || !d.signature || !d.payload) {
      throw new Error('Missing deposit parameters');
    }

    const mintParams = {
      amount: d.value,
      depositIndex: d.index,
      depositPayload: d.rawPayload,
      depositProofSignature: d.signature,
      depositTxId: d.txid,
      token: Token.LBTC,
      walletAccount: account,
      env: props.env,
    };

    const txHash = await mint(mintParams);

    setMintTx(txHash);
  };
  const {
    error: s04_error,
    isLoading: s04_loading,
    refetch: s04_init,
  } = useQuery(s04_action, [], false);

  // 5 - Check balance
  const s05_action = async () => {
    if (!account) return;

    const chainId = await account.getChainId();

    const balance = await balanceOf({
      account: account.address as `0x${string}`,
      token: Token.LBTC,
      chainId,
      env: props.env,
    });

    setBalance(balance);
  };
  const {
    error: s05_error,
    isLoading: s05_loading,
    refetch: s05_init,
  } = useQuery(s05_action, [], false);

  // 6 - Redeem
  const s06_action = async () => {
    if (!account) return;

    const txHash = await redeem({
      amount: redeemData.amount,
      btcAddress: redeemData.btcAddress,
      token: redeemData.token,
      walletAccount: account,
      env: props.env,
    });

    setRedeemTx(txHash);
  };
  const {
    error: s06_error,
    isLoading: s06_loading,
    refetch: s06_init,
  } = useQuery(s06_action, [], false);

  return (
    <>
      <div className="mb-4">
        <h2>0. Connect wallet</h2>
        <ConnectButton label="0. Connect Starknet wallet" />
      </div>

      <div className="mb-4">
        <h2>1. Get deposit address</h2>
        <Button onClick={s01_init} disabled={!account} isLoading={s01_loading}>
          1. Get deposit address
        </Button>
        <ValueBlock label="address" value={btcDepositAddress || 'no address'} />
        <ErrBlock err={s01_error} />
      </div>

      <div className="mb-4">
        <h2>2. Generate deposit address</h2>
        <Button onClick={s02_init} disabled={!account} isLoading={s02_loading}>
          1. Generate deposit address
        </Button>
        <ValueBlock label="signature" value={destinationSignature || ''} />
        <ValueBlock label="public key" value={pubKey || ''} />
        <ValueBlock label="address" value={btcDepositAddress || 'no address'} />
        <ErrBlock err={s02_error} />
      </div>

      <div className="mb-4">
        <h2>3. Check deposits</h2>
        <Button onClick={s03_init} disabled={!account} isLoading={s03_loading}>
          3. Check deposits
        </Button>
        <ValueBlock
          label="deposits"
          value={<pre>{JSON.stringify(deposits, undefined, 4)}</pre>}
        />
        <ErrBlock err={s03_error} />
      </div>

      <div className="mb-4">
        <h2>4. Mint</h2>
        <div className="select">
          <label>
            <span>Deposit to mint:</span>
            <select
              onChange={e => {
                setSelectedDeposit(e.target.value);
              }}
            >
              <option key="_" value="_">
                Select deposit
              </option>
              {deposits.map(d => {
                return (
                  <option key={d.txid} value={d.txid}>
                    {d.txid}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        <Button
          onClick={s04_init}
          disabled={!account || !selectedDeposit}
          isLoading={s04_loading}
        >
          4. Mint {selectedDeposit}
        </Button>
        <ValueBlock label="mint tx id" value={mintTx} />
        <ErrBlock err={s04_error} />
      </div>

      <div className="mb-4">
        <h2>5. Check balance</h2>
        <Button onClick={s05_init} disabled={!account} isLoading={s05_loading}>
          5. Check balances
        </Button>
        <ValueBlock label="lbtc balance" value={`${balance.toString()} LBTC`} />
        <ErrBlock err={s05_error} />
      </div>

      <div className="mb-4">
        <h2>5. Redeem</h2>
        <div>
          <label>
            <span>BTC address: </span>
            <input
              type="string"
              onChange={e => {
                const nv = e.target.value || '';
                setRedeemData({ ...redeemData, btcAddress: nv });
              }}
            />
          </label>

          <label className="px-2">
            <span>Amount: </span>
            <input
              type="number"
              onChange={e => {
                const nv = BigNumber(e.target.value || 0);
                setRedeemData({ ...redeemData, amount: nv });
              }}
            />
          </label>
        </div>

        <pre className="border p-2 my-2">
          {JSON.stringify(redeemData, null, 2)}
        </pre>

        <Button onClick={s06_init} disabled={!account} isLoading={s06_loading}>
          6. Redeem
        </Button>
        <ValueBlock label="redeem tx id" value={redeemTx} />
        <ErrBlock err={s06_error} />
      </div>
    </>
  );
}

const ValueBlock = ({ label, value }: { label?: string; value: ReactNode }) => {
  return (
    <div className="my-2 p-2 border border-primary">
      {label && <code className="pr-2">{label} </code>}
      {value}
    </div>
  );
};

const ErrBlock = ({ err }: { err?: string }) => {
  if (!err) return null;
  return (
    <div className="my-2 p-2 border border-danger bg-danger text-white">
      {err}
    </div>
  );
};
