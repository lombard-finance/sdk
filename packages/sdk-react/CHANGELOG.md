# Changelog

All notable changes to `@lombard.finance/sdk-react` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-03-04

### Added

- `useLombardSDK` hook for SDK initialization and lifecycle management
- `useBtcStake` hook for BTC staking flows
- `useBtcStakeAndBake` hook for combined stake-and-deploy flows
- `useEvmUnstake` hook for EVM unstaking (LBTC burn)
- `useNonEvmUnstake` hook for Solana/Starknet/Sui unstaking
- Automatic event listener cleanup on component unmount
