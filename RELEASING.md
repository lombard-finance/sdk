# Releasing

All npm releases go through the **Publish** workflow in `.github/workflows/publish.yml`. It authenticates with npm trusted publishing (OIDC) and attaches a provenance attestation to every version. The repository holds no npm token.

## Channels

| `channel`    | Version published                                | dist-tag         | Allowed from            |
| ------------ | ------------------------------------------------ | ---------------- | ----------------------- |
| `latest`     | `package.json` version, in `X.Y.Z` form          | `latest`         | `main`                  |
| `prerelease` | `package.json` version, in `X.Y.Z-<suffix>` form | `dist_tag` input | `main`, `sdk-release/*` |
| `canary`     | `X.Y.Z-<dist_tag>.<run number>`, never committed | `dist_tag` input | `main`, `sdk-release/*` |

`package: all` publishes every package in dependency order. It is available with `channel: canary` only.

## Publishing a release

1. Merge the version bump and changelog to `main`.
2. Publish internal dependencies first, for example `sdk-common` before `sdk`. The workflow stops if a dependency version it needs is not on npm yet.
3. Run the Publish workflow and approve the `production` environment when prompted.
4. Check the run summary. Each package line reports its dist-tag and provenance.

## Trusted publisher settings

Each package's trusted publisher on npmjs.com is bound to the workflow filename `publish.yml` and the environment `production`. Renaming either one breaks publishing until a trusted publisher with the new name is added to every package. Existing trusted publishers cannot be edited.

A new package needs one manual first publish before a trusted publisher can be added to it.
