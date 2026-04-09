# Third-Party License Notice

This repository's source code is licensed under MIT. Third-party dependencies may be licensed under different terms.

## Current Exceptions

The repository enforces license policy checks in CI (`yarn licenses:check`) using [`.license-policy.json`](./.license-policy.json).

Current approved exceptions:

1. `@layerzerolabs/*` (`BUSL-1.1`)

- Reason: required by current LayerZero integration packages.
- Scope: runtime dependencies in `@lombard.finance/sdk` and `@lombard.finance/sdk-solana`.

2. `@metamask/sdk*` (custom non-commercial license)

- Reason: transitive development-only dependency via `wagmi` connectors used in SDK Storybook/demo tooling.
- Scope: development environment; not a direct runtime dependency of published SDK entrypoints.

## Consumer Guidance

If you are evaluating commercial use, review third-party terms in addition to this repository's MIT license.

For policy details and future removals/replacements of exceptions, track updates in:

- [`.license-policy.json`](./.license-policy.json)
- CI workflow [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)
