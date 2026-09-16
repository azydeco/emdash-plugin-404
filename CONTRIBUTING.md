# Contributing

This is a pnpm workspace: `hosts/*` (the EmDash site) and `packages/*` (plugins). Lint and format tooling is configured once at the repo root and covers every workspace. There are no per-package lint or format configs or scripts.

## Checks

Run from the repo root:

```bash
pnpm format         # write: oxfmt, then Prettier on .astro
pnpm format:check   # check only, fails on any difference
pnpm lint           # oxlint, type-aware, fails on warnings
pnpm lint:fix       # applies safe fixes; unlike lint, does not fail on warnings
```

Typecheck, tests and builds are per package, not at the root:

```bash
pnpm --filter @azydeco/emdash-plugin-custom-404 typecheck
pnpm --filter @azydeco/emdash-plugin-custom-404 test
pnpm --filter web-cloudflare build
```

The host's `typecheck` script (`astro check`) does not run under TypeScript 7, which this workspace pins: the Astro language server needs an API that TypeScript's native compiler does not expose yet (see the Astro roadmap discussion the error links to). Use the build as the host's check until Astro catches up.

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

The lint and format ignore lists are kept identical, except that the linter also ignores every `.d.ts`.
