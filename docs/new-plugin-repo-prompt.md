# New EmDash plugin repo: hand-off prompt

This file is a prompt. Copy everything below the horizontal rule into a coding agent (Claude Code or similar) that is sitting in an **empty directory** and has **no memory of this repo**. Fill in the parameters first. The result is a monorepo with the same shape as `azydeco/emdash-plugin-404`: root-level tooling, a native EmDash plugin, a Cloudflare Test site, and optionally a Registry Listing plugin and a Node Test site.

The prompt is phased. Each phase ends with a gate the agent must pass before moving on. Two phases need a human: Phase 2 asks you to run `/setup-matt-pocock-skills`, and Phase 4 needs you to confirm the Dev server came up.

Versions pinned here were current on 2026-10-07. The agent is told to check for newer releases only after the pinned ones have passed every gate.

---

## Parameters

Replace every `{{TOKEN}}` in this prompt before starting. Derived tokens follow from the first three.

| Token | Meaning | Example |
| --- | --- | --- |
| `{{PLUGIN_SLUG}}` | kebab-case plugin id. Also the directory and package suffix. | `custom-404` |
| `{{NPM_SCOPE}}` | npm scope without the `@`. | `azydeco` |
| `{{PLUGIN_NAME}}` | Display name shown in the admin sidebar and the Registry. | `Custom 404` |
| `{{WITH_LISTING}}` | `yes` or `no`. Scaffold the sandboxed Registry Listing plugin. | `yes` |
| `{{WITH_WEB_NODE}}` | `yes` or `no`. Scaffold the second Test site on the Node adapter. | `no` |
| `{{PUBLISHER_DID}}` | Atmosphere account DID the Listing plugin publishes under. Leave the placeholder until the account exists. | `did:plc:xxxxxxxxxxxxxxxxxxxxxxxx` |

Derived:

| Token | Rule | Example |
| --- | --- | --- |
| `{{PLUGIN_PASCAL}}` | PascalCase of the slug | `Custom404` |
| `{{PLUGIN_CAMEL}}` | camelCase of the slug | `custom404` |
| `{{PACKAGE}}` | `@{{NPM_SCOPE}}/emdash-plugin-{{PLUGIN_SLUG}}` | `@azydeco/emdash-plugin-custom-404` |
| `{{PACKAGE_DIR}}` | `packages/emdash-plugin-{{PLUGIN_SLUG}}` | `packages/emdash-plugin-custom-404` |
| `{{LISTING_PACKAGE}}` | `{{PACKAGE}}-listing` | `@azydeco/emdash-plugin-custom-404-listing` |
| `{{LISTING_DIR}}` | `{{PACKAGE_DIR}}-listing` | `packages/emdash-plugin-custom-404-listing` |
| `{{REGISTRY_SLUG}}` | `emdash-plugin-{{PLUGIN_SLUG}}` | `emdash-plugin-custom-404` |
| `{{REPO_URL}}` | the GitHub URL of the new repo | `https://github.com/azydeco/emdash-plugin-404` |

Fixed defaults you may edit in the files below: organisation `Azydeco Software`, author URL `https://azydeco.com`, security contact `tellmemore@azydeco.com`, licence MIT.

---

## Prompt

You are setting up a new pnpm monorepo for an EmDash CMS plugin. Work through the phases in order. Do not start a phase until the previous phase's gate passes. If a gate fails, fix the cause before continuing. Do not skip a gate, and do not rewrite a gate to make it pass.

### Rules for the whole task

- **Package manager**: pnpm 12.4.1. Use `pnpm create <package>@<version>` and `pnpm dlx <package>@<version>` with the exact versions given. Only after every gate in this prompt has passed, check npm for newer versions of `create-emdash`, `@emdash-cms/plugin-cli`, `emdash` and `@emdash-cms/*`, and report them; do not bump during the build.
- **Formatting**: tabs everywhere. oxfmt formats everything except `.astro`, which Prettier formats. Markdown is not formatted. Never add a per-package lint or format config or script; the root owns both.
- **Lint findings**: fix the code. Never disable a rule to pass a gate.
- **Scaffolders write outside their target**: `pnpm create` and `pnpm dlx` run inside the workspace append entries to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`. After each scaffold, restore that list to exactly the entries in the file given in Phase 1.
- **Scaffolders own their output**: files that `pnpm create emdash` or `plugin-cli init` write and this prompt does not mention (`.agents/`, `.cursor/`, `AGENTS.md`, `seed/`, `src/` pages, `.gitignore`) stay as generated. Do not rewrite them to match a style.
- **Husky**: never pass an argument to `husky`. `husky --version` silently repoints `core.hooksPath` at a `--version/_` directory and every commit then fails. `pnpm exec husky` with no arguments repairs it.
- **Dev server**: `pnpm build` on a host breaks a running Dev server for that host. After any build, stop the Dev server and start it again. Run one Dev server at a time.
- **Typecheck**: `astro check` does not run under the TypeScript 7 pin used here. The host's check is `pnpm --filter <host> build`. The plugins' `typecheck` scripts (`tsc --noEmit`) still work.
- **Report honestly**: at the end, list every gate and whether it passed, and anything you left out.

### Phase 1: workspace and root tooling

Create these files at the repo root, then run the gate.

````json
// package.json
{
	"name": "{{PLUGIN_SLUG}}-workspace",
	"version": "1.0.0",
	"private": true,
	"description": "pnpm workspace for {{PLUGIN_NAME}}: the native EmDash plugin, its Registry Listing plugin, and the Test sites they are exercised against.",
	"keywords": [],
	"license": "MIT",
	"author": "Azydeco Software",
	"type": "module",
	"scripts": {
		"dev": "pnpm -r --if-present --parallel run dev",
		"build": "pnpm -r --if-present run build",
		"test": "pnpm -r --if-present run test",
		"lint": "oxlint --type-aware --deny-warnings",
		"lint:fix": "oxlint --type-aware --fix",
		"format": "oxfmt && prettier --write \"**/*.astro\"",
		"format:check": "oxfmt --check && prettier --check \"**/*.astro\"",
		"prepare": "husky"
	},
	"devDependencies": {
		"husky": "^9.1.7",
		"lint-staged": "^17.6.0",
		"oxfmt": "^0.70.0",
		"oxlint": "^1.83.0",
		"oxlint-tsgolint": "^7.0.2003",
		"prettier": "^3.9.6",
		"prettier-plugin-astro": "^1.1.0"
	},
	"lint-staged": {
		"*.astro": "prettier --write",
		"*": [
			"oxfmt --no-error-on-unmatched-pattern",
			"pnpm lint --no-error-on-unmatched-pattern"
		]
	},
	"devEngines": {
		"packageManager": {
			"name": "pnpm",
			"version": "12.4.1",
			"onFail": "download"
		}
	}
}
````

````yaml
# pnpm-workspace.yaml
# Supply-chain hardening.
minimumReleaseAge: 1440 # 1 day
minimumReleaseAgeExclude:
  - emdash
  - "@emdash-cms/*"
blockExoticSubdeps: true

packages:
  - hosts/*
  - packages/*

allowBuilds:
  esbuild: true
  sharp: false
  workerd: true

catalog:
  "@astrojs/check": ^0.9.10
  "@emdash-cms/admin": 1.0.1
  "@astrojs/cloudflare": ^14.3.3
  "@astrojs/react": ^7.0.0
  "@cloudflare/workers-types": ^5.20260923.1
  "@emdash-cms/cloudflare": 1.0.1
  "@emdash-cms/plugin-cli": 0.13.3
  "@emdash-cms/sandbox-workerd": 0.9.1
  "@types/node": ^24.13.3
  astro: ^7.3.5
  emdash: 1.0.1
  react: 19.3.0
  react-dom: 19.3.0
  hono: ^4.13.8
  tsdown: 0.23.0
  typescript: ^7.0.2
  tsx: ^4.23.15
  vitest: ^5.0.2
  zod: ^4.6.5
  modern-tar: ^0.8.5
  wrangler: ^4.136.3

overrides:
  "@cloudflare/vite-plugin": 1.54.9
````

When a scaffolded host or package pins a version that differs from the catalog, move its pin into the catalog (one entry per package, the scaffold's version wins for `emdash` and `@emdash-cms/*`) and replace the dependency's version with `catalog:`. Every workspace project uses `catalog:` for shared dependencies.

````json
// .oxfmtrc.json
{
	"useTabs": true,
	"experimentalSortImports": {},
	"ignorePatterns": [
		"**/dist/**",
		"**/.wrangler/**",
		"**/.astro/**",
		"**/emdash-env.d.ts",
		"**/worker-configuration.d.ts",
		"hosts/*/seed/seed.json",
		"**/*.md"
	]
}
````

````jsonc
// .oxlintrc.json
{
	"$schema": "./node_modules/oxlint/configuration_schema.json",
	"plugins": ["eslint", "typescript", "unicorn", "oxc", "import", "vitest", "react", "jsx-a11y"],
	"categories": {
		"correctness": "error",
		"suspicious": "warn",
		"perf": "warn"
	},
	"rules": {
		// The plugin compiles JSX with the automatic runtime (`jsx: "react-jsx"` in
		// its tsconfig, React 19), so no `React` import is needed and the rule
		// fires on every element.
		"react/react-in-jsx-scope": "off",
		// A stylesheet has nothing to bind to; `import "./theme.css"` is the only
		// way to pull one in for its side effect. The rule's own docs give
		// `**/*.css` as the example allow-pattern for this case.
		"import/no-unassigned-import": ["warn", { "allow": ["**/*.css"] }],
		// `_type` is Portable Text's own field name (from the CMS content
		// shape), not a private-variable convention we chose.
		"no-underscore-dangle": ["warn", { "allow": ["_type"] }]
	},
	"overrides": [
		{
			// Test doubles for host interfaces (`KVAccess`, `RouteContext`) are
			// generic over the stored value and only populate the fields the code
			// under test reads; the casts are the documented way they say so.
			"files": ["**/test-support.ts"],
			"rules": {
				"typescript/no-unsafe-type-assertion": "off"
			}
		}
	],
	"options": {
		"typeAware": true
	},
	"ignorePatterns": [
		"**/dist/**",
		"**/.wrangler/**",
		"**/.astro/**",
		"**/emdash-env.d.ts",
		"**/worker-configuration.d.ts",
		"hosts/*/seed/seed.json",
		"**/*.md",
		"**/*.d.ts"
	]
}
````

````json
// .prettierrc
{
	"useTabs": true,
	"plugins": ["prettier-plugin-astro"]
}
````

````gitignore
# .gitignore
node_modules/
dist
*.log
*.tsbuildinfo
*.tgz
coverage
.cache

# dotenv environment variable files
.env
.env.*
!.env.example

# Local agent state. CLAUDE.md, docs/agents/ and ADRs are per-machine here by
# decision; delete these lines if the new repo should commit them.
**/CLAUDE.md
CLAUDE.md
.claude/
**/.claude/
skills-lock.json
.scratch/
docs/agents/
**/docs/adr/*

# Vite and Wrangler
vite.config.js.timestamp-*
vite.config.ts.timestamp-*
.wrangler/
````

````sh
# .husky/pre-commit
# Format staged files (Prettier for .astro, oxfmt for the rest), then lint
# them; a finding aborts the commit. Serial, in config order, so the linter
# never reads a file a formatter is still rewriting.
pnpm exec lint-staged --concurrent false
````

````json
// .vscode/extensions.json
{
	"recommendations": [
		"astro-build.astro-vscode",
		"streetsidesoftware.code-spell-checker",
		"mhutchie.git-graph",
		"oxc.oxc-vscode",
		"vitest.explorer"
	]
}
````

````json
// .vscode/settings.json
{
	"cSpell.words": ["astro", "astrojs", "{{NPM_SCOPE}}", "cloudflare", "emdash", "miniflare", "oxfmt", "oxlint", "tsgolint", "workerd", "wrangler"],
	"editor.formatOnSave": true,
	"editor.detectIndentation": false,
	"editor.insertSpaces": false,
	"editor.tabSize": 2,
	"editor.defaultFormatter": "oxc.oxc-vscode",
	"editor.codeActionsOnSave": {
		"source.fixAll.oxc": "explicit"
	},
	"[astro]": {
		"editor.defaultFormatter": "astro-build.astro-vscode"
	},
	"[typescript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
	"[typescriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
	"[javascript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
	"[javascriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
	"[json]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
	"[jsonc]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
	"[css]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
	"explorer.fileNesting.enabled": true,
	"explorer.fileNesting.expand": false,
	"explorer.fileNesting.patterns": {
		".env": "*example.env",
		"*.ts": "$(capture).js, $(capture).test.ts",
		"*.tsx": "$(capture).ts, $(capture).css, $(capture).module.css",
		"*.astro": "$(capture).ts, $(capture).css, $(capture).module.css",
		"package.json": ".oxfmtrc.json, .oxlintrc.json, AGENTS.md, CLAUDE.md, emdash-env.d.ts, astro.config.mjs, wrangler.jsonc, vitest.config.*, worker-configuration.d.ts, .prettierrc, .gitignore, tsconfig.json, .env*, LICENCE, CHANGELOG.md, README.md, pnpm-workspace.*, pnpm-lock.*, emdash-plugin.jsonc"
	}
}
````

````jsonc
// .vscode/launch.json
{
	// Debugging the Test site and the plugin. Start the Dev server yourself first
	// (`pnpm dev` from the repo root); these configs only attach to it, never start it.
	// See CONTRIBUTING.md#debugging for what each session reaches.
	"version": "0.2.0",
	"configurations": [
		{
			// Attaches to the main Worker through Miniflare's inspector proxy.
			// Breakpoints in src/**, .astro pages and src/worker.ts resolve via the
			// inline source maps Vite emits.
			"name": "Attach: Cloudflare Worker",
			"type": "node",
			"request": "attach",
			// The inspector proxy listens on IPv4 only (127.0.0.1:9229) on both Linux
			// and Windows; "localhost" resolves to ::1 first on Windows.
			"address": "127.0.0.1",
			"port": 9229,
			"restart": true,
			"continueOnAttach": true,
			"timeout": 30000,
			"attachExistingChildren": false,
			"autoAttachChildProcesses": false,
			"resolveSourceMapLocations": ["${workspaceFolder}/**", "!**/node_modules/**"],
			"skipFiles": ["<node_internals>/**"]
		},
		{
			// hosts/web-node runs on the Node adapter: pages and the Native plugin run
			// in the astro process. Start it with `pnpm dev:debug` from hosts/web-node,
			// which opens the inspector on 9230. Only present when web-node exists.
			"name": "Attach: web-node dev (pnpm dev:debug first)",
			"type": "node",
			"request": "attach",
			"address": "127.0.0.1",
			"port": 9230,
			"restart": true,
			"timeout": 30000,
			"resolveSourceMapLocations": ["${workspaceFolder}/**", "!**/node_modules/**"],
			"skipFiles": ["<node_internals>/**"]
		},
		{
			// The plugin's admin UI (src/admin.tsx, src/admin/*) runs in the browser.
			// browserLaunchLocation "ui" opens Chrome on the VS Code client machine, so
			// this works from Remote-WSL where no Linux browser is installed.
			"name": "Debug admin UI in Chrome (pnpm dev first)",
			"type": "chrome",
			"request": "launch",
			"browserLaunchLocation": "ui",
			"url": "http://127.0.0.1:4321/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin/plugins/{{PLUGIN_SLUG}}/",
			"webRoot": "${workspaceFolder}/hosts/web-cloudflare",
			// Vite serves files outside the host root (the workspace-linked plugin)
			// as /@fs/<absolute path>. The debugger has no built-in rule for that
			// prefix and would look under webRoot, leaving breakpoints unbound.
			"pathMapping": { "/@fs/": "/" },
			// On Windows, Vite's prefix is followed by a drive letter (/@fs/C:/...),
			// so the remainder is already an absolute path and maps onto "".
			"windows": { "pathMapping": { "/@fs/": "" } }
		}
	],
	"compounds": [
		{
			"name": "Test site worker + admin UI (pnpm dev first)",
			"configurations": ["Attach: Cloudflare Worker", "Debug admin UI in Chrome (pnpm dev first)"]
		}
	]
}
````

If `{{WITH_WEB_NODE}}` is `no`, remove the web-node attach configuration.

````text
// LICENCE
MIT License

Copyright (c) 2026 Azydeco Software

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

Write `CONTRIBUTING.md` now, from the template in **Appendix A**. Write `README.md` from **Appendix B**; it references packages that do not exist yet, which is fine.

Then `git init` (default branch `main`) if the directory is not a repository.

**Gate 1**

```bash
pnpm install
pnpm exec husky          # no arguments
test -f .husky/_/husky.sh && git config core.hooksPath   # prints .husky/_
pnpm lint                # passes with nothing to lint
pnpm format:check        # passes
```

### Phase 2: agent docs (human step)

Stop and tell the user:

> Run `/setup-matt-pocock-skills` now. Recommended answers: issue tracker **local markdown** under `.scratch/<feature>/`; triage labels **defaults**; domain docs **multi-context**, one `CONTEXT.md` per package under `hosts/*` and `packages/*`.

That skill cannot be invoked by the model. Wait until the user says it has run. Then verify that these exist and read them so later phases use the same vocabulary:

- `CLAUDE.md` with an `## Agent skills` section
- `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain.md`
- `CONTEXT-MAP.md` at the root (create it with the headings `## Contexts` and `## Relationships` if the skill did not)

Append this to `CLAUDE.md` after the skill's section:

````markdown
## Lint and format

Root scripts only (`pnpm lint`, `pnpm lint:fix`, `pnpm format`, `pnpm format:check`); oxfmt for everything, Prettier for `.astro` only. Fix findings in code rather than disabling rules. Full workflow and the findings policy: `CONTRIBUTING.md`.
````

Write the first system-wide ADR:

````markdown
<!-- docs/adr/0001-root-scripts-fan-out-recursively.md -->
# Root `dev`/`build`/`test` scripts fan out recursively, not via explicit `--filter`

The root `package.json` needs `dev`/`build`/`test` scripts so a contributor never has to `cd` into `hosts/*` or `packages/*` to run the project. We chose `pnpm -r --if-present run <script>` (`--parallel` for `dev`) over hardcoding `pnpm --filter <name> <script>` per package, and over adding a task runner (Turborepo/Nx).

`--if-present` means a workspace project without that script is skipped instead of failing the run, so these three root scripts need no edits as packages are added or dropped, the same "configure once at the root" shape this repo uses for lint and format. The cost is that `dev` starts every workspace project's `dev` script in parallel once a second host exists, not just one. That is accepted as the correct behaviour, not a footgun to design around.

A task runner was rejected as more machinery than a small workspace needs, consistent with this repo's preference for minimal tooling ([CONTRIBUTING.md](../../CONTRIBUTING.md)).
````

**Gate 2**: the files above exist, and `CLAUDE.md` contains both the `## Agent skills` and `## Lint and format` sections.

### Phase 3: the native plugin

Create `{{PACKAGE_DIR}}` with the files below. This is a proof-of-wiring plugin: one public route, one hook, one admin page, and tests. Its job is to prove the host loads it; replace its behaviour once that is proven. Keep the file split (`constants`, `index`, `plugin`, `routes`, `admin`, `astro`, `test-support`) when you do.

````json
// {{PACKAGE_DIR}}/package.json
{
	"name": "{{PACKAGE}}",
	"version": "0.1.0",
	"description": "Native EmDash plugin: {{PLUGIN_NAME}}.",
	"keywords": ["astro", "emdash", "emdash-plugin"],
	"license": "MIT",
	"repository": {
		"type": "git",
		"url": "git+{{REPO_URL}}.git",
		"directory": "{{PACKAGE_DIR}}"
	},
	"files": ["CHANGELOG.md", "src", "!src/**/*.test.ts", "!src/test-support.ts", "!src/astro/tsconfig.json"],
	"type": "module",
	"exports": {
		".": "./src/index.ts",
		"./admin": "./src/admin.tsx",
		"./astro": "./src/astro/index.ts"
	},
	"publishConfig": { "access": "public" },
	"scripts": {
		"typecheck": "tsc --noEmit",
		"test": "vitest run"
	},
	"devDependencies": {
		"@types/react": "^19.0.0",
		"@types/react-dom": "^19.0.0",
		"astro": "catalog:",
		"emdash": "catalog:",
		"react": "catalog:",
		"react-dom": "catalog:",
		"typescript": "catalog:",
		"vitest": "catalog:"
	},
	"peerDependencies": {
		"astro": ">=7.0.0",
		"emdash": ">=1.0.0",
		"react": "^18 || ^19",
		"react-dom": "^18 || ^19"
	}
}
````

A native plugin ships raw `src/` with no build step; the `files` allowlist is the only packaging control, and `.npmignore` is ignored once `files` is set.

````json
// {{PACKAGE_DIR}}/tsconfig.json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "preserve",
		"moduleResolution": "bundler",
		"jsx": "react-jsx",
		"strict": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"noEmit": true
	},
	"include": ["src/**/*"],
	"exclude": ["node_modules", "src/astro"]
}
````

````ts
// {{PACKAGE_DIR}}/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
	},
});
````

````ts
// {{PACKAGE_DIR}}/src/constants.ts
import type { PluginAdminPage } from "emdash";

/**
 * Identity shared by the descriptor (build time) and the definition (request time).
 * Both must agree, so they read from here rather than repeating literals.
 */
export const PLUGIN_ID = "{{PLUGIN_SLUG}}";
export const PLUGIN_VERSION = "0.1.0";
export const PACKAGE_NAME = "{{PACKAGE}}";
export const ADMIN_ENTRY = `${PACKAGE_NAME}/admin`;
export const COMPONENTS_ENTRY = `${PACKAGE_NAME}/astro`;

/** Public route mounted at `/_emdash/api/plugins/<id>/ping`. The wiring proof. */
export const PING_ROUTE = "ping";

/** KV key the `content:afterSave` hook increments. */
export const SAVE_COUNT_KEY = "save-count";

/** Admin pages mount at `/_emdash/admin/plugins/<id>/<path>`. */
export const ADMIN_PAGES = [{ path: "/", label: "{{PLUGIN_NAME}}" }] satisfies PluginAdminPage[];
````

````ts
// {{PACKAGE_DIR}}/src/index.ts
import type { PluginDescriptor } from "emdash";

import {
	ADMIN_ENTRY,
	ADMIN_PAGES,
	COMPONENTS_ENTRY,
	PACKAGE_NAME,
	PLUGIN_ID,
	PLUGIN_VERSION,
} from "./constants";

/**
 * Descriptor factory. Imported by the site's `astro.config.mjs` and evaluated
 * inside Vite at build time, so it must be side-effect free and return plain
 * data only: `options` is serialised to JSON before reaching `createPlugin()`.
 *
 * Register it in `plugins: []`, never `sandboxed: []`. This is a native plugin.
 */
export function {{PLUGIN_CAMEL}}Plugin(): PluginDescriptor {
	return {
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		entrypoint: PACKAGE_NAME,
		format: "native",
		options: {},
		adminEntry: ADMIN_ENTRY,
		adminPages: ADMIN_PAGES,
		componentsEntry: COMPONENTS_ENTRY,
	};
}

/**
 * Load-bearing: the descriptor's `entrypoint` is this package's `.` export, and
 * EmDash statically imports `createPlugin` from it at request time. Removing
 * this re-export breaks the plugin even though the build still passes.
 */
export { createPlugin } from "./plugin";
````

````ts
// {{PACKAGE_DIR}}/src/plugin.ts
import { definePlugin } from "emdash";

import { ADMIN_ENTRY, ADMIN_PAGES, PING_ROUTE, PLUGIN_ID, PLUGIN_VERSION } from "./constants";
import { pingRoute, recordSave } from "./routes";

/**
 * Runtime entry. EmDash imports the descriptor's `entrypoint` at request time
 * and calls `createPlugin(options)` with the descriptor's serialised options.
 *
 * Route names become URL path segments under `/_emdash/api/plugins/{{PLUGIN_SLUG}}/`.
 */
export function createPlugin(_options: Record<string, unknown> = {}) {
	return definePlugin({
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		hooks: {
			// Wiring proof for hooks: every content save bumps a KV counter the
			// ping route reports. Replace with the plugin's real hooks.
			"content:afterSave": async (_event, ctx) => {
				await recordSave(ctx.kv);
			},
		},
		routes: {
			[PING_ROUTE]: pingRoute,
		},
		admin: {
			entry: ADMIN_ENTRY,
			pages: ADMIN_PAGES,
		},
	});
}
````

If `pnpm --filter {{PACKAGE}} typecheck` rejects the hook handler's signature, open the `definePlugin` and hook types in `node_modules/emdash` and adapt the handler to them. Keep a hook that writes to KV; do not delete it to pass the gate.

````ts
// {{PACKAGE_DIR}}/src/routes.ts
import { PluginRouteError, type KVAccess, type PluginRoute } from "emdash";

import { PLUGIN_ID, PLUGIN_VERSION, SAVE_COUNT_KEY } from "./constants";

export type PingResult = { ok: true; plugin: string; version: string; saves: number };

/**
 * EmDash dispatches every HTTP method to a named route, so each handler
 * enforces its own method. A thrown `Response` would surface as a 500;
 * `PluginRouteError` is the only way to pick the status.
 */
function requireMethod(request: Request, method: string): void {
	if (request.method.toUpperCase() !== method) {
		throw new PluginRouteError("METHOD_NOT_ALLOWED", `Use ${method} for this route`, 405);
	}
}

export async function readSaveCount(kv: KVAccess): Promise<number> {
	return (await kv.get<number>(SAVE_COUNT_KEY)) ?? 0;
}

export async function recordSave(kv: KVAccess): Promise<number> {
	const next = (await readSaveCount(kv)) + 1;
	await kv.set(SAVE_COUNT_KEY, next);
	return next;
}

/**
 * `GET /_emdash/api/plugins/{{PLUGIN_SLUG}}/ping`
 *
 * Public so `curl` can prove the host loaded the plugin without a session.
 */
export const pingRoute: PluginRoute = {
	public: true,
	handler: async (ctx): Promise<PingResult> => {
		requireMethod(ctx.request, "GET");
		return {
			ok: true,
			plugin: PLUGIN_ID,
			version: PLUGIN_VERSION,
			saves: await readSaveCount(ctx.kv),
		};
	},
};
````

````tsx
// {{PACKAGE_DIR}}/src/admin.tsx
/**
 * Admin entry. Loaded in the browser by the EmDash admin bundle.
 * Page components receive no props. Pages are keyed by the `path` declared
 * in the descriptor's `adminPages`.
 */
import { {{PLUGIN_PASCAL}}Admin } from "./admin/{{PLUGIN_PASCAL}}Admin";

export { {{PLUGIN_PASCAL}}Admin };

export const pages = {
	"/": {{PLUGIN_PASCAL}}Admin,
};
````

````tsx
// {{PACKAGE_DIR}}/src/admin/{{PLUGIN_PASCAL}}Admin.tsx
/**
 * The plugin's admin page, mounted at `/_emdash/admin/plugins/{{PLUGIN_SLUG}}/`.
 * Calls the ping route and shows the answer: a wiring proof for the admin
 * bundle and for non-public fetches through `apiFetch`.
 */
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import { useEffect, useState } from "react";

import { PING_ROUTE, PLUGIN_ID } from "../constants";
import type { PingResult } from "../routes";

type State =
	| { status: "loading" }
	| { status: "ready"; ping: PingResult }
	| { status: "error"; message: string };

export function {{PLUGIN_PASCAL}}Admin() {
	const [state, setState] = useState<State>({ status: "loading" });

	useEffect(() => {
		let cancelled = false;
		apiFetch(`/_emdash/api/plugins/${PLUGIN_ID}/${PING_ROUTE}`)
			.then((response) => parseApiResponse<PingResult>(response))
			.then((ping) => {
				if (!cancelled) setState({ status: "ready", ping });
			})
			.catch((error: unknown) => {
				if (!cancelled) {
					setState({
						status: "error",
						message: error instanceof Error ? error.message : String(error),
					});
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<section>
			<h1>{{PLUGIN_NAME}}</h1>
			{state.status === "loading" && <p>Checking the plugin…</p>}
			{state.status === "error" && <p role="alert">Ping failed: {state.message}</p>}
			{state.status === "ready" && (
				<dl>
					<dt>Plugin</dt>
					<dd>{state.ping.plugin}</dd>
					<dt>Version</dt>
					<dd>{state.ping.version}</dd>
					<dt>Content saves seen</dt>
					<dd>{state.ping.saves}</dd>
				</dl>
			)}
		</section>
	);
}
````

````ts
// {{PACKAGE_DIR}}/src/astro/index.ts
/**
 * Site-side entry. The emdash integration imports `blockComponents` from every
 * descriptor that declares `componentsEntry`, so the export must exist even
 * while this plugin contributes no Portable Text blocks or Astro components.
 */
export const blockComponents = {};
````

````jsonc
// {{PACKAGE_DIR}}/src/astro/tsconfig.json
{
	// The root tsconfig excludes this directory from `pnpm typecheck`: plain
	// `tsc` can't parse `.astro` files, and imports here may pull in `astro:`
	// virtual modules `tsc` doesn't know. This config exists only so editors
	// resolve modules correctly while editing files in this directory.
	"extends": "../../tsconfig.json",
	"include": ["**/*"],
	"exclude": ["node_modules"]
}
````

````ts
// {{PACKAGE_DIR}}/src/test-support.ts
import type { KVAccess, RouteContext, VersionedValue } from "emdash";

/**
 * In-memory `KVAccess` for tests. KV is the only host boundary the routes
 * and hooks touch.
 */
export function fakeKv(initial: Record<string, unknown> = {}): KVAccess {
	const store = new Map<string, unknown>(Object.entries(initial));
	// Revisions are per-key write counters, formatted as strings the way the host's opaque revisions are.
	const revisions = new Map<string, number>();
	const bump = (key: string): string => {
		const next = (revisions.get(key) ?? 0) + 1;
		revisions.set(key, next);
		return String(next);
	};
	const currentRevision = (key: string): string | null =>
		store.has(key) ? String(revisions.get(key) ?? 0) : null;
	return {
		async get<T>(key: string): Promise<T | null> {
			return store.has(key) ? (store.get(key) as T) : null;
		},
		async getVersioned<T>(key: string): Promise<VersionedValue<T> | null> {
			if (!store.has(key)) return null;
			return { value: store.get(key) as T, revision: String(revisions.get(key) ?? 0) };
		},
		async compareAndSet(key, expectedRevision, value) {
			if (currentRevision(key) !== expectedRevision) return { applied: false };
			store.set(key, value);
			return { applied: true, revision: bump(key) };
		},
		async compareAndDelete(key, expectedRevision) {
			if (currentRevision(key) !== expectedRevision) return { applied: false };
			store.delete(key);
			revisions.delete(key);
			return { applied: true };
		},
		async set(key, value) {
			store.set(key, value);
			bump(key);
		},
		async delete(key) {
			revisions.delete(key);
			return store.delete(key);
		},
		async list(prefix = "") {
			return [...store.entries()]
				.filter(([key]) => key.startsWith(prefix))
				.map(([key, value]) => ({ key, value }));
		},
	};
}

/**
 * Minimal `RouteContext` for driving a route handler directly. Only the
 * fields the handlers read are real: `kv`, `input`, and `request`. The rest
 * of `PluginContext` is not populated, which the cast makes explicit.
 */
export function routeContext<TInput>(opts: {
	method: string;
	input?: TInput;
	kv: KVAccess;
}): RouteContext<TInput> {
	const partial: Pick<RouteContext<TInput>, "kv" | "input" | "request"> = {
		kv: opts.kv,
		input: opts.input as TInput,
		request: new Request("https://internal/route", { method: opts.method }),
	};
	return partial as RouteContext<TInput>;
}
````

If the installed `emdash` version's `KVAccess` has a different method set, make `fakeKv` match it; the type error tells you which methods.

````ts
// {{PACKAGE_DIR}}/src/plugin.test.ts
import { PluginRouteError } from "emdash";
import { describe, expect, it } from "vitest";

import { createPlugin } from "./plugin";
import { pingRoute, readSaveCount, recordSave } from "./routes";
import { fakeKv, routeContext } from "./test-support";

const plugin = createPlugin();

describe("ping route", () => {
	it("is registered and public", () => {
		expect(plugin.routes.ping).toBe(pingRoute);
		expect(pingRoute.public).toBe(true);
	});

	it("reports the plugin identity and zero saves on a fresh KV", async () => {
		const result = await pingRoute.handler(routeContext({ method: "GET", kv: fakeKv() }));
		expect(result).toEqual({ ok: true, plugin: "{{PLUGIN_SLUG}}", version: "0.1.0", saves: 0 });
	});

	it("rejects methods other than GET with a 405 route error", async () => {
		const call = pingRoute.handler(routeContext({ method: "POST", kv: fakeKv() }));
		await expect(call).rejects.toBeInstanceOf(PluginRouteError);
		await expect(call).rejects.toMatchObject({ status: 405 });
	});
});

describe("save counter", () => {
	it("starts at zero and increments per recorded save", async () => {
		const kv = fakeKv();
		expect(await readSaveCount(kv)).toBe(0);
		expect(await recordSave(kv)).toBe(1);
		expect(await recordSave(kv)).toBe(2);
		const result = await pingRoute.handler(routeContext({ method: "GET", kv }));
		expect(result).toMatchObject({ saves: 2 });
	});
});
````

````ts
// {{PACKAGE_DIR}}/src/index.test.ts
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createPlugin, {{PLUGIN_CAMEL}}Plugin } from "./index";

const packageJson = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { name: string; version: string; exports: Record<string, string> };

describe("{{PLUGIN_CAMEL}}Plugin descriptor", () => {
	const descriptor = {{PLUGIN_CAMEL}}Plugin();

	it("declares a native plugin whose entrypoint is this package", () => {
		expect(descriptor.id).toBe("{{PLUGIN_SLUG}}");
		expect(descriptor.format).toBe("native");
		expect(descriptor.entrypoint).toBe(packageJson.name);
	});

	it("keeps its version in step with package.json", () => {
		expect(descriptor.version).toBe(packageJson.version);
	});

	it("points adminEntry and componentsEntry at exports the package actually has", () => {
		expect(descriptor.adminEntry).toBe(`${packageJson.name}/admin`);
		expect(descriptor.componentsEntry).toBe(`${packageJson.name}/astro`);
		expect(packageJson.exports["./admin"]).toBeDefined();
		expect(packageJson.exports["./astro"]).toBeDefined();
	});

	it("is plain data that survives JSON serialisation", () => {
		expect(JSON.parse(JSON.stringify(descriptor))).toEqual(descriptor);
	});
});

describe("createPlugin", () => {
	const plugin = createPlugin();
	const descriptor = {{PLUGIN_CAMEL}}Plugin();

	it("resolves with the same id, version and admin surface as the descriptor", () => {
		expect(plugin.id).toBe(descriptor.id);
		expect(plugin.version).toBe(descriptor.version);
		expect(plugin.admin.entry).toBe(descriptor.adminEntry);
		expect(plugin.admin.pages).toEqual(descriptor.adminPages);
	});
});
````

The `as` in `index.test.ts` is a plain cast of parsed JSON. If `typescript/no-unsafe-type-assertion` fires on it, validate the shape instead (a small zod schema is fine; add `zod: "catalog:"` to `devDependencies`). Do not add a lint override.

Also write `{{PACKAGE_DIR}}/LICENCE` (same text as the root), `{{PACKAGE_DIR}}/CHANGELOG.md` (Keep a Changelog format, one `## [0.1.0]` section dated today with "First scaffold: ping route, save-count hook, admin page"), and `{{PACKAGE_DIR}}/README.md` with: what the plugin is, an **Install** section (`pnpm add {{PACKAGE}}`), a **Configure Astro** section showing `plugins: [{{PLUGIN_CAMEL}}Plugin()]` with the warning "never `sandboxed: []`", a table of plugin id, admin page URL and ping route URL, and a **Licence** line. npm shows this README as the package page.

**Gate 3**

```bash
pnpm install
pnpm --filter {{PACKAGE}} typecheck
pnpm --filter {{PACKAGE}} test
pnpm lint
pnpm format:check
```

### Phase 4: the Cloudflare Test site

Scaffold with EmDash's own tooling, then apply the deltas. From the repo root:

```bash
mkdir -p hosts && cd hosts
pnpm create emdash@1.2.0 web-cloudflare -- --template cloudflare:blog --pm pnpm --no-install --yes
cd ..
```

Add `--sandboxed-plugins` to that command when `{{WITH_LISTING}}` is `yes`. Restore `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` afterwards.

Then apply these deltas to `hosts/web-cloudflare`:

1. **package.json**: set `name` to `web-cloudflare` and `private` to `true`. Remove any `deploy` script. Add `"{{PACKAGE}}": "workspace:*"` to `dependencies`. Replace every version that has a catalog entry with `catalog:`, adding new catalog entries where the template pins something the catalog lacks. Make sure `typecheck` is `astro check` (kept for the day Astro supports TypeScript 7). Keep the template's `emdash` block (`label`, `seed`).
2. **astro.config.mjs**: replace with the file below. Keep the template's `fonts`, `image` and other options if it has ones this file lacks.

````js
// hosts/web-cloudflare/astro.config.mjs
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { {{PLUGIN_CAMEL}}Plugin } from "{{PACKAGE}}";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	// `inspectorPort` pins the workerd DevTools inspector so `.vscode/launch.json`
	// can attach to a known port; unpinned, the Cloudflare Vite plugin silently
	// moves to the next free port when 9229 is busy. See CONTRIBUTING.md#debugging.
	adapter: cloudflare({ inspectorPort: 9229 }),
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			// Native plugin: must be in `plugins`, never `sandboxed`.
			plugins: [{{PLUGIN_CAMEL}}Plugin()],
			// Listing plugin (Phase 5): loaded from its built `dist/` descriptor, so build it first.
			sandboxed: [],
			sandboxRunner: sandbox(),
		}),
	],
	devToolbar: { enabled: false },
});
````

   When `{{WITH_LISTING}}` is `no`, drop `sandbox` from the import and the `sandboxRunner` line. Check the template's generated `astro.config.mjs` for the exact `d1`/`r2` binding names and `wrangler.jsonc` entries before overwriting, and keep the template's values if they differ.

3. **wrangler.jsonc**: keep the template's. With `--sandboxed-plugins` it contains a `worker_loaders` binding named `LOADER`; without it, it does not.
4. **README.md**: replace the first heading and paragraph with:

````markdown
# EmDash Test Site (Cloudflare)

The Test site this monorepo uses to develop and exercise `{{PACKAGE_DIR}}` against a real EmDash/Astro app. It runs locally only; it is not deployed to Cloudflare or anywhere else.
````

   Delete any "Deploy to Cloudflare" button or deploy instructions. Replace the template's local development section with:

````markdown
## Local Development

```bash
pnpm install
cp .env.example .env
npx emdash secrets generate  # paste the printed key into .env
pnpm dev
```

### Admin login (dev only)

Two dev-only routes sign you in as `dev@emdash.local` (admin) without a passkey:

- `/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin/plugins/{{PLUGIN_SLUG}}/` creates a session. Use this.
- `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` is the URL the Dev server prints. It also runs migrations and re-applies `seed/seed.json` on every visit. Only needed on an empty database. `content=0` skips the seed's sample content.
````

5. **CONTEXT.md**:

````markdown
<!-- hosts/web-cloudflare/CONTEXT.md -->
# web-cloudflare

The EmDash test site plugins are developed and exercised against before release.

## Language

**Sandbox runner**:
The component this site configures to execute standard plugins in sandboxed mode: the Cloudflare Worker Loader runner or the Node workerd runner. Without one, plugins listed for sandboxed mode are skipped.
_Avoid_: Sandbox, isolate host, worker loader (that is the Cloudflare binding, not the runner)

**Test site**:
This site — the one plugins in `packages/*` are linked into via `workspace:*` and exercised against before release. It is never deployed; its only job is to run locally as a fixture for plugin development.
_Avoid_: Demo site, example site, starter

**Dev server**:
The long-running local process `pnpm dev` starts for the Test site: Astro's Vite process, together with the workerd environment that executes every request. Developers leave it running and attach tools to it; nothing else starts a second one.
_Avoid_: Runner, host runner (a runner is the Sandbox runner above), dev process
````

6. **docs/adr/0001-test-site-never-deployed.md** inside the host:

````markdown
# The Test site is never deployed

The Test site carries full Cloudflare Workers/D1/R2/Wrangler config and a `deploy` script inherited from the upstream EmDash template, which made it look like a deployable demo. We removed the `deploy` script and the "Deploy to Cloudflare" button from its README: its only job is running locally as a fixture for developing and exercising `packages/*` plugins, and it is never deployed anywhere. Owning a real Cloudflare deployment (account, secrets, routes) for a site with no audience of its own was rejected as maintenance with no payoff. If a live demo is ever needed, that is a separate, deliberate decision, not a leftover default.
````

7. **CONTEXT-MAP.md** at the root: add under `## Contexts` a line `- [web-cloudflare](./hosts/web-cloudflare/CONTEXT.md): the Test site that plugins in `packages/*` are exercised against before release` and under `## Relationships` a line `- **web-cloudflare → packages**: the Test site links each plugin in via `workspace:*` and runs sandboxed ones through its Sandbox runner`.
8. **Secrets**: `cp hosts/web-cloudflare/.env.example hosts/web-cloudflare/.env`, then run `npx emdash secrets generate` in `hosts/web-cloudflare` and put the printed key in `.env`. `.env` is gitignored.

**Gate 4**

```bash
pnpm install
pnpm --filter web-cloudflare build
pnpm lint
pnpm format:check
```

Then start the Dev server in the background from the repo root (`pnpm dev`), wait until it reports `http://localhost:4321`, and run:

```bash
# first run: migrations and seed, follows the redirect
curl -sL -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin"
# the wiring proof
curl -s http://127.0.0.1:4321/_emdash/api/plugins/{{PLUGIN_SLUG}}/ping
```

The second command must return JSON containing `"ok":true` and `"plugin":"{{PLUGIN_SLUG}}"`. Then tell the user the Dev server is up and ask them to open `http://localhost:4321/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin/plugins/{{PLUGIN_SLUG}}/` and confirm the admin page shows the plugin's version. Stop the Dev server before Phase 5.

If `{{WITH_LISTING}}` is `no`, skip Phase 5. If `{{WITH_WEB_NODE}}` is `no`, skip Phase 6.

### Phase 5: the Registry Listing plugin (when `{{WITH_LISTING}}` is `yes`)

A native plugin cannot be listed in the EmDash Registry, which lists sandboxed plugins only. The Listing plugin is a sandboxed plugin whose only job is to represent the native plugin there: one admin page (the Signpost page) that explains the plugin and sends readers to npm. It shares no code, settings or storage with the native plugin and has its own version.

Scaffold from the repo root:

```bash
pnpm dlx @emdash-cms/plugin-cli@0.13.3 init {{REGISTRY_SLUG}} \
  --dir {{LISTING_DIR}} \
  --publisher {{PUBLISHER_DID}} \
  --license MIT \
  --author-name "Azydeco Software Ltd" --author-url https://azydeco.com \
  --security-email tellmemore@azydeco.com \
  --description "{{PLUGIN_NAME}} Registry listing" \
  --repo {{REPO_URL}} \
  --package-manager pnpm --yes
```

If the CLI refuses the placeholder DID, pass `--publisher {{NPM_SCOPE}}.bsky.social` for now and set the `publisher` field in the manifest to the placeholder afterwards. Restore `minimumReleaseAgeExclude` afterwards.

Then apply these deltas to `{{LISTING_DIR}}`. Keep the generated `AGENTS.md`, `.agents/`, `.claude/` and `skills/` as they are.

1. **package.json**: set `name` to `{{LISTING_PACKAGE}}`, `version` `0.1.0`, `private` `true`, `license` `MIT`, and `description` to "Sandboxed EmDash Registry listing for {{PLUGIN_NAME}}. Adds a Signpost page that points to the native plugin on npm." Move every devDependency with a catalog entry to `catalog:`. Make `scripts` exactly:

````json
{
	"validate": "emdash-plugin validate",
	"build": "emdash-plugin build",
	"dev": "emdash-plugin dev",
	"typecheck": "tsc --noEmit",
	"test": "emdash-plugin validate && vitest run",
	"bundle": "emdash-plugin bundle",
	"embed-screenshot": "node scripts/embed-screenshot.mjs"
}
````

   Keep the generated `exports` and `files`; they point at `dist/` and the manifest. Add `vitest: "catalog:"` and `@types/node: "catalog:"` to `devDependencies` if the scaffold did not.

2. **vitest.config.ts**: same content as the native plugin's.
3. **tsconfig.json**: keep the generated one, but make sure `include` covers `src/**/*` and `vitest.config.ts`, and that `verbatimModuleSyntax` is on.
4. **emdash-plugin.jsonc**:

````jsonc
{
	"$schema": "./node_modules/@emdash-cms/plugin-cli/schemas/emdash-plugin.schema.json",

	// Permanent: tied to the publisher on first publish and can't be changed.
	"slug": "{{REGISTRY_SLUG}}",
	// PLACEHOLDER until the Atmosphere account exists. Replace with its DID
	// before the first publish. See docs/{{REGISTRY_SLUG}}-listing/atmosphere-account.md.
	"publisher": "{{PUBLISHER_DID}}",

	"name": "{{PLUGIN_NAME}}",
	// Also shown as the About text. Every piece of listing text must say the
	// feature comes from npm: the Registry's labeler rejects misleading claims.
	// Never state the Native plugin's version anywhere in the listing. At most
	// 140 graphemes.
	"description": "{{PLUGIN_NAME}} for EmDash. Install the native plugin from npm; this listing links to it.",
	"keywords": ["emdash", "native"],
	"sections": {
		"description": { "file": "listing/description.md" },
		"installation": { "file": "listing/installation.md" },
	},
	"license": "MIT",
	"author": { "name": "Azydeco Software Ltd", "url": "https://azydeco.com" },
	"security": { "email": "tellmemore@azydeco.com" },
	"repo": "{{REPO_URL}}",

	// Trust contract. A Listing plugin does nothing but show its Signpost
	// page, so it asks for nothing.
	"capabilities": [],
	"allowedHosts": [],
	"storage": {},

	// Listing media. The screenshot is also served by the `screenshot` route, so
	// it lives in assets/: `bundle` packs screenshots/*.png itself and would
	// pack it twice.
	"release": {
		"artifacts": {
			"icon": { "file": "icon.png" },
			"screenshots": [{ "file": "assets/{{PLUGIN_SLUG}}.png" }],
		},
	},

	// The Signpost page, rendered by the `admin` route via Block Kit.
	"admin": {
		"pages": [{ "path": "/about", "label": "{{PLUGIN_NAME}}", "icon": "info" }],
	},
}
````

5. **Placeholder images**: the Registry needs a 256×256 `icon.png` and a screenshot of at most 1 MiB. Until real images exist, generate solid-colour PNGs with this script, saved as `{{LISTING_DIR}}/scripts/placeholder-png.mjs`:

````js
// Writes a solid-colour PNG. Usage: node scripts/placeholder-png.mjs <out.png> [size=256]
// Placeholder only: replace icon.png and assets/*.png with real images before publishing.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const [, , out, size = "256"] = process.argv;
if (!out) throw new Error("usage: placeholder-png.mjs <out.png> [size]");
const n = Number(size);

const table = new Int32Array(256).map((_, i) => {
	let c = i;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c;
});
const crc = (buf) => {
	let c = -1;
	for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
	const sum = Buffer.alloc(4);
	sum.writeUInt32BE(crc(body));
	return Buffer.concat([len, body, sum]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(n, 0);
ihdr.writeUInt32BE(n, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type: RGB
const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(n * 3, 0x66)]);
const raw = Buffer.concat(Array.from({ length: n }, () => row));

writeFileSync(
	out,
	Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", ihdr),
		chunk("IDAT", deflateSync(raw)),
		chunk("IEND", Buffer.alloc(0)),
	]),
);
````

   Run it twice from `{{LISTING_DIR}}`: `node scripts/placeholder-png.mjs icon.png 256` and `node scripts/placeholder-png.mjs assets/{{PLUGIN_SLUG}}.png 640`. Delete any `screenshots/` directory the scaffold created.

6. **scripts/embed-screenshot.mjs**:

````js
// Writes assets/{{PLUGIN_SLUG}}.png into src/screenshot.ts as base64. The plugin
// build has no asset loader, so the screenshot route can only serve bytes that
// are part of the source. Run after replacing the PNG: `pnpm embed-screenshot`.
import { readFileSync, writeFileSync } from "node:fs";

const png = readFileSync(new URL("../assets/{{PLUGIN_SLUG}}.png", import.meta.url));

writeFileSync(
	new URL("../src/screenshot.ts", import.meta.url),
	`// Generated by scripts/embed-screenshot.mjs from assets/{{PLUGIN_SLUG}}.png. Do not edit.
export const SCREENSHOT_PNG_BASE64 =
	"${png.toString("base64")}";
`,
);
````

   Run `pnpm --filter {{LISTING_PACKAGE}} embed-screenshot` to generate `src/screenshot.ts`.

7. **src/plugin.ts** (replace the scaffold's):

````ts
import { pluginResponse, type SandboxedPlugin } from "emdash/plugin";

import { SCREENSHOT_PNG_BASE64 } from "./screenshot";

const NATIVE_PACKAGE = "{{PACKAGE}}";
const NATIVE_REPO_URL = "{{REPO_URL}}/tree/main/{{PACKAGE_DIR}}";

/** Must match the page `path` declared under `admin.pages` in emdash-plugin.jsonc. */
export const SIGNPOST_PATH = "/about";

/** The public route that serves the Signpost page's screenshot. */
export const SCREENSHOT_ROUTE = "screenshot";

const SCREENSHOT_PNG = Uint8Array.from(atob(SCREENSHOT_PNG_BASE64), (char) => char.charCodeAt(0));

function externalLink(label: string, url: string) {
	return {
		type: "link",
		label,
		appearance: "secondary",
		target: { kind: "external", url },
	} as const;
}

/**
 * Block Kit images must be root-relative (or on an allowed host), so the page
 * points at the plugin's own route. The id is only known at runtime: Registry
 * installs get an opaque `r_…` id, not the slug.
 */
function screenshotUrl(pluginId: string) {
	return `/_emdash/api/plugins/${encodeURIComponent(pluginId)}/${SCREENSHOT_ROUTE}`;
}

const signpostPage = (pluginId: string) => ({
	blocks: [
		{ type: "header", text: "{{PLUGIN_NAME}}" },
		// Block Kit has no width control, so two equal columns keep the text
		// lines short: the copy on the left, the screenshot on the right.
		{
			type: "columns",
			columns: [
				[
					{
						type: "section",
						text:
							"This is the Registry listing for {{PLUGIN_NAME}}: installing it from the Registry adds only this page. " +
							"The feature itself is the native plugin, installed from npm.",
					},
					{
						type: "section",
						text:
							"Why native? The plugin needs host-process access the sandbox can't give, so the Registry can't list it. " +
							"Install it from npm and register it in plugins: [] in astro.config.mjs.",
					},
					{ type: "code", code: `pnpm add ${NATIVE_PACKAGE}`, language: "bash" },
					{
						type: "actions",
						elements: [
							externalLink("npm", `https://www.npmjs.com/package/${NATIVE_PACKAGE}`),
							externalLink("GitHub", NATIVE_REPO_URL),
						],
					},
				],
				[
					{
						type: "image",
						url: screenshotUrl(pluginId),
						alt: "A screenshot of {{PLUGIN_NAME}} in use.",
					},
				],
			],
		},
	],
});

const NO_BLOCKS = { blocks: [] };

function isSignpostPageLoad(input: unknown): boolean {
	return (
		typeof input === "object" &&
		input !== null &&
		"type" in input &&
		input.type === "page_load" &&
		"page" in input &&
		input.page === SIGNPOST_PATH
	);
}

/**
 * The Listing plugin: its only runtime surface is the Signpost page, which
 * sends readers to the Native plugin on npm.
 *
 * Section text renders as plain text, not Markdown, so every link is a link
 * element. Never state the Native plugin's version here; this package is
 * versioned independently of it.
 */
const plugin = {
	routes: {
		admin: {
			handler: async ({ input }: { input: unknown }, ctx: { plugin: { id: string } }) =>
				isSignpostPageLoad(input) ? signpostPage(ctx.plugin.id) : NO_BLOCKS,
		},
		// Public because an <img> can't send the X-EmDash-Request header.
		[SCREENSHOT_ROUTE]: {
			public: true,
			methods: ["GET"],
			request: { body: "none" },
			response: "raw",
			cacheControl: "public, max-age=3600",
			handler: async () =>
				pluginResponse({
					status: 200,
					headers: { "content-type": "image/png" },
					body: { kind: "bytes", value: SCREENSHOT_PNG },
				}),
		},
	},
} satisfies SandboxedPlugin;

export default plugin;
````

8. **src/plugin.test.ts** (replace the scaffold's):

````ts
/// <reference types="node" />
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import plugin, { SCREENSHOT_ROUTE, SIGNPOST_PATH } from "./plugin";

const NATIVE_PACKAGE = "{{PACKAGE}}";
// Registry installs get an opaque id, so the route URL must come from the context.
const PLUGIN_ID = "r_3k9x/abc";

async function admin(input: unknown) {
	return plugin.routes.admin.handler({ input }, { plugin: { id: PLUGIN_ID } });
}

describe("admin route", () => {
	it("renders the Signpost page on page_load for its path", async () => {
		const result = await admin({ type: "page_load", page: SIGNPOST_PATH });
		const json = JSON.stringify(result);

		expect(result).toMatchObject({ blocks: [{ type: "header", text: "{{PLUGIN_NAME}}" }, { type: "columns" }] });
		expect(json).toContain(`pnpm add ${NATIVE_PACKAGE}`);
		expect(json).toContain("/_emdash/api/plugins/r_3k9x%2Fabc/screenshot");
		expect(json).toMatch(/installed from npm/);
	});

	it("never states the Native plugin's version", async () => {
		const result = await admin({ type: "page_load", page: SIGNPOST_PATH });
		expect(JSON.stringify(result)).not.toMatch(/\d+\.\d+\.\d+/);
	});

	it.each([
		{ type: "page_load", page: "/other" },
		{ type: "block_action", action_id: "anything" },
		undefined,
	])("returns no blocks for %o", async (input) => {
		expect(await admin(input)).toEqual({ blocks: [] });
	});
});

describe("screenshot route", () => {
	const route = plugin.routes[SCREENSHOT_ROUTE];

	it("is a public GET route, because an <img> can't send the X-EmDash-Request header", () => {
		expect(route).toMatchObject({ public: true, methods: ["GET"], response: "raw" });
	});

	it("answers with the screenshot's PNG bytes", async () => {
		const response = await route.handler();

		expect(response.status).toBe(200);
		expect(response.headers).toContainEqual(["content-type", "image/png"]);
		const png = readFileSync(new URL("../assets/{{PLUGIN_SLUG}}.png", import.meta.url));
		// If the PNG changed, regenerate src/screenshot.ts with `pnpm embed-screenshot`.
		expect(response.body).toEqual({ kind: "bytes", value: new Uint8Array(png) });
	});
});
````

9. **listing/description.md**:

````markdown
{{PLUGIN_NAME}} is a native EmDash plugin.

**This Registry listing is not the plugin.** Installing it from the Registry adds one information page to the admin and nothing else. {{PLUGIN_NAME}} itself is installed from npm:

```sh
pnpm add {{PACKAGE}}
```

## Why it must be native

The Registry lists sandboxed plugins only, and {{PLUGIN_NAME}} can't run in the sandbox. It is registered in `plugins: []` in `astro.config.mjs`.

## Links

- [npm](https://www.npmjs.com/package/{{PACKAGE}})
- [GitHub]({{REPO_URL}}/tree/main/{{PACKAGE_DIR}})
````

   Edit the "Why it must be native" paragraph to state the actual reason once the plugin has one.

10. **listing/installation.md**:

````markdown
Installing from the Registry adds an information page only. To get {{PLUGIN_NAME}}, install the native plugin from npm — `pnpm add {{PACKAGE}}` — and register it in `plugins: []` in `astro.config.mjs`. Full setup: [README]({{REPO_URL}}/tree/main/{{PACKAGE_DIR}}).
````

11. **CONTEXT.md**:

````markdown
# {{PLUGIN_PASCAL}} listing

The sandboxed plugin that gives the native {{PLUGIN_PASCAL}} plugin a presence in the EmDash Registry, where native plugins cannot be listed.

## Language

**Listing plugin**:
A sandboxed plugin whose only job is to represent a Native plugin in the Registry and send readers to install it from npm. It never provides the Native plugin's feature itself.
_Avoid_: Placeholder, advert, stub, shim, companion

**Native plugin**:
The plugin a Listing plugin represents, installed from npm and registered in `plugins: []`; here, {{PLUGIN_PASCAL}}.
_Avoid_: Real plugin, full plugin, trusted plugin

**Registry**:
The federated EmDash plugin directory at plugins.emdashcms.com, where sandboxed plugins are published and installed from the admin.
_Avoid_: Marketplace (the deprecated central service), plugin store

**Signpost page**:
The single admin page a Listing plugin shows once installed: what the Native plugin does, screenshots, and links to install it.
_Avoid_: Landing page, info page, advert page
````

12. **docs/adr/0001-registry-presence-via-listing-plugin.md** inside the Listing package:

````markdown
# {{PLUGIN_PASCAL}} reaches the Registry through a Listing plugin, not by becoming sandboxed

{{PLUGIN_PASCAL}} has to be a Native plugin. The EmDash Registry lists sandboxed plugins only. To give it a Registry presence, we publish a separate sandboxed Listing plugin, `{{REGISTRY_SLUG}}`. It describes the Native plugin and links to it on npm, and does nothing else.

The Listing plugin shares no code, settings or storage with the Native plugin, and has its own version number (starting at 0.1.0) that changes only when the listing or Signpost page changes. The only thing to keep in step is the listing text, so it never states the Native plugin's version.

## Consequences

- The slug is tied to the publisher DID on first publish and can't be moved. Published versions can't be changed.
- The Registry labeler rejects misleading claims, so the listing must say plainly that the feature is installed from npm, not from the Registry.
- The Signpost page shows its screenshot through a public GET route that serves PNG bytes built into the bundle. The alternative, an external HTTPS image, would need the `network:request` capability, and a network permission would contradict a plugin that does nothing. As a result, the install consent dialog lists one public route.
````

13. **README.md** for the Listing package: what it is (two paragraphs, as in the CONTEXT.md), that it is `private` and never published to npm, a **Develop** section with the three `pnpm --filter {{LISTING_PACKAGE}} test|typecheck|build` commands and the note that the Test site loads the built `dist/` descriptor so it must be built before the first `pnpm dev`, a **Publish** section pointing at `docs/{{REGISTRY_SLUG}}-listing/publishing.md`, and a **Versioning** section (independent of the native plugin; bump only when the listing or Signpost page changes).
14. **Wire it into the host**: in `hosts/web-cloudflare/package.json` add `"{{LISTING_PACKAGE}}": "workspace:*"`. In `hosts/web-cloudflare/astro.config.mjs` add `import {{PLUGIN_CAMEL}}Listing from "{{LISTING_PACKAGE}}";` and set `sandboxed: [{{PLUGIN_CAMEL}}Listing]`.
15. **CONTEXT-MAP.md**: add `- [{{PLUGIN_PASCAL}} listing](./{{LISTING_DIR}}/CONTEXT.md): the sandboxed Listing plugin that represents the native {{PLUGIN_PASCAL}} plugin in the EmDash Registry` under Contexts, and `- **{{PLUGIN_PASCAL}} listing → {{PLUGIN_PASCAL}}**: the Listing plugin points readers to the Native plugin's npm package; it shares no code, settings or storage with it` under Relationships.

**Gate 5**

```bash
pnpm install
pnpm --filter {{LISTING_PACKAGE}} test        # validate, then vitest
pnpm --filter {{LISTING_PACKAGE}} typecheck
pnpm --filter {{LISTING_PACKAGE}} build       # writes dist/; the host needs it
pnpm --filter {{LISTING_PACKAGE}} exec emdash-plugin bundle   # must print "Capabilities: (none)" and no warnings
pnpm --filter web-cloudflare build
pnpm lint
pnpm format:check
```

Then start the Dev server again and ask the user to open the admin, find "{{PLUGIN_NAME}}" in the sidebar under the Listing plugin, and confirm the Signpost page renders with the placeholder image. Stop the Dev server afterwards.

### Phase 6: the Node Test site (when `{{WITH_WEB_NODE}}` is `yes`)

The second host exists so the native plugin can be debugged with the Node inspector, which cannot reach code running inside workerd. From the repo root:

```bash
cd hosts
pnpm create emdash@1.2.0 web-node -- --template node:blog --pm pnpm --no-install --yes
cd ..
```

Restore `minimumReleaseAgeExclude`. Then apply these deltas to `hosts/web-node`:

1. **package.json**: `name` `web-node`, `private` `true`, add `"dev:debug": "node --inspect=127.0.0.1:9230 ./node_modules/astro/bin/astro.mjs dev"` to `scripts`, add `"{{PACKAGE}}": "workspace:*"` (and `"{{LISTING_PACKAGE}}": "workspace:*"` plus `"@emdash-cms/sandbox-workerd": "catalog:"` and `"workerd": "<the version @emdash-cms/sandbox-workerd depends on>"` when the Listing exists). Move pins to `catalog:`. Remove any `deploy` script.
2. **astro.config.mjs**:

````js
import inspector from "node:inspector";
import { fileURLToPath } from "node:url";

import node from "@astrojs/node";
import react from "@astrojs/react";
import { {{PLUGIN_CAMEL}}Plugin } from "{{PACKAGE}}";
import {{PLUGIN_CAMEL}}Listing from "{{LISTING_PACKAGE}}";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

// Under `pnpm dev:debug` the Node inspector is open, but it can't reach the workerd
// isolate that sandboxed plugins run in. So the Listing plugin loads in-process
// instead, from its TypeScript source, and breakpoints in its src/plugin.ts bind.
// The entrypoint is pasted into a generated `import`, so it needs forward slashes on Windows.
const debugListingInProcess = inspector.url() !== undefined;
const {{PLUGIN_CAMEL}}ListingFromSource = {
	...{{PLUGIN_CAMEL}}Listing,
	entrypoint: fileURLToPath(
		new URL("../../{{LISTING_DIR}}/src/plugin.ts", import.meta.url),
	).replaceAll("\\", "/"),
};

export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			storage: local({ directory: "./uploads", baseUrl: "/_emdash/api/media/file" }),
			// Native plugin: must be in `plugins`, never `sandboxed`.
			plugins: debugListingInProcess
				? [{{PLUGIN_CAMEL}}Plugin(), {{PLUGIN_CAMEL}}ListingFromSource]
				: [{{PLUGIN_CAMEL}}Plugin()],
			// Listing plugin: loaded from its built `dist/` descriptor, so build it first.
			sandboxed: debugListingInProcess ? [] : [{{PLUGIN_CAMEL}}Listing],
			// Node has no Worker Loader; this runner isolates sandboxed plugins in workerd.
			sandboxRunner: "@emdash-cms/sandbox-workerd/sandbox",
		}),
	],
	devToolbar: { enabled: false },
});
````

   Without the Listing, drop the inspector logic, the Listing import, `sandboxed` and `sandboxRunner`, leaving `plugins: [{{PLUGIN_CAMEL}}Plugin()]`. Keep the template's `database` and `storage` values if they differ from the above.

3. **README.md**: retitle to "EmDash Test Site (Node)", same Test-site framing as web-cloudflare, infrastructure section says Node.js, SQLite, local filesystem, `@astrojs/node`. Add: "Node has no Worker Loader, so the site runs sandboxed plugins through `@emdash-cms/sandbox-workerd`." when the Listing exists.
4. **CONTEXT-MAP.md**: add `- web-node (`hosts/web-node`): the same Test site on the Node adapter, for Node-inspector debugging. It shares web-cloudflare's glossary and has no CONTEXT.md of its own` under Contexts.
5. `.env` as for web-cloudflare.

**Gate 6**

```bash
pnpm install
pnpm --filter web-node build
pnpm lint
pnpm format:check
```

Start only web-node (`pnpm --filter web-node dev`), run the setup and ping `curl` checks from Gate 4 against the port it prints, then stop it.

### Phase 7: release docs and final checks

Create `docs/{{REGISTRY_SLUG}}/packaging.md` from **Appendix C**. When the Listing exists, create `docs/{{REGISTRY_SLUG}}-listing/publishing.md` from **Appendix D** and `docs/{{REGISTRY_SLUG}}-listing/atmosphere-account.md` from **Appendix E**.

Finish `README.md` so every link resolves and every package that exists has a bullet.

**Gate 7** (from the repo root, with no Dev server running)

```bash
pnpm test
pnpm build
pnpm lint
pnpm format:check
git status --short     # nothing generated should be untracked except gitignored files
```

Make one commit per phase if the user wants history; otherwise one commit. No `Co-Authored-By` lines.

Finally, report: each gate and its result, every place you deviated from this prompt and why, the newer versions npm reports for `create-emdash`, `@emdash-cms/plugin-cli`, `emdash` and `@emdash-cms/*`, and the three things that still need a human: real images for the Listing, the publisher DID, and the npm login.

---

## Appendix A: CONTRIBUTING.md

````markdown
# Contributing

This is a pnpm workspace: `hosts/*` (the EmDash Test sites) and `packages/*` (plugins). Lint and format tooling is configured once at the repo root and covers every workspace. There are no per-package lint or format configs or scripts.

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
pnpm --filter {{PACKAGE}} test
pnpm --filter web-cloudflare build
```

There is no root `typecheck` script. The host's `typecheck` script (`astro check`) does not run under TypeScript 7, which this workspace pins: the Astro language server needs an API that TypeScript's native compiler does not expose yet. Use `pnpm build` (or `pnpm --filter web-cloudflare build`) as the host's check until Astro catches up; the plugins' `pnpm --filter <package> typecheck` still works.

`pnpm build` on a host breaks a running Dev server for that host: every route then answers 500 until the server is restarted. Build, then stop the Dev server and start it again; do not expect the running one to recover.

There is no CI yet, so these are the checks. The pre-commit hook (below) runs format and lint on staged files; run `pnpm lint` and `pnpm format:check` yourself before considering a change done, since the hook only sees what you staged.

## Two formatters

Everything goes through [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) except `.astro` files, which go through Prettier with `prettier-plugin-astro`.

The reason is capability, not preference: oxfmt cannot parse `.astro` yet (Oxc issue [#19715](https://github.com/oxc-project/oxc/issues/19715) tracks it). When it can, the Prettier dependency, `.prettierrc` and the `prettier` halves of the `format` scripts and the lint-staged config should all go.

| Formatter                          | Files                                                                  | Config          |
| ---------------------------------- | ---------------------------------------------------------------------- | --------------- |
| oxfmt                              | Every type it supports that the ignore list does not exclude: `.ts`, `.tsx`, `.mjs`, `.json`, `.jsonc`, `.yaml`, and `.css` if added. | `.oxfmtrc.json` |
| Prettier + `prettier-plugin-astro` | `**/*.astro` only. Prettier is never invoked on anything else.         | `.prettierrc`   |

Both use tabs. Two differences to know about:

- **Print width.** oxfmt's default is 100, Prettier's is 80, and neither config sets it. So `.astro` files wrap at 80 and everything else at 100.
- **Import sorting.** oxfmt sorts imports (`experimentalSortImports`). Prettier does not, so imports in `.astro` frontmatter are left in whatever order you wrote them.

**Not formatted:** Markdown (`**/*.md` is in the oxfmt ignore list by decision), the generated `.d.ts` files (`emdash-env.d.ts`, `worker-configuration.d.ts`), the seed data files (`hosts/*/seed/seed.json`), and build output (`dist`, `.wrangler`, `.astro/`). oxfmt also skips `pnpm-lock.yaml` on its own.

## Linting

[oxlint](https://oxc.rs/docs/guide/usage/linter.html) runs from the root over every workspace. What is on:

- **Plugins:** `eslint`, `typescript`, `unicorn`, `oxc`, `import`, `vitest`, `react`, `jsx-a11y`. Naming any plugin replaces oxlint's default set, so all eight are listed in `.oxlintrc.json`.
- **Categories:** `correctness` is an error; `suspicious` and `perf` are warnings. `pnpm lint` passes `--deny-warnings`, so a warning fails the run just like an error.
- **Type-aware rules** (`no-floating-promises`, `no-unsafe-type-assertion` and friends) come from `oxlint-tsgolint`, enabled by `typeAware: true` in the root config and `--type-aware` on the scripts. The Native plugin (`{{PACKAGE_DIR}}`) exports its `.ts` source directly, so it needs no build before linting the host that imports it. A Listing plugin is sandboxed and exports only its built `dist/`, so build it once (`pnpm build`) after a fresh clone, before linting or running the host.
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
| Host pages (`src/pages/*.astro` frontmatter), `src/worker.ts`, and the plugin's `routes.ts` and `plugin.ts` | workerd | **Attach: Cloudflare Worker**. Attaches to the workerd DevTools inspector on port 9229, then hit the route in a browser or with `curl`. |
| The plugin's admin UI (`src/admin.tsx`, `src/admin/*`) | Browser | **Debug admin UI in Chrome**. Launches Chrome on the VS Code client machine (works from Remote-WSL, where there is no Linux browser) at the plugin's admin page. |
| Plugin unit tests | Node (Vitest) | The recommended Vitest extension: "Debug Test" from the gutter or the Testing view. No launch config needed. |
| Config-time code (`astro.config.mjs`, the descriptor factory) | Node (Vite) | Start `pnpm dev` from a **JavaScript Debug Terminal** (Terminal menu). Node-side breakpoints bind automatically; it does not interfere with the worker attach. |

The compound **Test site worker + admin UI** runs the first two together.

`hosts/web-node`, when present, runs on the Node adapter, so its pages and the Native plugin run in the `astro` Node process itself. Start it with `pnpm dev:debug` from `hosts/web-node`, which opens the Node inspector on `127.0.0.1:9230` (9229 belongs to the Cloudflare worker), then run **Attach: web-node dev**. Sandboxed plugins normally run in a workerd isolate the Node debugger can't reach, so whenever the Node inspector is open, `hosts/web-node/astro.config.mjs` loads the Listing plugin in-process from its `src/plugin.ts` instead. Breakpoints in its route handler then bind, but it runs without isolation or sandbox limits in that mode.

Details worth knowing:

- The inspector port is pinned to 9229 in `hosts/web-cloudflare/astro.config.mjs` (`cloudflare({ inspectorPort: 9229 })`). Unpinned, the Vite plugin silently moves to the next free port and the attach connects to nothing. If 9229 is busy, free it rather than editing the pin.
- The worker attach has `restart: true`: when you restart the Dev server (for example after `astro build` breaks it, see [Checks](#checks)), the session reconnects on its own instead of dying.
- The workerd inspector accepts one client. While VS Code is attached, do not open a second inspector connection (another attach, Chrome DevTools on port 9229, or a tool that probes the inspector). The second client wedges the Dev server and it has to be restarted.
- The attach fails within ten seconds if nothing is listening. That is the "start `pnpm dev` first" reminder, not a bug.
- The Chrome config opens `127.0.0.1:4321`. The worker attach uses `127.0.0.1:9229` explicitly, because the inspector proxy is IPv4-only on every OS. If the Dev server came up on another port because 4321 was taken, edit the URL for that session. Run only one Dev server at a time; a WSL one and a Windows one both answer on `localhost`.
- The admin UI needs a login. Use the dev-only auth bypass route; see the Test site README.
- Breakpoints in the Native plugin's source bind because the Test site links the package with `workspace:*` and imports its `.ts` directly; the worker reports the absolute source path and an inline source map.
- In the browser session, Vite serves the plugin's files (outside the host root) as `/@fs/<absolute path>`. The Chrome config maps that prefix to `/` with `pathMapping` (to `""` under the `windows` override, since Vite's prefix is followed by a drive letter there); without it, breakpoints in `src/admin/*` stay unbound.

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
````

## Appendix B: root README.md

````markdown
# {{PLUGIN_SLUG}}

A pnpm workspace with these packages:

- **[`hosts/web-cloudflare`](hosts/web-cloudflare/README.md)** — the Test site: an EmDash/Astro app on the Cloudflare adapter that exists purely to exercise the plugins below. It runs locally only and is never deployed.
- **[`hosts/web-node`](hosts/web-node/README.md)** — the same Test site on the Node adapter, kept for debugging with the Node inspector (see [`CONTRIBUTING.md#debugging`](CONTRIBUTING.md#debugging)). *(Only when scaffolded.)*
- **[`{{PACKAGE_DIR}}`]({{PACKAGE_DIR}}/README.md)** — `{{PACKAGE}}`, the native EmDash plugin under development in this repo.
- **[`{{LISTING_DIR}}`]({{LISTING_DIR}}/README.md)** — the sandboxed Listing plugin that represents the native plugin in the EmDash Registry. *(Only when scaffolded.)*

## Requirements

- **Node.js ≥ 22.16** — the floor set by this workspace's dependencies.
- **pnpm 12.4.1** — [installation details are on the pnpm website](https://pnpm.io/installation)

## Setup

```bash
pnpm install
pnpm build          # the Listing plugin's dist/, which the Test site loads
pnpm dev
```

Then open `http://localhost:4321/_emdash/api/plugins/{{PLUGIN_SLUG}}/ping`. A JSON answer with `"ok": true` means the Test site loaded the plugin. The admin page is at `/_emdash/admin/plugins/{{PLUGIN_SLUG}}/`; see the Test site README for the dev-only login.

## Commands

Run from the repo root. `dev`, `build`, and `test` fan out to every workspace project that defines that script ([ADR-0001](docs/adr/0001-root-scripts-fan-out-recursively.md)); `lint` and `format` run once over the whole workspace.

| Command | Does |
|---|---|
| `pnpm dev` | Starts every workspace project's dev server, in parallel. |
| `pnpm build` | Builds every workspace project that has a `build` script. |
| `pnpm test` | Runs every workspace project's tests. |
| `pnpm lint` | Lints the whole workspace with oxlint; fails on any warning. |
| `pnpm lint:fix` | Applies safe oxlint fixes. |
| `pnpm format` | Formats the whole workspace (oxfmt, then Prettier for `.astro`). |
| `pnpm format:check` | Checks formatting without writing; fails on any difference. |

`prepare` (`husky`) isn't run directly — `pnpm install` runs it automatically to set up the pre-commit hook.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full checks workflow, the pre-commit hook, debugging, and why there's no root `typecheck` script.

## Licence

MIT. See [`LICENCE`](LICENCE).
````

## Appendix C: docs/{{REGISTRY_SLUG}}/packaging.md

````markdown
## Release checklist

Work through this list for every release. Each step is explained in more detail below.

- [ ] The release changes are merged to `main`. Your local `main` is checked out, clean, and up to date with `origin`, because `pnpm publish` refuses to publish from any other state (see [Git checks](#git-checks)).
- [ ] `version` is bumped in `{{PACKAGE_DIR}}/package.json`. npm versions are immutable, so every publish needs a new version, including a docs-only change: the README ships in the tarball. Use a patch bump for fixes and docs, and a minor bump for new features. While the package is pre-1.0, a breaking change is also a minor bump.
- [ ] `PLUGIN_VERSION` in `{{PACKAGE_DIR}}/src/constants.ts` matches the new `version`. It is the version the plugin reports to EmDash, and it isn't derived from `package.json`. The `index.test.ts` test fails if they differ.
- [ ] `peerDependencies` in the plugin's `package.json` still match the `emdash` and `astro` versions pinned in the root `pnpm-workspace.yaml` catalog.
- [ ] `{{PACKAGE_DIR}}/CHANGELOG.md` has a section for the new version, dated with the release day, and a matching link reference at the bottom of the file. It ships in the tarball, so write it before publishing.
- [ ] `{{PACKAGE_DIR}}/README.md` covers any user-facing change. npm displays this README as the package page.
- [ ] `pnpm test`, `pnpm lint` and `pnpm format:check` pass. Run them from the repo root.
- [ ] The tarball preview lists only the expected files, and `catalog:` has resolved to real ranges (see [Preview the tarball](#preview-the-tarball)).
- [ ] `pnpm whoami` prints your npm username. `pnpm publish --dry-run` never contacts the registry, so it can't catch a missing or expired login.
- [ ] Published with `pnpm publish` (see [Publish](#publish)).

## Where to run the commands

Unless a step says otherwise, **run every command in this guide from the plugin package directory**, not from the repo root:

```bash
cd {{PACKAGE_DIR}}   # starting from the repo root
```

`pnpm pack` and `pnpm publish` act on the package in the current directory. From the repo root, they would pack the private workspace root instead of the plugin. If you'd rather stay in the repo root, give each command the package directory with `-C`:

```bash
pnpm -C {{PACKAGE_DIR}} pack --dry-run
pnpm -C {{PACKAGE_DIR}} publish
```

The lint, format and test scripts are the exception. They are root scripts (see `CONTRIBUTING.md`), so run them from the repo root.

## Public repository

The plugin is developed under `{{PACKAGE_DIR}}` in the [{{REPO_URL}}]({{REPO_URL}}) monorepo and published to npm from that directory with `pnpm publish`. The `repository.directory` field in `package.json` points npm's UI at the subfolder. There is no separate mirror repository and no CI publish workflow, so publishing is a manual step that a maintainer runs.

## Packaging and publishing a release

pnpm publishes this package directly, so you don't need the `npm` CLI.

### One-time setup

Do this if you haven't published from this machine before:

- Get an npm account with publish access to the `@{{NPM_SCOPE}}` scope.
- Authenticate in one of two ways:
  - Run `pnpm login --scope=@{{NPM_SCOPE}}`. This is interactive and handles 2FA.
  - Create an access token in your npm account settings and add it to `~/.npmrc`:
    ```
    //registry.npmjs.org/:_authToken=<token>
    ```

### Preview the tarball

Always preview the tarball before publishing. This step never touches the registry. Run it from `{{PACKAGE_DIR}}`:

```bash
pnpm pack --dry-run
```

Packing turns the `catalog:` version specifiers into real semver ranges in the packed `package.json`. It also applies the `"files"` allowlist from `package.json`. That allowlist ships raw `src/` with no build step, as the native-plugin guide requires. It excludes `*.test.ts`, `test-support.ts` and `src/astro/tsconfig.json`.

If you add files later, note that a `.npmignore` has no effect here, whether you put it in the package root or inside `src/`. When `"files"` is set, pnpm ignores `.npmignore` completely. To exclude a new non-runtime file, add a negated glob to `"files"`, for example `"!src/**/*.test.ts"`.

To inspect the exact file list and the resolved manifest:

```bash
pnpm pack --dry-run --json                  # file list, machine-readable; writes nothing
pnpm pack --pack-destination /tmp           # writes the real .tgz outside the repo
tar -xOzf /tmp/{{NPM_SCOPE}}-emdash-plugin-{{PLUGIN_SLUG}}-<version>.tgz package/package.json
rm /tmp/{{NPM_SCOPE}}-emdash-plugin-{{PLUGIN_SLUG}}-<version>.tgz
```

Without `--pack-destination`, `pnpm pack` writes the `.tgz` into the package directory. Delete it so it doesn't end up in a commit.

### Git checks

By default, `pnpm publish` fails with `ERR_PNPM_GIT_NOT_CORRECT_BRANCH` unless all of the following are true:

- The current branch is `main` (or `master`).
- The working tree is clean.
- The branch is in sync with its remote.

Publish from an up-to-date `main` after the release PR is merged. `--no-git-checks` skips these checks, but only use it deliberately, for example for a pre-release published under `--tag next`.

### Publish

Run this from `{{PACKAGE_DIR}}`:

```bash
pnpm whoami              # confirms you're logged in to npm
pnpm publish --dry-run   # runs every check and prints what would be published, without uploading
pnpm publish
```

This package is scoped, and `publishConfig.access: "public"` is already set, so you don't need an `--access` flag. If the `version` in `package.json` is already on the registry, the publish is rejected. Bump the version and try again.

If the publish fails with `404 Not Found` for a package that already exists on npm, you aren't authenticated. The registry reports a missing or expired login on a scoped package as a 404, not a 401. Run `pnpm login --scope=@{{NPM_SCOPE}}` and try again.
````

## Appendix D: docs/{{REGISTRY_SLUG}}-listing/publishing.md

````markdown
## Release checklist

Work through this list for every release of the Listing plugin. Each step is explained in more detail below. For the Native plugin's npm release, see [packaging.md](../{{REGISTRY_SLUG}}/packaging.md) instead.

- [ ] The Atmosphere account exists, and `publisher` in `emdash-plugin.jsonc` is its DID, not the placeholder (see [One-time setup](#one-time-setup)).
- [ ] The release changes are merged to `main`, and your local `main` is checked out, clean and up to date with `origin`.
- [ ] This release changes the listing or the Signpost page. If it doesn't, don't release (see [When to release](#when-to-release)).
- [ ] `version` is bumped in `{{LISTING_DIR}}/package.json`. Published versions can't be changed, so every publish needs a new version.
- [ ] No listing text states the Native plugin's version, and none of it suggests that installing from the Registry provides the feature itself.
- [ ] `icon.png` and the screenshots are real images, not the placeholders from the scaffold (see [Listing images](#listing-images)).
- [ ] `pnpm test`, `pnpm lint` and `pnpm format:check` pass. Run them from the repo root.
- [ ] `validate` and `bundle` pass without warnings (see [Check the bundle](#check-the-bundle)).
- [ ] `whoami` shows the publisher account as the active publisher.
- [ ] Published with `publish`, and the labeler has approved the release (see [Publish](#publish)).
- [ ] The Registry install smoke test passes in the Test site (see [Smoke test](#smoke-test)).
- [ ] The Native plugin's README links to the listing (first publish only; see [Link the listing from the Native plugin](#link-the-listing-from-the-native-plugin)).

## Where to run the commands

Unless a step says otherwise, **run every command in this guide from the Listing plugin's package directory**:

```bash
cd {{LISTING_DIR}}   # starting from the repo root
```

`emdash-plugin` reads `emdash-plugin.jsonc` from the current directory. The lint, format and test scripts are the exception. They are root scripts (see `CONTRIBUTING.md`), so run them from the repo root.

This package is `private` and is never published to npm. Don't run `pnpm publish` here; the Registry is its only channel.

## What gets published

The Registry shows the package profile and the release, both built from `emdash-plugin.jsonc`:

| Listing field            | Source                                                     |
| ------------------------ | ---------------------------------------------------------- |
| Name, tagline and About  | `name` and `description`                                   |
| Description section      | `listing/description.md`                                   |
| Installation section     | `listing/installation.md`                                  |
| Icon                     | `icon.png` (256×256 PNG)                                   |
| Screenshots              | `release.artifacts.screenshots`                            |
| Permissions              | `capabilities` and `allowedHosts` (both empty)             |
| Keywords, author, licence, security contact and repo | the matching manifest fields   |

The install consent dialog also lists the plugin's one public route, `screenshot`, which serves the Signpost page's image. [ADR 0001](../../{{LISTING_DIR}}/docs/adr/0001-registry-presence-via-listing-plugin.md) explains why the route exists.

Profile fields (name, description, keywords, sections, licence, author, security contact) are ignored after the first publish, because the existing profile wins. To change them later without a new release, use `emdash-plugin update-package`.

## One-time setup

Do this before the first publish:

1. Create the Atmosphere account and give it a domain handle. [atmosphere-account.md](atmosphere-account.md) walks through both.
2. Replace the placeholder `publisher` in `emdash-plugin.jsonc` with the account's DID. Prefer the DID to the handle, because the handle can change and the DID can't.
3. Log in:

   ```bash
   pnpm exec emdash-plugin login <handle>   # opens the provider's sign-in page in the browser
   pnpm exec emdash-plugin whoami           # shows the active publisher
   ```

   `login` uses AT Protocol OAuth, so EmDash never sees the password. If `whoami` lists more than one session, make the right one active with `emdash-plugin switch`.

> [!CAUTION]
> The first publish ties the slug `{{REGISTRY_SLUG}}` to the publisher's DID permanently. It can't be moved to another account or renamed afterwards. Check the `slug` and `publisher` before you run `publish` for the first time.

## Listing images

Screenshot 1 is `assets/{{PLUGIN_SLUG}}.png`. The same file is embedded in the plugin and served by the `screenshot` route, so it lives in `assets/` rather than `screenshots/`: `bundle` packs `screenshots/*.png` automatically and would pack it twice. If you replace this PNG, run `pnpm embed-screenshot` to regenerate `src/screenshot.ts`. The unit tests fail until you do.

Further screenshots (up to 8, each PNG, JPEG or WebP of at most 1 MiB) go in `assets/` too and are listed after screenshot 1 under `release.artifacts.screenshots`.

## Check the bundle

```bash
pnpm exec emdash-plugin validate
pnpm exec emdash-plugin bundle
```

`validate` checks the manifest offline. `bundle` builds the plugin and writes the tarball it would publish to `dist/`, without uploading anything. Both should pass without warnings. In particular, `bundle` warns if `icon.png` isn't 256×256, and its output should list `Capabilities: (none)`.

The Registry's limits are 128 KB per bundled file, 256 KB per bundle, 20,000 bytes per section, 140 graphemes for the `description`, 5 keywords, and 1 MiB per listing image. The embedded screenshot counts toward the bundle size, so keep it well under 128 KB.

## Publish

```bash
pnpm exec emdash-plugin whoami   # confirms the right account is the active publisher
pnpm exec emdash-plugin publish
```

`publish` rebuilds the bundle, uploads it and the listing images to the publisher's server, and creates the release record.

Published versions can't be changed. Don't use `--allow-overwrite`: labelers may treat a changed release as a takedown event. If something is wrong with a release, bump the version and publish again.

### Wait for the labeler

The listing doesn't appear at [plugins.emdashcms.com](https://plugins.emdashcms.com) until the Registry's labeler approves the release. The labeler rejects misleading claims, which is why every piece of listing text says the feature is installed from npm. `publish` prints a command to follow the checks:

```bash
pnpm exec emdash-plugin info <handle> {{REGISTRY_SLUG}} --version <version> --watch
```

## Smoke test

Once the listing is live, install it from the Registry into the Test site:

1. Remove the Listing plugin from `sandboxed: []` in `hosts/web-cloudflare/astro.config.mjs`, so the Signpost page you check is the Registry copy, not the workspace one. Don't commit this change.
2. Start the Test site and log in to the admin.
3. Open the Registry, search for "{{PLUGIN_NAME}}", and choose **Install**.
4. Check that the consent dialog lists no permissions apart from the one public `screenshot` route.
5. Open the "{{PLUGIN_NAME}}" page in the admin sidebar. Check that the screenshot renders and that each link button opens the right page in a new tab.
6. Check that the Native plugin still works: hit its ping route and confirm the answer.

Then uninstall the Registry copy and restore `astro.config.mjs`.

## Link the listing from the Native plugin

After the first publish, add a "Find it in the Registry" link to `{{PACKAGE_DIR}}/README.md`, pointing at the listing URL that `publish` printed. The README ships in the Native plugin's npm tarball, so the link reaches npm with its next release.

## When to release

The Listing plugin's version is independent of the Native plugin's. It starts at 0.1.0. Bump it only when the listing or the Signpost page changes:

- Release when the Signpost page, the icon or the screenshots change. They belong to the release, so they need a new version.
- Release when `capabilities`, `allowedHosts` or `storage` change. Installed sites consented to the old trust contract, so the change needs a new version.
- For a change to profile text only (`name`, `description`, `keywords` or the sections), run `pnpm exec emdash-plugin update-package` instead. It updates the published profile without a release, because `publish` ignores profile fields once the profile exists.
- Don't release for a Native plugin release. Nothing in the listing states the Native plugin's version, so it never needs updating to match.
````

## Appendix E: docs/{{REGISTRY_SLUG}}-listing/atmosphere-account.md

````markdown
## References

- [Publishing plugins](https://docs.emdashcms.com/plugins/creating-plugins/publishing/): the EmDash guide to Atmosphere accounts, `emdash-plugin login`, and `publish`.
- [Automated plugin releases](https://docs.emdashcms.com/plugins/creating-plugins/delegated-releases/): publishing from GitHub Actions with `emdash-plugin release setup`.
- [atmosphereaccount.com](https://atmosphereaccount.com): a list of Atmosphere account providers.
- [AT Protocol handles](https://atproto.com/specs/handle): how a domain handle is verified with a DNS `TXT` record or `/.well-known/atproto-did`.
- [AT Protocol DIDs](https://atproto.com/specs/did) and the [PLC directory](https://web.plc.directory): the permanent account identifier that `publisher` pins.
- The plugin CLI's publishing reference, vendored by the host scaffold at `hosts/web-cloudflare/.agents/skills/creating-plugins/references/publishing.md`.
- [publishing.md](publishing.md): the Listing plugin's publishing checklist, which starts from this setup.

## Setting up the Atmosphere account

An Atmosphere account is a standard AT Protocol account, the same kind of identity Bluesky uses. The EmDash Registry has no separate signup or approval step. Once the account exists, you log in with the plugin CLI, and the account becomes the publisher of the Listing plugin.

### 1. Create the account

Create the account with any provider:

- **Bluesky** ([bsky.app](https://bsky.app)): the quickest route. It gives you a handle like `<name>.bsky.social`, hosted on Bluesky's server.
- **A community provider**, from [atmosphereaccount.com](https://atmosphereaccount.com).
- **Self-hosted**: you run your own server. This gives full control, but it's more to operate.

Bluesky is the recommended route. Sign up with a shared company mailbox, not a personal address, because this account owns the plugin permanently.

### 2. Use your domain as the handle

A domain handle shows the publisher as `@yourdomain.com` rather than `@name.bsky.social`. In Bluesky, open **Settings → Account → Handle → I have my own domain**. It gives you a DNS record to add to the zone:

| Type  | Name                       | Value            |
| ----- | -------------------------- | ---------------- |
| `TXT` | `_atproto.yourdomain.com`  | `did=did:plc:…`  |

After the record is verified, the handle becomes the domain. You can change the handle later. The Registry ties the plugin to the account's **DID**, which never changes, not to the handle.

### 3. Set `publisher` in the manifest

`{{LISTING_DIR}}/emdash-plugin.jsonc` has a placeholder `publisher`. Replace it with the account's DID. Prefer the DID to the handle, because the DID never changes.

The DID is the `did=` value in the DNS record from step 2. You can also resolve it from the handle:

```bash
curl 'https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=yourdomain.com'
```

### 4. Log in and validate

Run these from `{{LISTING_DIR}}`:

```bash
pnpm exec emdash-plugin login yourdomain.com   # opens the provider's sign-in page in the browser
pnpm exec emdash-plugin validate
```

`login` uses AT Protocol OAuth, so EmDash never sees the password.

> [!CAUTION]
> Don't run `publish` yet. It can't be undone: the first publish ties the slug `{{REGISTRY_SLUG}}` to this DID permanently. Make sure every detail is correct first.

## Decisions to make before creating the account

- **Who controls the account.** The `publisher` account owns every future release. Decide whether a named person or a shared company login holds it, and where its credentials are kept.
- **Automated releases (optional).** `emdash-plugin release setup` generates a GitHub Actions workflow that publishes without stored secrets. On its first run, the publisher account approves the repository in the release dashboard. See [Automated plugin releases](https://docs.emdashcms.com/plugins/creating-plugins/delegated-releases/).
````
