# azdeco-404

A pnpm workspace with two packages:

- **[`hosts/web-cloudflare`](hosts/web-cloudflare/README.md)** — the Test site: an EmDash/Astro app that exists purely to exercise the plugin below. It runs locally only and is never deployed.
- **[`packages/emdash-plugin-custom-404`](packages/emdash-plugin-custom-404/README.md)** — `@azydeco/emdash-plugin-custom-404`, the native EmDash plugin under development in this repo.

## Requirements

- **Node.js ≥ 22.16** — the floor set by this workspace's dependencies (`emdash` requires `>=22.16`; `astro` and `wrangler` require slightly older versions).
- **pnpm 12.4.1** — [installation details are on the pnpm website](https://pnpm.io/installation)

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

Then open `http://localhost:4321/does-not-exist` in a browser. Out of the box the plugin is disabled, so you'll see a genuine HTTP 404 rendered by its fallback markup. Enable the plugin from the admin dashboard to serve your own configured 404 content instead. Either way, no extra setup is required to see it working.

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
- Debugging the Test site and the plugin from VS Code: [`CONTRIBUTING.md#debugging`](CONTRIBUTING.md#debugging)
- Configuring or extending the plugin itself: [`packages/emdash-plugin-custom-404/README.md`](packages/emdash-plugin-custom-404/README.md)


Azydeco chooses the MIT license for this project to ensure that developers can feel they have access to the source code within their native Emdash deploys without a concern that they are expected to deliver access to the origins of this source within their own deploys. The freedoms of the MIT license both commercially and in terms of Source access are considered to be the best option for this project.