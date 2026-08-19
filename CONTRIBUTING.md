# Contributing to Lombard SDK

Thank you for your interest in contributing to the Lombard SDK!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `yarn install`
4. Install [gitleaks](https://github.com/gitleaks/gitleaks#installing) (e.g. `brew install gitleaks`) — the pre-commit hook uses it to scan staged changes for secrets. If it is not installed the hook is skipped and CI performs the scan instead.
5. Create a branch: `git checkout -b my-feature`

## Development Workflow

### Making Changes

1. Make your changes
2. Add tests if applicable
3. Run tests: `yarn test`
4. Run linting: `yarn lint`
5. Commit your changes

### Testing changes in a downstream consumer

Before publishing a release, you usually want to validate SDK changes in a
real consumer app (a Vite/Next/whatever workspace that depends on
`@lombard.finance/sdk`).

The consumer must be a Yarn 4 workspace (Yarn's `link:` protocol is the
mechanism used). From the SDK repo:

```bash
yarn build      # build all packages first; consumers import from dist/
```

From the consumer repo, point its root `resolutions` at your local SDK
checkout:

```json
// consumer-app/package.json
"resolutions": {
  "@lombard.finance/sdk": "link:../sdk/packages/sdk",
  "@lombard.finance/sdk-common": "link:../sdk/packages/sdk-common"
}
```

Then `yarn install` in the consumer. The `link:` protocol resolves to the
SDK's built `dist/`, so rerun `yarn build` in the SDK after every change.
Do not commit these `resolutions` overrides to the consumer repo.

Pre-release npm channels (`-next.X`) let consumers opt in without
disrupting the stable line — bump to `next.0` for the first prerelease,
then `next.1`, `next.2`, etc.

### Pull Request Process

1. Open an issue first to discuss significant changes
2. Ensure all tests pass
3. Update documentation if needed
4. Request review from maintainers

## Code Style

- TypeScript strict mode
- ESLint + Prettier for formatting
- Meaningful variable names
- JSDoc for public APIs

## What We Accept

✅ Bug fixes with tests  
✅ Documentation improvements  
✅ Performance improvements with benchmarks  
✅ New chain modules (with prior discussion)

## What Requires Discussion First

⚠️ New features or APIs  
⚠️ Breaking changes  
⚠️ Large refactors  
⚠️ New dependencies

## Code of Conduct

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Questions?

Open a GitHub Discussion or reach out to sdk@lombard.finance.
