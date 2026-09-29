## Release checklist

Work through this list for every release. Each step is explained in more detail below.

- [ ] The release changes are merged to `main`. Your local `main` is checked out, clean, and up to date with `origin`, because `pnpm publish` refuses to publish from any other state (see [Git checks](#git-checks)).
- [ ] `version` is bumped in `packages/emdash-plugin-custom-404/package.json`. npm versions are immutable, so every publish needs a new version, including a docs-only change: the README ships in the tarball. Use a patch bump for fixes and docs, and a minor bump for new features. The package is pre-1.0, so a breaking change is also a minor bump.
- [ ] `PLUGIN_VERSION` in `packages/emdash-plugin-custom-404/src/constants.ts` matches the new `version`. It is the version the plugin reports to EmDash, and it isn't derived from `package.json`.
- [ ] `peerDependencies` in the plugin's `package.json` still match the `emdash`, `@emdash-cms/admin` and `astro` versions pinned in the root `pnpm-workspace.yaml` catalog.
- [ ] `packages/emdash-plugin-custom-404/CHANGELOG.md` has a section for the new version, dated with the release day, and a matching link reference at the bottom of the file. It ships in the tarball, so write it before publishing.
- [ ] `packages/emdash-plugin-custom-404/README.md` covers any user-facing change. npm displays this README as the package page.
- [ ] `pnpm test`, `pnpm lint` and `pnpm format:check` pass. Run them from the repo root.
- [ ] The tarball preview lists only the expected files, and `catalog:` has resolved to real ranges (see [Preview the tarball](#preview-the-tarball)).
- [ ] `pnpm whoami` prints your npm username. `pnpm publish --dry-run` never contacts the registry, so it can't catch a missing or expired login.
- [ ] Published with `pnpm publish` (see [Publish](#publish)).

## Where to run the commands

Unless a step says otherwise, **run every command in this guide from the plugin package directory**, not from the repo root:

```bash
cd packages/emdash-plugin-custom-404   # starting from the repo root
```

`pnpm pack` and `pnpm publish` act on the package in the current directory. From the repo root, they would pack the private workspace root (`azdeco-404-workspace`) instead of the plugin. If you'd rather stay in the repo root, give each command the package directory with `-C`:

```bash
pnpm -C packages/emdash-plugin-custom-404 pack --dry-run
pnpm -C packages/emdash-plugin-custom-404 publish
```

The lint, format and test scripts are the exception. They are root scripts (see `CONTRIBUTING.md`), so run them from the repo root.

## Public repository

The plugin is developed under `packages/emdash-plugin-custom-404` in the [azydeco/emdash-plugin-404](https://github.com/azydeco/emdash-plugin-404) monorepo and published to npm from that directory with `pnpm publish`. The `repository.directory` field in `package.json` points npm's UI at the subfolder. There is no separate mirror repository and no CI publish workflow, so publishing is a manual step that a maintainer runs.

## Packaging and publishing a release

pnpm publishes this package directly, so you don't need the `npm` CLI.

### One-time setup

Do this if you haven't published from this machine before:

- Get an npm account with publish access to the `@azydeco` scope.
- Authenticate in one of two ways:
  - Run `pnpm login --scope=@azydeco`. This is interactive and handles 2FA.
  - Create an access token in your npm account settings and add it to `~/.npmrc`:
    ```
    //registry.npmjs.org/:_authToken=<token>
    ```

### Preview the tarball

Always preview the tarball before publishing. This step never touches the registry. Run it from `packages/emdash-plugin-custom-404`:

```bash
pnpm pack --dry-run
```

Packing turns the `catalog:` version specifiers (such as `zod`) into real semver ranges in the packed `package.json`. It also applies the `"files"` allowlist from `package.json`. That allowlist ships raw `src/` with no build step, as the native-plugin guide requires. It excludes `*.test.ts`, `test-support.ts` (the test-only fake KV and fetch helpers) and `src/astro/tsconfig.json`.

If you add files later, note that a `.npmignore` has no effect here, whether you put it in the package root or inside `src/`. When `"files"` is set, pnpm ignores `.npmignore` completely. A `.npmignore` placed inside `src/` would itself be shipped. (This was checked with pnpm 12. The npm CLI behaves differently for nested `.npmignore` files, so don't rely on them.) To exclude a new non-runtime file, add a negated glob to `"files"`, for example `"!src/**/*.test.ts"`.

To inspect the exact file list and the resolved manifest:

```bash
pnpm pack --dry-run --json                  # file list, machine-readable; writes nothing
pnpm pack --pack-destination /tmp           # writes the real .tgz outside the repo
tar -xOzf /tmp/azydeco-emdash-plugin-custom-404-<version>.tgz package/package.json
rm /tmp/azydeco-emdash-plugin-custom-404-<version>.tgz
```

Without `--pack-destination`, `pnpm pack` writes the `.tgz` into the package directory. Delete it so it doesn't end up in a commit.

### Git checks

By default, `pnpm publish` fails with `ERR_PNPM_GIT_NOT_CORRECT_BRANCH` unless all of the following are true:

- The current branch is `main` (or `master`).
- The working tree is clean.
- The branch is in sync with its remote.

Publish from an up-to-date `main` after the release PR is merged. `--no-git-checks` skips these checks, but only use it deliberately, for example for a pre-release published under `--tag next`.

### Publish

Run this from `packages/emdash-plugin-custom-404`:

```bash
pnpm whoami              # confirms you're logged in to npm
pnpm publish --dry-run   # runs every check and prints what would be published, without uploading
pnpm publish
```

This package is scoped, and `publishConfig.access: "public"` is already set, so you don't need an `--access` flag. If the `version` in `package.json` is already on the registry, the publish is rejected. Bump the version and try again.

If the publish fails with `404 Not Found` for a package that already exists on npm, you aren't authenticated. The registry reports a missing or expired login on a scoped package as a 404, not a 401. Run `pnpm login --scope=@azydeco` and try again.
