# EmDash upgrade work order

This file is the handoff for upgrading the project at `/home/dan/github/emdash-plugin-404/hosts/web-node` to the npm `latest` release. The updater resolved the direct packages, changed and installed them where needed, refreshed the project EmDash skills, and compared the installed core migration manifests. It did not edit application code, apply a database migration, or deploy the site.

## Package changes

- `@emdash-cms/sandbox-workerd`: `0.9.1` → `0.9.8` (`0.9.1` → `0.9.8` in the `default` pnpm catalog)

The updater changed pnpm catalog entries in `pnpm-workspace.yaml`. The new versions apply to every workspace package that uses those catalog entries.

## Release entries to assess

These are the complete authored major, minor, and patch entries crossed by the direct EmDash packages in this project. Changesets dependency-bump entries and attribution wrappers have been removed. Check whether each entry affects code or configuration in this project. Do not adopt an unrelated feature merely because it appears here.

### Change 1

Applies to: `@emdash-cms/sandbox-workerd@0.9.8` (patch)  
Source: [#4799](https://github.com/emdash-cms/emdash/pull/4799)

Fixes production workerd sandboxes outliving their Node.js host and holding plugin ports open. On Linux and macOS, sandboxes now stop when the host exits, including after SIGKILL when `/bin/sh` is available. SIGTERM and SIGINT preserve the host's default exit when no application handler is registered. With `/bin/sh` available, application handlers can drain plugin requests without sandbox resources holding the host open. On shell-less POSIX hosts, sandboxes stop immediately on either signal to avoid orphaning workerd if an application handler re-raises it; host SIGKILL cleanup remains unavailable.
  
  Cleanup also works when Node.js runs as PID 1, such as in Docker containers.

### Change 2

Applies to: `@emdash-cms/sandbox-workerd@0.9.8` (patch)  
Source: [#4911](https://github.com/emdash-cms/emdash/pull/4911)

Caches EmDash image files for one year on sites with a compatible route-cache provider, such as `cacheCloudflare()`. Original files from `/_emdash/api/media/file/` and eligible resized variants from `/_image` share the tag `emdash:media:<storageKey>`. Replacing an image, or deleting one whose stored file is removed, purges that tag. Deletes from the admin media library and media picker, the MCP `media_delete` tool and `ctx.media.delete()` in plugin routes are covered, subject to the [purge limitations](https://docs.emdashcms.com/deployment/route-caching/#media-files).
  
  Astro's `memoryCache()` does not receive automatic media cache entries at any response size; page caching is unaffected. Other providers must preserve distinct source URLs and transform options in their cache keys and support conditional requests. Audio, video, partial responses and original-file URLs with query strings are not stored. Variants are eligible only when their `href` is a plain EmDash media path or that path prefixed with the request's origin, without a nested query or fragment.
  
  Automatic variant caching and query normalization apply only to Astro's stock sharp service on Node and `@astrojs/cloudflare/image-service-workerd` on Cloudflare. With these services, `/_image` URLs for EmDash media redirect with a `301` when their outer query contains unknown or repeated parameters, uses a different parameter order or encodes values differently. This also applies without a cache provider. Stock-service URLs built by `<Image>` and `getImage()` are unaffected. Custom image services retain their existing handling and parameters without these redirects or automatic variant caching.

### Change 3

Applies to: `@emdash-cms/sandbox-workerd@0.9.8` (patch)  
Source: [#4800](https://github.com/emdash-cms/emdash/pull/4800)

Fixes `wallTimeMs` timeouts leaving runaway Node.js sandboxed plugin invocations executing after their callers fail. After a timeout, the runner probes the affected plugin's listener for up to 500 ms and force-stops and restarts workerd if the listener is unresponsive or the invocation remains unsettled for one additional `wallTimeMs` interval. This stops yielding loops and slow I/O that later enters a CPU loop, while responsive handlers that settle within the grace period leave other plugins' calls running. Restarts interrupt all in-flight plugin calls and reset their in-memory state because plugins share the process.

### Change 4

Applies to: `@emdash-cms/sandbox-workerd@0.9.7` (patch)  
Source: [#4668](https://github.com/emdash-cms/emdash/pull/4668)

Fixes `ctx.content.delete()` in sandboxed plugins, on Cloudflare and with `@emdash-cms/sandbox-workerd`, so it moves entries to Trash as the admin does. Sites with an `objectCache` no longer keep serving the trashed entry from the cache, and the entry's `updated_at` and `_rev` no longer change.

### Change 5

Applies to: `@emdash-cms/sandbox-workerd@0.9.7` (patch)  
Source: [#4712](https://github.com/emdash-cms/emdash/pull/4712)

Raises the default sandbox subrequest allowance from 10 to 30 per invocation, allowing plugins to make more settings, storage, and HTTP bridge calls before reaching the budget. On Cloudflare, 30 bridge calls is the maximum permitted by the platform's Worker-invocation cap. The Node.js workerd runner uses the same default value but does not enforce subrequest limits.
  
  CPU and wall-time limits are unchanged, and existing explicit `limits.subrequests` overrides still apply. No configuration changes are required.
  
  To retain the previous ceiling, supply a custom runner module through `emdash({ sandboxRunner: ... })`. Its exported `createSandboxRunner` factory must pass `limits: { subrequests: 10 }` in the `SandboxOptions` supplied to `CloudflareSandboxRunner` or `createSandboxRunner` from `@emdash-cms/cloudflare/sandbox`. These are runtime-only APIs; neither `sandbox()` nor `emdash()` accepts a direct `limits` option. See the [custom runner example](https://docs.emdashcms.com/deployment/plugin-sandbox/#custom-resource-limits).

### Change 6

Applies to: `@emdash-cms/sandbox-workerd@0.9.7` (patch)  
Source: [#4358](https://github.com/emdash-cms/emdash/pull/4358)

Fixes config-declared sandboxed plugins, including those running with `sandbox: false`, skipping `plugin:install` and `plugin:activate` on first boot. These hooks now run for plugins without a recorded state, including on the first start after upgrading, so activation hooks can set up recurring tasks without an admin disable/re-enable cycle.
  
  If a sandbox stops before setup finishes, `plugin:install` can run again on the next boot. Make install hooks safe to repeat when settings or plugin data already exist.
  
  `createPluginRuntimeTestHost()` also runs install → activate when creating a host, before test fixtures are added. A failure in the plugin's own lifecycle hook disables it in the test host, so later actions will not invoke its hooks. Tests that explicitly call `actions.plugin.activate()` should account for the initial activation.
  
  #### What should I do?
  
  Make install hooks set only missing values. If a plugin hook failed, fix the hook and re-enable the plugin from the Plugins page to run `plugin:activate` again.

### Change 7

Applies to: `@emdash-cms/sandbox-workerd@0.9.7` (patch)  
Source: [#4665](https://github.com/emdash-cms/emdash/pull/4665)

Fixes sandboxed plugins failing to start when multiple EmDash sites run on the same host. Plugin listeners now use operating-system-assigned ports instead of a fixed port range, with no configuration needed. Failed starts respect restart backoff. Once the retry budget is exhausted, restart the server or install or update a plugin to retry sandboxed plugins. Startup failures report sandbox unavailability to callers while workerd's diagnostics appear in the server log.

### Change 8

Applies to: `@emdash-cms/sandbox-workerd@0.9.7` (patch)  
Source: [#4277](https://github.com/emdash-cms/emdash/pull/4277)

Fixes `ctx.kv` values disappearing when a plugin with the same ID moves between `plugins: []` and `sandboxed: []`. **This storage migration requires a coordinated upgrade; it cannot be deployed as a rolling upgrade.**
  
  Both sandbox runners share the in-process KV store. A database migration copies existing non-`settings:` sandbox values and revisions without overwriting in-process values, warns about conflicting plugin IDs and keys, and retains the original sandbox rows for recovery. Uninstalling a marketplace or registry plugin with data deletion removes its shared KV values and settings; failed-install rollback preserves existing data, including partial writes made by an installation hook before it fails. Plugin-test KV fixtures and inspection use the shared store; use the settings inspection API for `settings:` keys.
  
  #### What should I do?
  
  1. Back up the database.
  2. Stop all application instances and plugin jobs that write to it.
  3. Upgrade `emdash` and your sandbox runner together, then build the site without starting it.
  4. Run `pnpm emdash migrate` against the reviewed database target.
  5. Resolve conflicting KV copies before plugins can write again.
  6. Start or deploy the upgraded site.
  
  Do not rely on default `auto` migrations for this upgrade: they start plugins immediately after migrating, leaving no conflict-review window. Mixed package versions are not automatically rejected. See the [plugin upgrade guide](https://docs.emdashcms.com/plugins/upgrading-sites/#plugin-kv-storage-when-changing-execution-mode) for target selection, recovery queries, and rollback instructions. Downgrading packages alone hides post-upgrade KV writes; restoring the pre-upgrade database backup discards all site changes made since it was taken.

## Agent skills

The updater ran:

```sh
npx --yes skills@1.7.0 add emdash-cms/skills -y
```

Use the refreshed `upgrading-emdash` skill for this work order. If the skills command reported a conflict or failure, resolve that before continuing.

## Core database migrations

Installed EmDash changed from `1.6.0` to `1.6.0`.

No core migrations were added by this upgrade.

Build the upgraded project and inspect the exact database target:

```sh
pnpm build
pnpm exec emdash migrate --status
```

If the status reports pending migrations, stop before starting or deploying the upgraded application. Follow [Backups and recovery](https://docs.emdashcms.com/guides/backups/) to create a restorable recovery point. A JSON backup is not a recovery point. After a human has reviewed the target and backup, apply the pending migrations:

```sh
pnpm exec emdash migrate
```

The command shows the target and asks for confirmation. In a non-interactive shell, add `--expected-target-fingerprint` with the target fingerprint that the status command printed for the reviewed database.

Deploy the same build artifact with the project's deployment workflow, without rebuilding it. On Cloudflare Workers, run `wrangler deploy`.

Verify the deployed database against that artifact:

```sh
pnpm exec emdash migrate --check
```

## Verification

1. Assess every release entry above and make the project changes it requires.
2. Run the project's format, tests, typecheck, and build commands.
3. Inspect the migration target and pending names before applying them.
4. Verify the public site, admin sign-in, content editing, media reads, and encrypted plugin settings after deployment.
