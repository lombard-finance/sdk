# Changelog

All notable changes to `@lombard.finance/sdk-devtools` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-09-01

### Changed

- Documentation only. The README showed `chain.btc.stake()` in three places, including the architecture diagram, and `DevToolsEvent.source` gave `'BtcStake'` and `'EvmUnstake'` as its examples. Those names are gone in `@lombard.finance/sdk@6.0.0`; the LBTC route is `chain.btc.deposit()` and the classes are `BtcDepositLbtc` and `EvmWithdrawLbtc`.

No API change. The SDK is a peer dependency here, published as `*`, so this
release works against 5.x and 6.x alike.

## [0.1.0] - 2024-12-04

### Added

- **DevToolsBridge**: Core class for connecting SDK actions to DevTools
  - Automatic event subscription for registered actions
  - Event aggregation with configurable max limit
  - State tracking for all registered actions
  - Singleton pattern support via `getDevToolsBridge()`

- **DevToolsProvider**: React context provider for application-wide DevTools
  - Configurable `enabled` prop (defaults to disabled in production)
  - Automatic cleanup on unmount
  - Support for custom configuration

- **React Hooks**:
  - `useDevToolsContext`: Access DevTools context (events, actions, methods)
  - `useRegisterAction`: Register SDK actions for automatic monitoring
  - `useActionEvents`: Subscribe to events from a specific action
  - `useDevTools`: Standalone hook for use without provider
  - `useMonitoredAction`: Create and auto-register actions
  - `useMockWallet`: Mock wallet for testing without real wallets

- **UI Components**:
  - `DevToolsPanel`: Tabbed panel with events, reducer logs, and state inspection
  - `EventLog`: Console-style event log display
  - `ReducerLog`: Redux DevTools-style reducer action log
  - `StateInspector`: Expandable JSON state tree viewer
  - `StatusBadge`: Color-coded status indicator
  - `StepIndicator`: Horizontal progress step display

- **Type Definitions**:
  - `DevToolsEvent`: SDK event representation
  - `ReducerLogEntry`: Reducer action log entry
  - `MonitorableAction`: Interface for monitorable SDK actions
  - `FlowStep`: Flow step representation
  - `DevToolsConfig`: Configuration options
  - `MockWalletState`: Mock wallet state and controls

### Technical Details

- ESM-only build with TypeScript declarations
- React 18 and 19 support
- Peer dependency on `@lombard.finance/sdk`
- Zero runtime dependencies (only `lucide-react` for icons)
- Tree-shakeable exports

## [Unreleased]

### Planned

- Floating widget variant for non-intrusive debugging
- Network request monitoring
- Performance timing visualization
- Export/import event logs
- Keyboard shortcuts
