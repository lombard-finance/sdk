# @lombard.finance/sdk-devtools

Developer tools for the Lombard SDK. Provides debugging, inspection, and testing utilities for developers integrating with the Lombard protocol.

## How It Works

The SDK DevTools automatically hooks into SDK actions to collect events and state:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                YOUR APP                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────┐        ┌─────────────────────┐                    │
│   │    Lombard SDK      │        │     DevTools        │                    │
│   │                     │        │                     │                    │
│   │  const action = sdk │───────▶│  Automatically      │                    │
│   │  .chain.btc.deposit()│ events │  collects events,   │                    │
│   │                     │        │  tracks status      │                    │
│   └─────────────────────┘        └──────────┬──────────┘                    │
│                                              │                               │
│                                              ▼                               │
│                               ┌─────────────────────────┐                   │
│                               │    DevToolsPanel        │                   │
│                               │    (Visual debugger)    │                   │
│                               └─────────────────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
yarn add @lombard.finance/sdk-devtools
# or
npm install @lombard.finance/sdk-devtools
```

## Quick Start

### 1. Wrap Your App with DevToolsProvider

```tsx
import { DevToolsProvider } from '@lombard.finance/sdk-devtools';

function App() {
  return (
    <DevToolsProvider enabled={process.env.NODE_ENV !== 'production'}>
      <MyApp />
    </DevToolsProvider>
  );
}
```

### 2. Register SDK Actions

```tsx
import { useDevToolsContext } from '@lombard.finance/sdk-devtools';
import { createLombardSDK, Chain, AssetId } from '@lombard.finance/sdk';

function StakeComponent() {
  const { registerAction } = useDevToolsContext();
  const [stake, setStake] = useState(null);

  // Create and register the action
  useEffect(() => {
    async function init() {
      const sdk = await createLombardSDK({
        env: 'testnet',
        providers: { evm: () => window.ethereum },
      });

      const action = sdk.chain.btc.deposit({
        destChain: Chain.ETHEREUM,
        assetOut: AssetId.LBTC,
      });

      // Register with DevTools - events are now collected automatically!
      const unregister = registerAction('btc-deposit', action, {
        category: 'btc',
      });

      setStake(action);

      return unregister;
    }

    init();
  }, [registerAction]);

  // Use the action normally
  async function handleStake() {
    await stake.prepare({ amount: '0.001', recipient: '0x...' });
    await stake.authorize();
    const address = await stake.generateDepositAddress();
    console.log('Deposit to:', address);
  }

  return <button onClick={handleStake}>Stake BTC</button>;
}
```

### 3. Display DevTools Panel

```tsx
import {
  DevToolsPanel,
  useDevToolsContext,
} from '@lombard.finance/sdk-devtools';

function DebugPanel() {
  const { events, clearEvents, actions } = useDevToolsContext();

  // Get state summary for all registered actions
  const stateSummary = useMemo(() => {
    const summary = {};
    actions.forEach((reg, name) => {
      summary[name] = {
        status: reg.action.status,
        isLoading: reg.action.isLoading,
      };
    });
    return summary;
  }, [actions]);

  return (
    <DevToolsPanel
      events={events}
      onClearEvents={clearEvents}
      state={stateSummary}
    />
  );
}
```

## Alternative: Without Provider

For simpler setups or non-React apps, use the bridge directly:

```tsx
import { DevToolsBridge, DevToolsPanel } from '@lombard.finance/sdk-devtools';

// Create bridge
const bridge = new DevToolsBridge({ consoleLogging: true });

// Register action
const deposit = sdk.chain.btc.deposit({ ... });
const unregister = bridge.registerAction('deposit', deposit);

// Get events for display
const events = bridge.getEvents();

// In React:
function DebugView() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    return bridge.onEvent(() => {
      setEvents(bridge.getEvents());
    });
  }, []);

  return (
    <DevToolsPanel
      events={events}
      onClearEvents={() => bridge.clearEvents()}
    />
  );
}
```

## Using Hook for Single Action

For monitoring a single action with full state:

```tsx
import { useActionEvents } from '@lombard.finance/sdk-devtools';

function StakeProgress({ action }) {
  const { events, status, isLoading, error, isFailed } =
    useActionEvents(action);

  return (
    <div>
      <StatusBadge status={status} />
      {isLoading && <Spinner />}
      {isFailed && <Error message={error.message} />}
      <EventLog events={events} onClear={() => {}} />
    </div>
  );
}
```

## Components

### DevToolsPanel

Full debug panel with tabs for events, actions, and state:

```tsx
<DevToolsPanel
  events={events}
  onClearEvents={clearEvents}
  reducerLogs={logs} // Optional: Redux-style action log
  onClearReducerLogs={clearLogs} // Optional
  state={{ status: 'ready' }} // Optional: State to inspect
  initialTab="events" // Optional: 'events' | 'reducer' | 'state'
  title="SDK Debug" // Optional
/>
```

### Individual Components

```tsx
import {
  EventLog,
  StateInspector,
  StatusBadge,
  StepIndicator,
  createSteps,
} from '@lombard.finance/sdk-devtools';

// Status Badge
<StatusBadge status="needs_fee_authorization" />

// Step Indicator
const steps = [
  { id: 'create', label: 'Create' },
  { id: 'prepare', label: 'Prepare' },
  { id: 'authorize', label: 'Authorize' },
  { id: 'execute', label: 'Execute' },
];

<StepIndicator
  steps={createSteps(steps, currentStep)}
  currentStep={currentStep}
/>

// Event Log (standalone)
<EventLog events={events} onClear={clearEvents} />

// State Inspector (JSON tree viewer)
<StateInspector state={{ amount: '0.001' }} title="Transaction" />
```

## Mock Wallet

Test flows without connecting a real wallet:

```tsx
import { useMockWallet, MOCK_ADDRESSES } from '@lombard.finance/sdk-devtools';

function WalletSection() {
  const mockWallet = useMockWallet();

  return (
    <div>
      {!mockWallet.isEnabled ? (
        <button onClick={mockWallet.enable}>Use Mock Wallet</button>
      ) : (
        <div>
          <p>Mock Address: {mockWallet.address}</p>
          <p>⚠️ Cannot sign transactions</p>
          <button onClick={mockWallet.disable}>Disable Mock</button>
        </div>
      )}
    </div>
  );
}

// Available mock addresses
console.log(MOCK_ADDRESSES.evm); // 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
console.log(MOCK_ADDRESSES.bitcoin); // bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
console.log(MOCK_ADDRESSES.solana); // DRpbCBMxVnDK7maPMxTm9dRYNLGhPEYALmJY9VvUdWTm
```

## SDK Events Collected

The bridge automatically subscribes to these SDK events:

| Event           | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| `status-change` | Action status changed (e.g., `idle` → `needs_fee_authorization`) |
| `loading`       | Loading state changed                                            |
| `error`         | An error occurred                                                |
| `completed`     | Action completed successfully                                    |
| `failed`        | Action failed                                                    |
| `progress`      | Progress update with step details                                |

## API Reference

### Provider

| Export               | Description                     |
| -------------------- | ------------------------------- |
| `DevToolsProvider`   | React context provider          |
| `useDevToolsContext` | Hook to access DevTools context |
| `useRegisterAction`  | Hook to register an action      |

### Bridge

| Export                | Description                 |
| --------------------- | --------------------------- |
| `DevToolsBridge`      | Core bridge class           |
| `getDevToolsBridge`   | Get global singleton bridge |
| `resetDevToolsBridge` | Reset global bridge         |

### Hooks

| Hook                 | Description                              |
| -------------------- | ---------------------------------------- |
| `useDevTools`        | Full DevTools state and methods          |
| `useMonitoredAction` | Create and auto-register an action       |
| `useActionEvents`    | Subscribe to events from a single action |
| `useMockWallet`      | Mock wallet for testing                  |

### Components

| Component        | Description             |
| ---------------- | ----------------------- |
| `DevToolsPanel`  | Full tabbed debug panel |
| `EventLog`       | SDK event stream        |
| `ReducerLog`     | Redux-style action log  |
| `StateInspector` | JSON tree viewer        |
| `StatusBadge`    | Status indicator        |
| `StepIndicator`  | Progress steps          |

## Styling

Components use Tailwind CSS classes. For best results, ensure Tailwind is configured in your project. Components support dark mode via `dark:` prefix classes.

## Production

DevTools is automatically disabled in production when using `DevToolsProvider`:

```tsx
<DevToolsProvider enabled={process.env.NODE_ENV !== 'production'}>
```

Or disable manually:

```tsx
<DevToolsProvider enabled={false}>
```

## License

MIT
