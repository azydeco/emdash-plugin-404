# Contributing

This is a pnpm workspace: `hosts/*` (the EmDash site) and `packages/*` (plugins). Lint and format tooling is configured once at the repo root and covers every workspace. There are no per-package lint or format configs or scripts.

## Checks

Run from the repo root:

```bash
pnpm dev             # every workspace project with a `dev` script, in parallel
pnpm build           # every workspace project with a `build` script
pnpm test            # every workspace project with a `test` script
pnpm format          # write: oxfmt, then Prettier on .astro
pnpm format:check    # check only, fails on any difference
pnpm lint            # oxlint, type-aware, fails on warnings
pnpm lint:fix        # applies safe fixes; unlike lint, does not fail on warnings
```

`dev`/`build`/`test` fan out with `pnpm -r --if-present`: a workspace project without that script is skipped rather than failing the run, so nothing needs updating here when a package is added or doesn't need one of these. See [ADR-0001](docs/adr/0001-root-scripts-fan-out-recursively.md) for why.

To target a single package instead of the whole workspace (e.g. while debugging), use `--filter`:

```bash
pnpm --filter @azydeco/emdash-plugin-custom-404 test
pnpm --filter web-cloudflare build
```

There is no root `typecheck` script. The host's `typecheck` script (`astro check`) does not run under TypeScript 7, which this workspace pins: the Astro language server needs an API that TypeScript's native compiler does not expose yet (see the Astro roadmap discussion the error links to). Use `pnpm build` (or `pnpm --filter web-cloudflare build`) as the host's check until Astro catches up; the plugin's `pnpm --filter @azydeco/emdash-plugin-custom-404 typecheck` still works.

There is no CI yet, so these are the checks. The pre-commit hook (below) runs format and lint on staged files; run `pnpm lint` and `pnpm format:check` yourself before considering a change done, since the hook only sees what you staged.

## Two formatters

Everything goes through [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) except `.astro` files, which go through Prettier with `prettier-plugin-astro`.

The reason is capability, not preference: oxfmt cannot parse `.astro` yet (Oxc issue [#19715](https://github.com/oxc-project/oxc/issues/19715) tracks it). When it can, the Prettier dependency, `.prettierrc` and the `prettier` halves of the `format` scripts and the lint-staged config should all go.

| Formatter                          | Files                                                                                                                                                                                       | Config          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| oxfmt                              | Every type it supports that the ignore list does not exclude. In this repo today: `.ts`, `.tsx`, `.mjs`, `.json`, `.jsonc`, `.yaml`. It would also take `.css`, `.toml`, `.html` if added. | `.oxfmtrc.json` |
| Prettier + `prettier-plugin-astro` | `**/*.astro` only. Prettier is never invoked on anything else.                                                                                                                              | `.prettierrc`   |

Both use tabs. Two differences to know about:

- **Print width.** oxfmt's default is 100, Prettier's is 80, and neither config sets it. So `.astro` files wrap at 80 and everything else at 100.
- **Import sorting.** oxfmt sorts imports (`experimentalSortImports`). Prettier does not, so imports in `.astro` frontmatter are left in whatever order you wrote them.

**Not formatted:** Markdown (`**/*.md` is in the oxfmt ignore list by decision; oxfmt could format it), the two generated `.d.ts` files (`emdash-env.d.ts`, `worker-configuration.d.ts`), the seed data file (`hosts/web-cloudflare/seed/seed.json`), and build output (`dist`, `.wrangler`, `.astro/`). oxfmt also skips `pnpm-lock.yaml` on its own.

## Linting

[oxlint](https://oxc.rs/docs/guide/usage/linter.html) runs from the root over every workspace. What is on:

- **Plugins:** `eslint`, `typescript`, `unicorn`, `oxc`, `import`, `vitest`, `react`, `jsx-a11y`. Naming any plugin replaces oxlint's default set, so all eight are listed in `.oxlintrc.json`.
- **Categories:** `correctness` is an error; `suspicious` and `perf` are warnings. `pnpm lint` passes `--deny-warnings`, so a warning fails the run just like an error.
- **Type-aware rules** (`no-floating-promises`, `no-unsafe-type-assertion` and friends) come from `oxlint-tsgolint`, enabled by `typeAware: true` in the root config and `--type-aware` on the scripts. The plugin exports its `.ts` source directly, so no build is needed before linting the host that imports it.
- **`.astro` files** are linted too, but only their frontmatter and `<script>` blocks. Templates are not linted.

The Oxc editor extension reads `options.typeAware` from the same config, so it runs the type-aware rules too as long as `oxlint-tsgolint` is installed. `pnpm lint` is still the check that counts: it adds `--deny-warnings`, which the editor does not.

### Findings policy

Fix the code. A rule may be turned off only when it has fired three or more times on a pattern this repo endorses, and the reason goes as a comment next to the rule in `.oxlintrc.json`. An inline disable comment carries its reason on the same line.

Rules currently off, with reasons in the config:

- `react/react-in-jsx-scope`, everywhere. The plugin uses the automatic JSX runtime, so there is no `React` import to require.
- `typescript/no-unsafe-type-assertion`, in `**/test-support.ts` only. The test doubles for host interfaces populate only the fields under test, and the casts are the documented way they say so.

## Pre-commit hook

Husky runs lint-staged on every commit (`.husky/pre-commit`). The config is the `lint-staged` block in the root `package.json`, run serially in this order:

1. `*.astro`: `prettier --write`
2. `*`: `oxfmt`, then `pnpm lint`, both with `--no-error-on-unmatched-pattern`

What that means for you:

- **Formatting is written into the commit.** A badly formatted staged file lands formatted. You do not need to run `pnpm format` first.
- **Lint only checks.** A finding aborts the commit and lint-staged puts the files back exactly as you staged them.
- **Ignored files are left alone.** oxfmt honours the ignore list for staged files too, and oxlint skips file types it does not understand. A staged Markdown file or lockfile passes straight through.
- The tasks are serial (`--concurrent false`) so the linter never reads a file a formatter is still rewriting.

The hook is installed by `pnpm install` (the root `prepare` script runs `husky`). After a fresh clone, one `pnpm install` is all it takes. If commits stop running the hook, `pnpm exec husky` reinstalls it.

Never pass an argument to `husky`. It treats its first argument as the hooks directory, so `husky --version` silently points `core.hooksPath` at a `--version/_` directory and every commit then fails with `sh: 0: Illegal option --`. `pnpm exec husky` with no arguments puts it back.

## Debugging

`.vscode/launch.json` holds the debug configurations. They **attach** to a Dev server you have already started; nothing in VS Code starts one, because the Dev server is normally left running between edits and a second process would fight the first for ports and the Vite cache. Start it first:

```bash
pnpm dev             # then F5
```

Request-time code does not run in Node. The Cloudflare adapter runs `astro dev`'s SSR environment inside workerd (Cloudflare's runtime, via `@cloudflare/vite-plugin`), so a Node debugger on the `astro` process never reaches a page or a plugin route. Each context has its own session:

| What you want to pause in | Runs in | Use |
| --- | --- | --- |
| Host pages (`src/pages/*.astro` frontmatter), `src/worker.ts`, and the plugin's `routes.ts`, `plugin.ts`, `Custom404.astro` | workerd | **Attach to Test site worker**. Attaches to the workerd DevTools inspector on port 9229, then hit the route in a browser or with `curl`. |
| The plugin's admin UI (`src/admin.tsx`, `src/admin/*`) | Browser | **Debug admin UI in Chrome**. Launches Chrome on the VS Code client machine (works from Remote-WSL, where there is no Linux browser) at the plugin's admin page. Log in via the admin UI as usual. |
| Plugin unit tests | Node (Vitest) | The recommended Vitest extension: "Debug Test" from the gutter or the Testing view. No launch config needed. |
| Config-time code (`astro.config.mjs`, the `custom404Plugin()` descriptor factory) | Node (Vite) | Start `pnpm dev` from a **JavaScript Debug Terminal** (Terminal menu). Node-side breakpoints bind automatically; it does not interfere with the worker attach. |

The compound **Test site worker + admin UI** runs the first two together.

Details worth knowing:

- The inspector port is pinned to 9229 in `hosts/web-cloudflare/astro.config.mjs` (`cloudflare({ inspectorPort: 9229 })`). Unpinned, the Vite plugin silently moves to the next free port and the attach connects to nothing. If 9229 is busy, free it rather than editing the pin.
- The worker attach has `restart: true`: when you restart the Dev server (for example after `astro build` breaks it, see the [README](README.md)), the session reconnects on its own instead of dying.
- The attach fails within ten seconds if nothing is listening. That is the "start `pnpm dev` first" reminder, not a bug.
- The Chrome config opens `http://localhost:4321`. If the Dev server came up on another port because 4321 was taken, edit the URL for that session.
- The admin UI needs a login. Use the dev-only auth bypass route; see [Admin login](hosts/web-cloudflare/README.md#admin-login-dev-only) in the Test site README.
- Breakpoints in the plugin's source bind because the Test site links the package with `workspace:*` and imports its `.ts` directly; the worker reports the absolute source path and an inline source map.

## Editor

`.vscode/extensions.json` recommends `oxc.oxc-vscode` (lint and format) and `astro-build.astro-vscode` (format for `.astro`). `.vscode/settings.json` wires them up: oxc is the default formatter, Astro files use the Astro extension, and `source.fixAll.oxc` runs on explicit save. The Oxc extension does not bundle the tools; it runs the `oxlint` and `oxfmt` installed in `node_modules`, so it reads the root configs with no extension settings.

## Config files

| File                    | Purpose                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `.oxfmtrc.json`         | oxfmt: tabs, import sorting, ignore list                              |
| `.oxlintrc.json`        | oxlint: plugins, categories, disabled rules with reasons, ignore list |
| `.prettierrc`           | Prettier for `.astro`: tabs, the Astro plugin                         |
| `package.json`          | The scripts, and the `lint-staged` block                              |
| `.husky/pre-commit`     | Runs lint-staged                                                      |
| `.vscode/settings.json` | Formatter and code-action wiring for the two extensions               |
| `.vscode/launch.json`   | Debug configurations: worker attach, admin UI in Chrome, and their compound |

The lint and format ignore lists are kept identical, except that the linter also ignores every `.d.ts`.
