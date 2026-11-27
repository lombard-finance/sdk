# Changelog

All notable changes to `@lombard.finance/sdk-react` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-21

### Added

- `expiry` on `useBtcStakeAndBake`'s `stakeAndDeploy` params — an absolute UNIX timestamp in seconds, forwarded to `authorizeDeposit`. Without it the hook called `authorizeDeposit()` with no arguments, so consumers on the hook stayed pinned to the 24-hour default even once the underlying SDK could carry an override. Omitting it still leaves the default to the SDK.

## [0.1.0] - 2025-03-04

### Added

- `useLombardSDK` hook for SDK initialization and lifecycle management
- `useBtcStake` hook for BTC staking flows
- `useBtcStakeAndBake` hook for combined stake-and-deploy flows
- `useEvmUnstake` hook for EVM unstaking (LBTC burn)
- `useNonEvmUnstake` hook for Solana/Starknet/Sui unstaking
- Automatic event listener cleanup on component unmount
