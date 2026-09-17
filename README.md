# azdeco-404

A pnpm workspace with two packages:

- **[`hosts/web-cloudflare`](hosts/web-cloudflare/README.md)** — the Test site: an EmDash/Astro app that exists purely to exercise the plugin below. It runs locally only and is never deployed.
- **[`packages/emdash-plugin-custom-404`](packages/emdash-plugin-custom-404/README.md)** — `@azydeco/emdash-plugin-custom-404`, the native EmDash plugin under development in this repo.

## Requirements

- **Node.js ≥ 22.16** — the floor set by this workspace's dependencies (`emdash` requires `>=22.16`; `astro` and `wrangler` require slightly older versions).
- **pnpm 12.4.1** — pinned in the root `package.json`. With Corepack enabled (bundled with Node), it's installed automatically the first time you run a pnpm command here — no manual install needed.

## Setup

```bash
pnpm install
```

Then start the Test site's dev server — see [`hosts/web-cloudflare/README.md`](hosts/web-cloudflare/README.md#local-development).

## See it working

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:4321/does-not-exist` in a browser. You'll see a genuine HTTP 404 rendered by the plugin — its fallback markup by default, or your own configured 404 content once you've enabled that from the admin UI. Either way, no extra setup is required to see it working.

To verify the response itself instead of eyeballing the page, see the plugin README's [`curl -I` check](packages/emdash-plugin-custom-404/README.md#verifying-the-404-response).

## Commands

Run from the repo root. `dev`, `build`, and `test` fan out to every workspace project that defines that script ([ADR-0001](docs/adr/0001-root-scripts-fan-out-recursively.md)); `lint` and `format` run once over the whole workspace.

| Command | Does |
|---|---|
| `pnpm dev` | Starts every workspace project's dev server, in parallel — currently just the Test site's Astro dev server. |
| `pnpm build` | Builds every workspace project that has a `build` script. |
| `pnpm test` | Runs every workspace project's tests. |
| `pnpm lint` | Lints the whole workspace with oxlint; fails on any warning. |
| `pnpm lint:fix` | Applies safe oxlint fixes. |
| `pnpm format` | Formats the whole workspace (oxfmt, then Prettier for `.astro`). |
| `pnpm format:check` | Checks formatting without writing; fails on any difference. |

`prepare` (`husky`) isn't run directly — `pnpm install` runs it automatically to set up the pre-commit hook.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full checks workflow, the pre-commit hook, and why there's no root `typecheck` script.

## More

- Lint, format, and typecheck workflow: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Configuring or extending the plugin itself: [`packages/emdash-plugin-custom-404/README.md`](packages/emdash-plugin-custom-404/README.md)
