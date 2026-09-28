## Public repository

The plugin is developed under `packages/emdash-plugin-custom-404` in this monorepo, [azydeco/emdash-plugin-404](https://github.com/azydeco/emdash-plugin-404), and published to npm from there with `pnpm publish`. `package.json`'s `repository.directory` field points npm's UI at the subfolder. There is no separate mirror repository and no CI publish workflow yet for v1 — publishing is a manual, maintainer-run step.

## Packaging and publishing a release

`pnpm` publishes this package directly; the `npm` CLI is not required.

**One-time setup**, if you haven't published from this machine before:

- An npm account with publish access to the `@azydeco` scope.
- Auth: either `pnpm login --scope=azydeco` (interactive, handles 2FA), or an access token from your npm account settings written to `~/.npmrc`:
  ```
  //registry.npmjs.org/:_authToken=<token>
  ```

**Preview the tarball** before publishing anything — this never touches the registry:

```bash
pnpm pack --dry-run
```

This resolves the `catalog:` version specifiers (e.g. `zod`) to real semver ranges in the packed `package.json`, and applies the `"files"` allowlist in `package.json`. That allowlist ships raw `src/` (no build step, per the native-plugin guide) while excluding `*.test.ts`, `test-support.ts` (the test-only fake KV/fetch helpers), and `src/astro/tsconfig.json`.

A note if you add new files later: a `.npmignore` here would have no effect, even placed inside `src/`. Once `"files"` is set in `package.json`, pnpm (like npm) ignores `.npmignore` entirely — a long-standing quirk ([npm/npm#7030](https://github.com/npm/npm/issues/7030)). Exclude new non-runtime files with a negated glob in `"files"` instead, e.g. `"!src/**/*.test.ts"`.

To inspect the exact file list and the resolved manifest without leaving a tarball behind:

```bash
pnpm pack --dry-run --json          # file list, machine-readable
pnpm pack --pack-destination /tmp   # writes the real .tgz for local inspection
tar -xOzf /tmp/azydeco-emdash-plugin-custom-404-*.tgz package/package.json
```

**Publish**, from this directory (or `pnpm --filter @azydeco/emdash-plugin-custom-404 publish` from the repo root):

```bash
pnpm publish
```

`publishConfig.access: "public"` is already set, so no `--access` flag is needed for this scoped package. Bump `version` in `package.json` first if `0.1.0` has already been published — the registry rejects re-publishing an existing version.
