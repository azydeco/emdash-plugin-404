# EmDash upgrade work order

This file is the handoff for upgrading the project at `/home/dan/github/emdash-plugin-404/hosts/web-cloudflare` to the npm `latest` release. The updater resolved the direct packages, changed and installed them where needed, refreshed the project EmDash skills, and compared the installed core migration manifests. It did not edit application code, apply a database migration, or deploy the site.

## Package changes

- `@emdash-cms/cloudflare`: `1.3.1` → `1.6.0` (`1.3.1` → `1.6.0` in the `default` pnpm catalog)
- `emdash`: `1.3.1` → `1.6.0` (`1.3.1` → `1.6.0` in the `default` pnpm catalog)

The updater changed pnpm catalog entries in `pnpm-workspace.yaml`. The new versions apply to every workspace package that uses those catalog entries.

## Release entries to assess

These are the complete authored major, minor, and patch entries crossed by the direct EmDash packages in this project. Changesets dependency-bump entries and attribution wrappers have been removed. Check whether each entry affects code or configuration in this project. Do not adopt an unrelated feature merely because it appears here.

### Change 1

Applies to: `@emdash-cms/cloudflare@1.6.0` (minor), `emdash@1.6.0` (minor)  
Source: [#4911](https://github.com/emdash-cms/emdash/pull/4911)

Caches EmDash image files for one year on sites with a compatible route-cache provider, such as `cacheCloudflare()`. Original files from `/_emdash/api/media/file/` and eligible resized variants from `/_image` share the tag `emdash:media:<storageKey>`. Replacing an image, or deleting one whose stored file is removed, purges that tag. Deletes from the admin media library and media picker, the MCP `media_delete` tool and `ctx.media.delete()` in plugin routes are covered, subject to the [purge limitations](https://docs.emdashcms.com/deployment/route-caching/#media-files).
  
  Astro's `memoryCache()` does not receive automatic media cache entries at any response size; page caching is unaffected. Other providers must preserve distinct source URLs and transform options in their cache keys and support conditional requests. Audio, video, partial responses and original-file URLs with query strings are not stored. Variants are eligible only when their `href` is a plain EmDash media path or that path prefixed with the request's origin, without a nested query or fragment.
  
  Automatic variant caching and query normalization apply only to Astro's stock sharp service on Node and `@astrojs/cloudflare/image-service-workerd` on Cloudflare. With these services, `/_image` URLs for EmDash media redirect with a `301` when their outer query contains unknown or repeated parameters, uses a different parameter order or encodes values differently. This also applies without a cache provider. Stock-service URLs built by `<Image>` and `getImage()` are unaffected. Custom image services retain their existing handling and parameters without these redirects or automatic variant caching.

### Change 2

Applies to: `@emdash-cms/cloudflare@1.6.0` (patch)  
Source: [#4940](https://github.com/emdash-cms/emdash/pull/4940)

Updates `@cloudflare/kumo` to 2.19.0. These packages now require exactly `@cloudflare/kumo@2.19.0`, so sites and plugins that install Kumo themselves should upgrade to that version to match the admin's prebuilt styles. Update `emdash` and the Forms, Field Kit, AI Moderation and AI Search plugins together, since their earlier releases require Kumo 2.15.0.
  
  In the admin, date pickers use Kumo's refreshed day and month buttons, and button labels are vertically centred.
  
  Plugin admin pages built with Kumo may need changes for `Radio.Group` tests, `DatePicker` style overrides and `Dialog` maximum heights. [Upgrade to Kumo 2.19](https://docs.emdashcms.com/plugins/creating-native-plugins/distributing/#upgrade-to-kumo-219) describes each change, and [Match the admin's Kumo version](https://docs.emdashcms.com/plugins/creating-native-plugins/distributing/#match-the-admins-kumo-version) explains how a plugin pins Kumo.

### Change 3

Applies to: `@emdash-cms/cloudflare@1.6.0` (patch), `emdash@1.6.0` (patch)  
Source: [#4968](https://github.com/emdash-cms/emdash/pull/4968)

Fixes media usage tracking missing files linked by their `/_emdash/api/media/file/` URL. **Used in** now includes Portable Text paragraph link marks, HTML block `href` and `src` attributes, and whole string or URL field values, including fields inside blocks and repeaters.
  
  Counts both root-relative URLs and full same-site URLs copied from the Media Library. Full URLs must match the site origin resolved from configuration or environment, the Site URL setting, or the setup URL when neither is set. The Site URL setting is used only for HTTPS or loopback HTTP addresses; for other HTTP sites, configure `siteUrl` instead (or `EMDASH_SITE_URL` on Node.js). External URLs and URLs embedded in plain text are not counted. Deleting media still requires reviewing its references first; usage tracking does not prevent deletion.
  
  Playground sessions now record their setup origin automatically, so full URLs from **Copy URL** are counted without setting Site URL manually.
  
  #### Upgrade action
  
  Existing entries are not re-indexed automatically. After upgrading, run `npx emdash media repair-usage --all` against the upgraded instance (use `--url` to select the site), or save the affected entries again. Alternatives are the `media_usage_repair` MCP tool or `POST /_emdash/api/admin/media-usage/repair`, both with `{ "scope": "all" }`. Until repair completes or the entries are saved again, coverage can still show as complete and a linked file can show **No tracked references found**. See the [upgrade instructions](https://docs.emdashcms.com/deployment/updating/#fixed-media-url-link-usage) for connection options and verification.

### Change 4

Applies to: `@emdash-cms/cloudflare@1.6.0` (patch), `emdash@1.6.0` (minor)  
Source: [#4787](https://github.com/emdash-cms/emdash/pull/4787)

Fixes scheduled entries going live up to a minute after their scheduled time.
  
  On Cloudflare, each Cron Trigger run waits up to 70 seconds for upcoming entries and publishes each one at its scheduled time, so an entry scheduled about a minute or more ahead no longer depends on when the next trigger starts. Waiting uses no CPU time, but while entries are scheduled within that window a scheduled invocation stays open for up to about a minute, so consecutive invocations can overlap in Workers logs and metrics. Sites that use `createScheduledHandler()` from `@emdash-cms/cloudflare/worker` get this automatically.
  
  On Node.js, the scheduler runs the publishing sweep at the start of every minute, so an entry scheduled for a whole minute, as the admin sets it, goes live at that minute. A schedule with seconds, which only the API and MCP can set, can still go live up to a minute late.
  
  A scheduled publish that another scheduler run or an editor has already completed no longer runs `content:beforePublish` hooks, so a hook cannot record a rejection for an entry that is already live.
  
  A custom Worker entry point that calls `runScheduledTasks()` from `emdash/middleware` publishes only entries that are already due. To wait for upcoming entries, pass the new `publishUpcomingWithinMs` option:
  
  ```ts title="src/worker.ts"
  await runScheduledTasks({ publishUpcomingWithinMs: 70 * 1000 });
  ```

### Change 5

Applies to: `@emdash-cms/cloudflare@1.6.0` (patch), `emdash@1.6.0` (patch)  
Source: [#4866](https://github.com/emdash-cms/emdash/pull/4866)

Fixes registry and marketplace plugin routes intermittently returning `404 Plugin route not found` on warm Cloudflare isolates after an install, update, or uninstall. Requests to `/_emdash/api/plugins/*` check for plugin-state changes before checking route permissions, without requiring a redeploy. Only newer generation-tagged snapshots are applied, so replica lag can delay a change but cannot restore older plugin code or permissions.
  
  Plugin route requests return `503 PLUGIN_SYNC_ERROR` if state cannot be read or the requested plugin fails to load. Bundle and sandbox-load failures retry after a five-second backoff, or immediately when the plugin's stored state changes.
  
  On Durable Object SQL deployments, upgrade core and the Cloudflare adapter together so plugin state and its generation are committed atomically.
  
  Durable Object SQL also executes existing atomic batches for content saves, menus, seeding and block-type updates as single primary transactions instead of separate statements.

### Change 6

Applies to: `@emdash-cms/cloudflare@1.5.0` (minor), `emdash@1.5.0` (minor)  
Source: [#4695](https://github.com/emdash-cms/emdash/pull/4695)

Adds real-time co-editing to the admin editor, off by default for now. With `coEditing: true`, in collections with revisions, several people can edit an entry at the same time: each person sees the others' avatars, the field each one is in and their cursors in rich text, concurrent rich-text edits merge, and undo reverts only your own edits. A room for each entry saves everyone's edits together, with the same permissions, validation, hooks and revisions as other saves, and changes from the REST API, MCP, the CLI, the visual editor and plugins appear in open editors.
  
  Without co-editing, opening an entry takes an edit lock, and everyone else can only **Open read-only** or **Take over**. With it on, edit locks apply only in single-editor mode, which the editor uses, for example, in collections without revisions, on hosts that can't run rooms, and in browsers that can't open WebSocket connections. Admin tabs opened before co-editing is turned on keep single-editor mode until they reload. [Edit with other people](https://docs.emdashcms.com/guides/working-with-content/#edit-with-other-people) describes what editors see.
  
  - **Saved** appears once a save holds all of your own edits. After 5 seconds without a connection, the button shows **Offline**: typing continues and merges on reconnect, and **Preview**, publishing and the other operations are disabled until then.
  - Publishing, scheduling, unpublishing, discarding changes, restoring a version and moving to Trash first save everyone's edits, then run.
  - Fields other than rich text keep one of two simultaneous changes, except bylines, reference fields and taxonomy terms, which keep what each person adds and removes. **Turn into**, dragging, deleting, wrapping, joining or indenting a block loses text someone else types inside it at the same moment.
  - Edits that can't merge are saved as a recovery revision.
  
  Public pages run no new queries, with co-editing on or off. Where rooms run, opening an entry adds a join request and a WebSocket connection. A room saves 2 seconds after the latest change, and at least every 10 seconds while people keep typing, however many people edit. Measured on Node.js with an in-memory SQLite database, saving a 2,000-word entry took 2.27 ms of CPU time at the median (3.83 ms at the 95th percentile), about two thirds of it the site's own draft save. Merging a write from outside the editor took 0.80 to 1.19 ms, and a notification with nothing to merge 0.67 ms ([CPU time](https://docs.emdashcms.com/deployment/nodejs/#cpu-time)).
  
  #### What should I do?
  
  Nothing, unless you want co-editing. To turn it on, set the option and rebuild and deploy the site:
  
  ```js
  emdash({
  	coEditing: true,
  });
  ```
  
  On Node.js with `@astrojs/node`, in standalone or middleware mode, co-editing runs in the site's own process and the site starts as before. Check these cases first, which [Co-editing on Node.js](https://docs.emdashcms.com/deployment/nodejs/#co-editing) covers in detail:
  
  - A reverse proxy must forward WebSocket upgrades on `/_emdash/api/content/{collection}/{id}/room`. Otherwise each browser session falls back to single-editor mode after three failed connections, and the server logs a `[co-editing]` warning.
  - Several processes on one database: route each room path to one process, for example by hashing the path, or leave co-editing off.
  - `node:cluster` workers, including PM2's cluster mode, keep single-editor mode.
  - Another WebSocket handler on the same server must leave room paths alone. Replace a `ws` server created with `{ server }`, `express-ws` or `@fastify/websocket` with a `ws` server created with `noServer: true` that handles only your paths, or leave co-editing off.
  - On Node.js 22.16 to 22.20, 23, and 24.0 to 24.8, a server whose only `upgrade` listener is EmDash's answers upgrade requests on other paths, such as `Upgrade: h2c`, with `404`. Node.js 22.21 and later, and 24.9 and later, serve them as before.
  - While rooms are open, EmDash handles `SIGTERM` and `SIGINT` and stops the process up to 5 seconds later. Give process managers a kill timeout over 5 seconds, such as PM2's `kill_timeout`, which defaults to 1.6 seconds.
  
  On Cloudflare, sites created from this release's templates already have the binding and the room exports, so they need only `coEditing: true`. For an existing site, also add the binding and the `exports` entry to `wrangler.jsonc`, as [Co-editing on Cloudflare](https://docs.emdashcms.com/deployment/cloudflare/#co-editing) shows:
  
  ```jsonc
  "durable_objects": { "bindings": [{ "name": "EMDASH_ROOMS", "class_name": "EmDashRoom" }] },
  "exports": { "EmDashRoom": { "type": "durable-object", "storage": "sqlite" } }
  ```
  
  A Worker that uses the `migrations` array, which can't be combined with `exports`, adds `{ "tag": "emdash-rooms", "new_sqlite_classes": ["EmDashRoom"] }` to it instead. Then re-export the room classes from the Worker entry point:
  
  ```ts
  import handler, {
  	createScheduledHandler,
  	EmDashRoom,
  	EmDashRoomSite,
  	PluginBridge,
  } from "@emdash-cms/cloudflare/worker";
  
  export { EmDashRoom, EmDashRoomSite, PluginBridge };
  
  export default {
  	...handler,
  	scheduled: createScheduledHandler(),
  } satisfies ExportedHandler;
  ```
  
  A Worker with its own `fetch` calls `handleRoomUpgrade(request, env)` first and returns its response when it isn't `null`. A site without the binding keeps single-editor mode.
  
  #### Changes for API clients and plugins
  
  These apply only on sites with co-editing on.
  
  - While people co-edit an entry, it has no edit lock: writes that got `409 ENTRY_LOCKED` land and merge into the editor. Writers that send `_rev` can get `409 CONFLICT` more often, because the room saves every few seconds, and MCP publish, unpublish, schedule and discard conflict while the room holds unsaved edits.
  - The lock route's `POST` deletes user locks while a room holds the entry, instead of granting one.
  - A room saves as one user, the actor, but a save can hold several people's edits. A hook that checks the actor's role before accepting content should check everyone in `editedBy`. In a room, `content:beforeSave` hooks get only the fields a save changed, as they do for visual-editor saves.
  - While a room is open, editor-draft requests skip the `baseRevision` check, and the editor refuses a plugin's patch only when a field it changes was edited after the capture.
  
  These apply on every site, with co-editing on or off:
  
  - `PUT /_emdash/api/content/{collection}/{id}` takes an optional `expected` object with the `bylines` and reference selections (`references`, every page of a field) that a change was based on, as a read returned them. `POST /_emdash/api/content/{collection}/{id}/terms/{taxonomy}` takes an optional `expected` list of term ids. When a stored list differs, nothing is written and the request fails with `409 LIST_CONFLICT`: read the entry again, apply the change to the list it holds now, and retry. Requests without `expected` work as before.
  - `POST /_emdash/api/content/{collection}/{id}/room` joins an entry's room. It needs a signed-in session rather than an API token, and answers `{ "mode": "single-editor" }` unless the site runs co-editing.
  - A migration adds the `_emdash_rooms` and `_emdash_room_updates` tables, which hold co-editing rooms. Site transfer never copies them.
  - `GET` and `POST /_emdash/api/content/{collection}/{id}/lock` responses include a `room` field, which is `true` only while a co-editing room holds the entry.

### Change 7

Applies to: `@emdash-cms/cloudflare@1.5.0` (patch)  
Source: [#4555](https://github.com/emdash-cms/emdash/pull/4555)

Fixes Cloudflare Access logins without identity-provider groups, such as one-time PIN logins, failing when `roleMapping` is configured. These logins now receive `defaultRole` (30 if not configured).

### Change 8

Applies to: `@emdash-cms/cloudflare@1.5.0` (patch), `emdash@1.5.0` (patch)  
Source: [#4582](https://github.com/emdash-cms/emdash/pull/4582)

Fixes `@emdash-cms/cloudflare` installing its own copy of `emdash` when the site has a different `emdash` version. The adapter now declares `emdash` as a peer dependency with its exact matching version, so a site always has a single `emdash`.
  
  Keep both packages on the same version and update them together:
  
  ```sh
  npm install emdash@latest @emdash-cms/cloudflare@latest
  ```
  
  A project with mismatched versions now fails `npm install` with an `ERESOLVE` error instead of installing a second copy. pnpm and Yarn print a peer dependency warning, and `astro build` and `astro dev` warn as before.

### Change 9

Applies to: `@emdash-cms/cloudflare@1.5.0` (patch), `emdash@1.5.0` (patch)  
Source: [#4716](https://github.com/emdash-cms/emdash/pull/4716)

Fixes the preview path for Cloudflare Stream videos stuck at `0:00` in the Media Library detail panel. The panel uses Stream's hosted player instead of the browser's native HLS/DASH support. Stream preview URLs ending in `/watch` are converted to the embeddable `/iframe` URL. Media providers can supply an optional `playerUrl` for admin video previews; providers without one keep native video playback.
  
  If you use Astro's content security policy, allow the Stream player host in `frame-src` so the preview can load. EmDash's default admin policy already allows HTTPS frames.

### Change 10

Applies to: `@emdash-cms/cloudflare@1.5.0` (patch)  
Source: [#3115](https://github.com/emdash-cms/emdash/pull/3115)

Fixes `emdash migrate` on D1 failing with no hint about how to select a database. When neither `--d1` nor `--wrangler-config` is given, the error now names both options and the binding the build expects, and says that a Wrangler config in the project root is not read unless it is named.

### Change 11

Applies to: `@emdash-cms/cloudflare@1.5.0` (patch)  
Source: [#4308](https://github.com/emdash-cms/emdash/pull/4308)

Updates `@cloudflare/kumo` to 2.15.0. These packages now require exactly `@cloudflare/kumo@2.15.0`, so sites and plugins that install Kumo themselves should upgrade to that version to match the admin's prebuilt styles. Update `emdash` and the Forms, Field Kit, AI Moderation and AI Search plugins together: their earlier releases require Kumo 2.6.0, and these plugin releases need an `emdash` release with this change. Updating only one side leaves Kumo 2.15 next to an admin built for 2.6.
  
  In the admin, Select menus now open below their field instead of over it, and text sized `text-base` or `text-lg` has a taller line (1.5), so labels and headings take slightly more height. Kumo's `DropdownMenu` now spaces item icons itself, so plugin admin pages should remove any margin classes such as `me-2` from the elements they pass as an item's `icon`.

### Change 12

Applies to: `@emdash-cms/cloudflare@1.5.0` (patch), `emdash@1.5.0` (patch)  
Source: [#4668](https://github.com/emdash-cms/emdash/pull/4668)

Fixes `ctx.content.delete()` in sandboxed plugins, on Cloudflare and with `@emdash-cms/sandbox-workerd`, so it moves entries to Trash as the admin does. Sites with an `objectCache` no longer keep serving the trashed entry from the cache, and the entry's `updated_at` and `_rev` no longer change.

### Change 13

Applies to: `@emdash-cms/cloudflare@1.5.0` (patch)  
Source: [#4712](https://github.com/emdash-cms/emdash/pull/4712)

Raises the default sandbox subrequest allowance from 10 to 30 per invocation, allowing plugins to make more settings, storage, and HTTP bridge calls before reaching the budget. On Cloudflare, 30 bridge calls is the maximum permitted by the platform's Worker-invocation cap. The Node.js workerd runner uses the same default value but does not enforce subrequest limits.
  
  CPU and wall-time limits are unchanged, and existing explicit `limits.subrequests` overrides still apply. No configuration changes are required.
  
  To retain the previous ceiling, supply a custom runner module through `emdash({ sandboxRunner: ... })`. Its exported `createSandboxRunner` factory must pass `limits: { subrequests: 10 }` in the `SandboxOptions` supplied to `CloudflareSandboxRunner` or `createSandboxRunner` from `@emdash-cms/cloudflare/sandbox`. These are runtime-only APIs; neither `sandbox()` nor `emdash()` accepts a direct `limits` option. See the [custom runner example](https://docs.emdashcms.com/deployment/plugin-sandbox/#custom-resource-limits).

### Change 14

Applies to: `@emdash-cms/cloudflare@1.5.0` (patch), `emdash@1.5.0` (patch)  
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

### Change 15

Applies to: `@emdash-cms/cloudflare@1.4.0` (patch)  
Source: [#4186](https://github.com/emdash-cms/emdash/pull/4186)

Fixes the Cloudflare image endpoint (`/_image` for EmDash media URLs) holding the R2 object read open after it answers with `304 Not Modified`, answers a `HEAD` request for a file it serves without transforming, or fails to transform an image.

### Change 16

Applies to: `@emdash-cms/cloudflare@1.4.0` (patch)  
Source: [#4281](https://github.com/emdash-cms/emdash/pull/4281)

Fixes sandboxed plugins with the `email:send` capability being unable to send mail on Cloudflare Workers. `ctx.email.send()` could reject with "Email is not configured" even though a host email provider was configured and the host's own emails were delivered.

### Change 17

Applies to: `@emdash-cms/cloudflare@1.4.0` (patch)  
Source: [#4278](https://github.com/emdash-cms/emdash/pull/4278)

Fixes `sandbox()` turning off sandboxed plugins in projects that have a `cloudflare.config.ts` (the config file used by `@astrojs/cloudflare` 15). When that file exists in the project root, `sandbox()` now selects the Worker Loader runner without reading any Wrangler config and without requiring `wrangler` to be installed. Add the binding with `LOADER: bindings.workerLoader()` under `worker.env`. If it is missing, EmDash logs a warning when the Worker starts instead of during the build.

### Change 18

Applies to: `@emdash-cms/cloudflare@1.4.0` (patch), `emdash@1.4.0` (patch)  
Source: [#4394](https://github.com/emdash-cms/emdash/pull/4394)

Fixes sandboxed plugin `ctx.taxonomies` mutations (`createTerm()`, `addEntryTerms()`, and `removeEntryTerms()`), `ctx.content.create()`, versioned content actions (`getVersioned()`, `publish()`, `unpublish()`, `schedule()`, `unschedule()`, `getTrashedVersioned()`, and `restore()`), and `ctx.comments.setStatus()` on Cloudflare when requests run across multiple Worker isolates. Content creation consistently uses runtime validation and hooks and preserves `translationOf` links instead of falling back to a plain database insert.
  
  Runner-created invocations without a content-create callback now receive `Content creation is not configured` rather than a database insert that bypasses runtime behavior. `createPluginTestHost()` supplies a database-backed callback with content-handler validation so transport-level tests can continue creating content and linked translations without starting the full EmDash runtime. It preserves the transport host's support for `data.slug` and `data.status`.
  
  Await these operation promises before returning from a plugin route or hook. Their RPC connection now lasts only for that invocation; unlike the previous loopback binding, it cannot support work that outlives the invocation.
  
  Publication after-hooks remain deferred. Same-entry actions attempted while an after-hook is running can return `CONTENT_ACTION_REENTRANT`; faster callback routing can expose this overlap in tests that assumed hooks had already finished. In runtime-host tests, call `await host.waitForDeferredTasks()` after an action before inspecting its after-hook effects or starting another action on the same entry. This method waits for queued deferred runtime work, including work those tasks enqueue; it does not run future scheduled tasks or wait for arbitrary unawaited plugin operations.

### Change 19

Applies to: `emdash@1.6.0` (minor)  
Source: [#4626](https://github.com/emdash-cms/emdash/pull/4626)

Adds draft access for trusted content editor panels. A native plugin's panel receives `editorDraft` beside `entry`. `editorDraft.get()` reads the values open in the editor, including unsaved changes: the field values, the slug, and the SEO title and meta description, with their definitions and a revision. `editorDraft.patch(operations, { expectedRevision })` sets or clears them in the form without saving the entry. The editor refuses the patch when any of those values changed after the revision was read. A translation or excerpt panel can therefore read the current draft and put its results back for the user to review, without overwriting edits made while it worked. The SEO panel saves patched SEO values the way it saves typed ones, so they take effect at once. `editorDraft` is `undefined` on older versions. The React admin extensions guide covers the rules and has an example.
  
  Draft patches from sandboxed editor panels and actions (`admin.editor-draft:patch`) change too:
  
  - A patched rich text field shows the patched document. Before, it kept showing the old document, and the next keystroke there wrote the old document back over the patch.
  - In collections with revisions, the first save that includes a patch keeps the draft revision it replaces, autosaves included, so the values from before the patch can be restored. With collaborative editing on, the room's saves don't keep it.
  - A sandboxed patch with rich text that the editor can't load is refused with the "Plugin changes were not applied" message, and the form is left unchanged.
  - The "Plugin changes were not applied" message shows as a toast. Before, it was a banner that stayed above the fields after the user moved on.
  
  Field descriptors in the admin manifest include the field's schema `type`, which tells apart types that share an editor `kind`, such as `slug` and `string`.

### Change 20

Applies to: `emdash@1.6.0` (patch)  
Source: [#4970](https://github.com/emdash-cms/emdash/pull/4970)

Fixes object-cache page-render failures on Cloudflare Workers after a request is cancelled. Deferred work now uses Workers' lifetime extender even with injected or vendored Astro adapters, such as Alchemy, and shared cache operations that reject after their owning request ends use their existing non-fatal fallbacks instead of failing the render. Node deployments keep the existing fire-and-forget behavior.

### Change 21

Applies to: `emdash@1.6.0` (patch)  
Source: [#4760](https://github.com/emdash-cms/emdash/pull/4760)

Reduces D1 rows read by search and autocomplete on cold Workers isolates by skipping full row-count verification of existing search indexes. Missing indexes and indexes left empty by an interrupted rebuild are still repaired automatically. Partially populated indexes are no longer detected automatically; to repair one, send a `POST /_emdash/api/search/rebuild` request as an Admin (`search:manage` permission), with `X-EmDash-Request: 1` and a JSON body such as `{"collection":"articles"}`. Bearer tokens also require the `admin` scope. See [search index recovery](https://docs.emdashcms.com/reference/rest-api/#search-index-recovery) for the complete request and verification steps.

### Change 22

Applies to: `emdash@1.6.0` (patch)  
Source: [#4999](https://github.com/emdash-cms/emdash/pull/4999)

Stops the first request to a fresh isolate or process from writing to the database to release stale plugin cron locks. Scheduled maintenance (the Cloudflare Cron Trigger or the Node scheduler) still releases them on every run, so cold anonymous page views on D1 no longer go to the primary for this write.

### Change 23

Applies to: `emdash@1.6.0` (patch)  
Source: [#4994](https://github.com/emdash-cms/emdash/pull/4994)

Fixes cached detail-page 404s staying stale after the missing entry is published. `getEmDashEntry` now returns the collection tag in `cacheHint` when no entry is found, so publishing the entry purges the cached 404. An entry found in the requested locale keeps only its own id and reference tags. An entry served from a fallback locale, or stored under a legacy locale code such as `en-US`, also carries the collection tag. On a site whose page passes no other cache hint, this can make a 404 cacheable for up to 60 seconds even without a route rule. To keep misses uncached, see [Error responses](https://docs.emdashcms.com/deployment/route-caching/#error-responses).
  
  #### Upgrading
  
  Pass the `getEmDashEntry` hint to `Astro.cache.set()` before rewriting to `/404`, as the templates now do, so the cached 404 is purged when the entry is published.

### Change 24

Applies to: `emdash@1.6.0` (patch)  
Source: [#4935](https://github.com/emdash-cms/emdash/pull/4935)

Fixes external authentication, such as Cloudflare Access, saving a role level that EmDash doesn't define (anything other than 10, 20, 30, 40 or 50) to the user record. Such a record made every later sign-in by that user fail. EmDash now refuses a sign-in with an undefined role level and leaves the user record unchanged.
  
  A user record that already holds an undefined role level is not repaired automatically: that user still can't sign in after upgrading. Correct the provider's role mapping, then set the user's `role` column in the `users` table to one of the defined levels.

### Change 25

Applies to: `emdash@1.6.0` (patch)  
Source: [#4864](https://github.com/emdash-cms/emdash/pull/4864)

Fixes allowed-domain self-signup failing with "Setup already complete" when creating a passkey on a site that has finished setup.

### Change 26

Applies to: `emdash@1.6.0` (patch)  
Source: [#4967](https://github.com/emdash-cms/emdash/pull/4967)

Fixes published Portable Text code blocks so keyboard users can focus and scroll them horizontally, with a visible focus indicator and an accessible name based on the filename or language.

### Change 27

Applies to: `emdash@1.6.0` (patch)  
Source: [#4935](https://github.com/emdash-cms/emdash/pull/4935)

Fixes the Node image endpoint returning a 500 for EmDash media that Astro's image service can't optimize. The endpoint now passes Astro's logger to the image service, so the service logs its warning and serves the original image.

### Change 28

Applies to: `emdash@1.6.0` (patch)  
Source: [#4947](https://github.com/emdash-cms/emdash/pull/4947)

Fixes searches in the admin Media Library and media picker failing on Cloudflare D1 for long search terms, including multibyte text, and fixes the same limit in folder search. Media search also matches storage keys and media IDs, and accepts pasted media file URLs. Short terms may return more results because they can match keys and IDs as well as filenames.

### Change 29

Applies to: `emdash@1.6.0` (patch)  
Source: [#4935](https://github.com/emdash-cms/emdash/pull/4935)

Corrects the types of the `Astro.locals.emdash` handlers to match what they return and accept.
  
  - A handler result now narrows on `success`, so `result.data` is typed after an `if (result.success)` check. `result.data?.…` and `result.error?.…` still work without narrowing.
  - `handleContentGet` and `handleRevisionGet` type the standard properties of `item`, such as `status`, `data`, and `createdAt`. Other properties still read as `unknown`. Code that deletes a required property, such as `delete item.draftRevisionId`, or assigns an `unknown` value to `item.data` no longer type-checks. Use destructuring to drop a property (`const { draftRevisionId, ...rest } = item`), or cast `item` to `Record<string, unknown>` first.
  - `handleMediaList`, `handleMediaGet`, `handleMediaCreate`, `handleMediaUpdate`, and `handleCommentModerate` describe their result data.
  - `handleMediaUpload` requires `base64` and `contentType` and no longer lists a `url` option, which it never supported.

### Change 30

Applies to: `emdash@1.6.0` (patch)  
Source: [#4194](https://github.com/emdash-cms/emdash/pull/4194)

Fixes `search()` ranking so full-title phrase matches and titles matching every query term appear before body-only matches, even in small collections or on short result pages. Within title-term matches, shorter titles rank before higher scores.
  
  `search()` scores are now normalized to 0–1 within each collection instead of returning raw BM25 magnitudes, including searches restricted to one collection. Title-match tiers take precedence over scores. Preserve the returned result order and review any custom score thresholds when upgrading. `searchCollection()` keeps its raw scores and score-based ordering.

### Change 31

Applies to: `emdash@1.6.0` (patch)  
Source: [#4238](https://github.com/emdash-cms/emdash/pull/4238)

Fixes literal heading and list markers, such as `# Title` and `1. item`, turning into Markdown blocks when rich text is read and written back through the CLI, MCP content tools, `EmDashClient` or `portableTextToMarkdown` from `emdash/client`. Markdown output now escapes these markers at the start of paragraph lines, including lines after a hard break, and escapes setext underlines such as `---` and `===` and table delimiter rows such as `| --- | --- |`.

### Change 32

Applies to: `emdash@1.6.0` (patch)  
Source: [#5010](https://github.com/emdash-cms/emdash/pull/5010)

Improves search and autocomplete latency across multiple collections on D1 when query coalescing is enabled. Reduces first-search index health checks to a small number of database round trips while preserving automatic repair of missing or empty indexes.

### Change 33

Applies to: `emdash@1.6.0` (patch)  
Source: [#4840](https://github.com/emdash-cms/emdash/pull/4840)

Fixes duplicate layout queries when anonymous public pages call `Astro.rewrite()`, such as rewriting an unknown slug to `/404`. The rewritten page reuses the original request's cached reads and prefetched layout data. Previews, edit mode, and requests carrying session cookies or authorization headers continue to use fresh request contexts.

### Change 34

Applies to: `emdash@1.6.0` (patch)  
Source: [#4910](https://github.com/emdash-cms/emdash/pull/4910)

Fixes `<Comments>` dates to use the site's Timezone setting instead of the server's timezone, including dates on threaded replies. Missing or invalid timezone settings use UTC, including on Node.js servers configured with a different local timezone. Set the site's Timezone to keep dates in your preferred timezone.

### Change 35

Applies to: `emdash@1.6.0` (patch)  
Source: [#4871](https://github.com/emdash-cms/emdash/pull/4871)

Fixes visual editing creating an unwanted draft when clicking into an unchanged Portable Text field that ends in a list, image, heading, blockquote, HTML block, or plugin block, then leaving the field or page.

### Change 36

Applies to: `emdash@1.6.0` (patch)  
Source: [#4960](https://github.com/emdash-cms/emdash/pull/4960)

Fixes concurrent content saves failing with hung-request errors on Cloudflare Workers when updating media usage. Later saves can also recover if an earlier request was cancelled while holding a media-usage lock, rather than leaving writes to the collection stuck until the isolate restarts. A save may wait up to a minute before reclaiming an abandoned lock.

### Change 37

Applies to: `emdash@1.6.0` (patch)  
Source: [#4857](https://github.com/emdash-cms/emdash/pull/4857)

Fixes layout prefetching on anonymous multilingual Astro pages to load menus and taxonomy terms in the page's locale, avoiding duplicate reads when layouts request that locale explicitly. Sites with a single configured locale, or no i18n configuration, keep their existing prefetch behavior.
  
  On non-default-locale pages, implicit `getMenu()` and `getTaxonomyTerms()` calls still return default-locale data, but now load it separately from the page-locale prefetch. This increases reads for implicit-locale layouts and EmDash's built-in menu widgets on translated pages, including pages whose other navigation already passes an explicit locale. Menu widgets retain their default-locale output; this patch does not change which content they render. Layouts intended to render translated navigation should pass `{ locale: Astro.currentLocale }` to these helpers to reuse the prefetched data.

### Change 38

Applies to: `emdash@1.6.0` (patch)  
Source: [#4890](https://github.com/emdash-cms/emdash/pull/4890)

Fixes built-in search endpoints on PostgreSQL, including Hyperdrive, so they report `503 SEARCH_UNAVAILABLE` instead of returning generic errors or misleading empty results. PostgreSQL search is still unavailable; use a SQLite-family database with FTS5 for built-in full-text search. The editor's link picker explains that content search is unavailable and suggests pasting a URL, without retrying the unsupported search or blaming the network connection.

### Change 39

Applies to: `emdash@1.6.0` (patch)  
Source: [#4837](https://github.com/emdash-cms/emdash/pull/4837)

Fixes two Astro warnings on static sites: the `Astro.request.headers` warning on prerendered pages and the `cache.set()` warning on 404s when no route cache provider is configured.

### Change 40

Applies to: `emdash@1.6.0` (patch)  
Source: [#4805](https://github.com/emdash-cms/emdash/pull/4805)

Fixes the Users page showing “Last Login: Never” after magic-link, OAuth (including AT Protocol), or external-provider sign-in. Successful sign-ins now record a login time independently of passkeys, while existing passkey login history remains visible. Previously unrecorded logins appear after the next sign-in; refreshing an existing session does not record a new login.
  
  EmDash migrates the database automatically. Existing standalone Kysely auth-adapter databases continue to report passkey history without requiring a schema change.

### Change 41

Applies to: `emdash@1.6.0` (patch)  
Source: [#4812](https://github.com/emdash-cms/emdash/pull/4812)

Prevents SQLite from creating a blank database when the main file is missing but its `-wal` or `-shm` file remains, protecting committed content still in the write-ahead log. EmDash refuses the open and logs an error without changing these files. Stop the server and restore the original main file before restarting. This cannot recover data already overwritten by an earlier startup.
  
  To intentionally discard all local SQLite data and start fresh, stop all processes using the database and delete `data.db`, `data.db-wal`, and `data.db-shm` (substitute your configured database path). Reset scripts that delete only `data.db` must also remove its sidecars.

### Change 42

Applies to: `emdash@1.6.0` (patch)  
Source: [#4992](https://github.com/emdash-cms/emdash/pull/4992)

Allows content-miss 404s on public page routes with active cache options to be served from the cache for up to 60 seconds, instead of rendering on every request. With a route-cache provider configured, a tags-only hint from the 404 page or its layout can activate this behavior even without a route rule. Shorter lifetimes and explicit cache opt-outs are preserved, and stale-while-revalidate is disabled for these responses.
  
  Keep the collection or taxonomy tag on the route rule so publishing the missing entry or saving the missing term purges its cached 404. Previously these responses were never cached. Sites whose rules lack the matching tag can now serve a stale 404 until its short lifetime expires; a failed purge has the same effect. Shipped template layouts supply settings and menu hints, not the missing content's collection or taxonomy tag, so their misses can remain cached after publication until this lifetime expires. To restore uncached misses, call `Astro.cache.set(false)` in the 404 page's frontmatter (or the miss branch for a directly returned 404), and skip any later layout calls that re-enable caching.
  
  Cached 404 hits no longer reach the origin, so the admin's 404 hit counts exclude those requests. URLs that match no Astro route, internal paths, and paths ending in a file extension are unchanged.

### Change 43

Applies to: `emdash@1.6.0` (patch)  
Source: [#4926](https://github.com/emdash-cms/emdash/pull/4926)

Fixes repeated `getEmDashEntry()` calls with the same arguments issuing duplicate database reads within a request, so layouts and blocks can share a singleton entry read. As with `getEmDashCollection()`, identical calls in one request now share the same result object, so copy entry data before modifying it.

### Change 44

Applies to: `emdash@1.6.0` (patch)  
Source: [#4868](https://github.com/emdash-cms/emdash/pull/4868)

Fixes media replacements in the admin not triggering `media:afterUpload`, so upload plugins can process replaced files and send audit-log and webhook notifications.

### Change 45

Applies to: `emdash@1.6.0` (patch)  
Source: [#4965](https://github.com/emdash-cms/emdash/pull/4965)

Fixes `EmDashClient` errors losing plain-text response bodies from runtimes and proxies. Non-JSON error messages now include the first 500 characters of the trimmed body, falling back to the HTTP status text or status code when the body is empty or unreadable.

### Change 46

Applies to: `emdash@1.6.0` (patch)  
Source: [#4964](https://github.com/emdash-cms/emdash/pull/4964)

Fixes exact redirect rules for paths with file extensions, such as `/old/report.pdf`, being saved but never applied. A file request also matches an exact rule saved with a trailing slash. Only exact rules apply to file requests; named and catch-all patterns do not redirect them. File requests are not recorded in the 404 log.

### Change 47

Applies to: `emdash@1.6.0` (patch)  
Source: [#4972](https://github.com/emdash-cms/emdash/pull/4972)

Fixes PostgreSQL detection during `astro dev` with Cloudflare Hyperdrive, so plugin storage queries and index creation no longer fail with `function json_extract(text, unknown) does not exist` when Vite loads separate copies of Kysely.

### Change 48

Applies to: `emdash@1.6.0` (patch)  
Source: [#4929](https://github.com/emdash-cms/emdash/pull/4929)

Fixes image sub-fields in repeaters ignoring `validation.allowedMimeTypes` in the media picker and during upload, including repeaters inside block types. Configure the image sub-field through a seed, the schema API, or code to opt into formats such as SVG without changing the global upload allowlist. Editing a repeater in Content Types preserves its configured sub-field allowlists.

### Change 49

Applies to: `emdash@1.6.0` (patch)  
Source: [#4976](https://github.com/emdash-cms/emdash/pull/4976)

Fixes sitemap `lastmod` dates staying unchanged after live SEO metadata edits, including SEO title changes. Sitemap entries and the sitemap index now use the later content or SEO modification date. Saving unchanged SEO settings does not advance the date.

### Change 50

Applies to: `emdash@1.5.0` (minor)  
Source: [#4628](https://github.com/emdash-cms/emdash/pull/4628)

Adds **Settings > Sidebars**, where each admin user hides and reorders entries in the admin navigation and sections in the content editor's settings sidebar. Every role can open it from the user menu. The layout is saved to the user's account, so it follows them to every browser, and it changes nobody else's sidebars.
  
  - Navigation entries move within their group or folder. Dashboard always stays first and visible. `admin.hiddenNavItems` still hides entries for everyone, and those entries don't appear on the page.
  - The editor sidebar order applies to every collection and to new entries. Publish can move but can't be hidden.
  - Reset restores a list's default and offers Undo.
  
  The editor settings sidebar no longer shows a drag handle on each section. A **Customize sidebar** link after the last section opens the new page, and a pencil at the bottom of the navigation does too. Section orders that the drag handles saved in a browser are not carried over, so every user starts from the default order.
  
  `GET /_emdash/api/auth/me` returns the stored layout as `adminLayout`, or `null`. `POST /_emdash/api/auth/me` accepts `{ "action": "setAdminLayout", "adminLayout": { ... } }` to replace it, or `"adminLayout": null` to remove it. A layout is limited to 200 IDs per list and 16 KB.
  
  Browser tests that used the editor sections' "Drag to reorder …" buttons need to change, because those buttons no longer exist. Byline reorder handles are unchanged.

### Change 51

Applies to: `emdash@1.5.0` (minor)  
Source: [#4641](https://github.com/emdash-cms/emdash/pull/4641)

Adds type checking for `emdash()` options in `astro.config.mjs`. A value of the wrong type, such as `mcp: "yes"`, `maxUploadSize: "10MB"` or `toolbar: "always"`, now stops `astro dev`, `astro build` and `astro sync` with one error that lists each invalid option by its path, for example `→ at mcp`. Before, these values loaded without an error and failed later or were silently ignored. Adapter, plugin and provider descriptors are checked only for their outer shape, and `registry`, `migrations`, `middleware`, `admin.locales` and `admin.hiddenNavItems` keep their existing errors.
  
  An unrecognized top-level option still loads, but EmDash now logs a warning. When the name is close to a known option, the warning suggests it, so `sitUrl` points to `siteUrl`.
  
  #### What should I do?
  
  If the config fails to load after upgrading, fix each option named in the error, for example change `mcp: "true"` to `mcp: true`. The check can't be turned off. Configurations that match the documented option types are not affected.

### Change 52

Applies to: `emdash@1.5.0` (minor)  
Source: [#4730](https://github.com/emdash-cms/emdash/pull/4730)

Adds support for `publishedAt`, `createdAt`, and `updatedAt` as a collection's `dateField`, so editors can see and sort by publication dates without duplicating system timestamps in a custom field. Choose **Date column source** in the existing content type's settings, or set `dateField` through the collection update API or a seed file.
  
  Collections without a configured `dateField` still show and sort by last-updated. Entries with a missing or invalid configured date display their last-updated date, while sorting uses the configured source.

### Change 53

Applies to: `emdash@1.5.0` (minor)  
Source: [#3307](https://github.com/emdash-cms/emdash/pull/3307)

Adds a `formats` prop to the `Image` component from `emdash/ui`, so sites can serve modern image formats with a fallback.
  
  List the formats in order of preference. With more than one entry, the component renders a `<picture>` element: the earlier entries become `<source>` elements and the last entry becomes the fallback `<img>`. Without `fallbackFormat`, a single entry renders one `<img>` in that format.
  
  ```astro
  <Image image={post.data.featured_image} width={1200} height={675} formats={["avif", "webp"]} />
  ```
  
  The optional `fallbackFormat` prop sets the format of the `<img>` and keeps every `formats` entry as a `<source>`. The `quality` prop applies to every format the component renders. `formats` only applies to images optimized by the site's image service; images from external media providers keep the provider's own URLs. Without `formats`, the output is unchanged.

### Change 54

Applies to: `emdash@1.5.0` (minor)  
Source: [#4213](https://github.com/emdash-cms/emdash/pull/4213)

Reduces CPU usage during image upload confirmation by generating placeholders from small browser thumbnails instead of decoding full-resolution originals. For browser-decodable images, the admin now sends thumbnails fitting a 64-pixel box with both signed and direct uploads, and the visual-editing toolbar sends one with every direct upload. This also enables blurhash and dominant-color placeholders for browser-decodable formats such as WebP and AVIF, which previously had none. New uploads and imports no longer generate placeholders for transparent images, including PNGs, so placeholder backgrounds do not show through transparent areas. Existing media keeps its stored placeholders. Image dimensions, upload validation, content hashing, and responsive image variants remain unchanged.
  
  Adds the `imagePlaceholders` configuration option, defaulting to `true` on every runtime, including Cloudflare Workers. This is one site-wide switch for every upload and import: setting it to `false` skips all blurhash and dominant-color generation, including from client thumbnails. WordPress imports, MCP uploads, plugin uploads, and custom clients without thumbnails still decode originals when placeholders are enabled, so sites with constrained CPU budgets may choose to turn this switch off.
  
  Custom clients can send an optional `{ thumbnail: { contentType, data } }` in `POST /_emdash/api/media/{id}/confirm`. Confirm thumbnails accept JPEG or PNG, at most 32,768 base64 characters and 4,096 decoded pixels. Unusable thumbnails omit the placeholder rather than falling back to decoding the original. Thumbnails also work when originals exceed the 8 MiB download cap; supply the original `width` and `height` to record dimensions in that case.

### Change 55

Applies to: `emdash@1.5.0` (minor)  
Source: [#4728](https://github.com/emdash-cms/emdash/pull/4728)

Adds `$media.file` to seed files so local images can be imported without serving them over HTTP or disabling URL SSRF protection. Use `{ "$media": { "file": "assets/photo.jpg" } }` with an image next to the seed at `assets/photo.jpg`.
  
  The CLI and Astro setup resolve files relative to the selected seed file's directory. Programmatic callers must supply `mediaBasePath` and a storage adapter. Supply exactly one non-null `url` or `file`; null values are treated as absent, and references that supply both sources are skipped. File paths must stay within that directory, including symlink targets. Local files require a Node.js filesystem at seed-apply time and are not bundled for deployment; Astro setup requires the seed directory at its build-time path. `skipMediaDownload` skips local files rather than creating external URLs for them.

### Change 56

Applies to: `emdash@1.5.0` (minor)  
Source: [#4729](https://github.com/emdash-cms/emdash/pull/4729)

Adds the `no-scheduling` collection support flag to disable creating or changing schedules in the content editor, calendar, and scheduling API. Scheduling remains enabled by default, and existing schedules continue to run and can be removed.
  
  To disable scheduling, add `no-scheduling` to the collection's `supports` in a seed file, or update an existing collection through `PUT /_emdash/api/schema/collections/{slug}` or the `schema_update_collection` MCP tool. For example, a collection with drafts and revisions can use:
  
  ```json
  { "supports": ["drafts", "revisions", "no-scheduling"] }
  ```
  
  Preserve the collection's other support values when updating its list. There is no Content Type editor checkbox for this flag, but saving in that editor preserves it.
  
  If you previously omitted `scheduling` expecting scheduling to be disabled, add `no-scheduling` instead. The legacy `scheduling` value is deprecated and has no effect; it remains accepted for compatibility and can be removed from seed files. If both values are present, `no-scheduling` takes precedence. Sites that want to keep scheduling enabled do not need to change anything.
  
  WordPress imports into a collection with `no-scheduling` keep future-dated posts as drafts and report a scheduling error for each such post.

### Change 57

Applies to: `emdash@1.5.0` (minor)  
Source: [#4668](https://github.com/emdash-cms/emdash/pull/4668)

Adds recovery revisions, which keep a copy of an editor's unsaved fields in an entry's revision history without changing the entry. Save one with `POST /_emdash/api/content/{collection}/{id}/revisions` and a body of `{ "data": { ... }, "slug": "..." }`, where `slug` may be `null`.
  
  - The route needs a signed-in session, not an API token, and edit access to the entry. It works for entries in Trash, accepts up to 1.9 MB of fields, and responds with the new revision's `id`.
  - The revision is stored as sent, without field validation or `content:beforeSave`, and changes neither the draft nor the published version. Restoring it saves its fields and slug as an edit by the restoring user, so validation and `content:beforeSave` run then.
  - Site export leaves recovery revisions out.

### Change 58

Applies to: `emdash@1.5.0` (minor)  
Source: [#4637](https://github.com/emdash-cms/emdash/pull/4637)

Fixes autosave deleting versions saved with **Save**, and names everyone who edited each version in revision history.
  
  - An autosave replaces the previous version only when that version is also an autosave. A version saved with **Save**, or one EmDash creates itself, such as the draft copy an unpublish leaves, stays in **Revisions**.
  - Each version names everyone who edited it since the version before it, such as "Ana, Ben, and 1 other person", and marks its changes in a neutral color when several people edited it. The publish confirmation names everyone who edited the entry since the published version.
  - `GET /_emdash/api/content/{collection}/{id}/revisions` and the MCP `revision_list` tool return `editedBy` on each version: the people who edited it, latest first, as `{ id, name }`, with `null` for an account that no longer exists. `null` means the version names only its `author`.
  - `GET /_emdash/api/content/{collection}/{id}/revisions/editors?since={revisionId}` returns everyone who edited the entry in the versions newer than `since`, newest first and once each, in the same shape. Without `since`, it returns everyone who edited the entry. It requires `content:read_drafts`.
  - `content:beforeSave` and `content:afterSave` events include `editedBy`, the IDs of the users whose edits the save holds, latest first. A save with an `actor` lists only that user. A hook that checks the actor's role before accepting content should check everyone in `editedBy`.
  
  A migration adds two nullable columns, `kind` and `edited_by`, to the `revisions` table. Existing versions are not backfilled: they name only their author, and autosave never replaces them. Site transfer leaves both columns out, so transferred versions also name only their author. Once a site has run the migration, earlier EmDash versions can't export it or import into it with site transfer.

### Change 59

Applies to: `emdash@1.5.0` (minor)  
Source: [#3716](https://github.com/emdash-cms/emdash/pull/3716)

Adds a staging mode that keeps a site out of search engines until it goes live. Sites created through setup, whether in the setup wizard or by a script that calls the setup API, start in staging:
  
  - Pages that render `<EmDashHead>` get a `noindex, nofollow` robots tag, which overrides SEO panel and plugin robots values. Templates without `<EmDashHead>` don't get the tag.
  - `/robots.txt` keeps its usual content so crawlers can read the tag, and isn't cached while the site is in staging.
  - The admin header shows a **Staging** badge.
  
  To go live, an administrator selects **Go live** in **Settings > General > Site Status**, sends `{ "staging": false }` to the settings API, or uses the MCP `settings_update` tool. **Switch back to staging** hides the site again. Staging is visibility only: visitors can still open every page.
  
  Existing sites are not affected: a site without the setting is live. Site transfer and `emdash export-seed` don't copy the staging status.

### Change 60

Applies to: `emdash@1.5.0` (minor)  
Source: [#2156](https://github.com/emdash-cms/emdash/pull/2156)

Adds a built-in SMTP email provider. It delivers through any standard SMTP server, such as Brevo, Office 365, Fastmail, Amazon SES or a self-hosted Postfix, on Node and on Cloudflare Workers with the `nodejs_compat` flag.
  
  #### Configure
  
  Choose **SMTP** under Settings → Email, or set environment variables:
  
  - Required: `EMAIL_SMTP_HOST`, `EMAIL_SMTP_USER` and `EMAIL_SMTP_PASS`.
  - Optional: `EMAIL_SMTP_PORT` (587 when empty), `EMAIL_SMTP_SECURE`, `EMAIL_SMTP_FROM`, `EMAIL_SMTP_FROM_NAME`, `EMAIL_SMTP_FROM_EMAIL` and `EMAIL_SMTP_REPLY_TO`.
  
  Without a sender address, the username is used as the sender, so the admin requires a sender email when the username is not an email address (for example an Amazon SES or SendGrid key). Settings saved in the admin take precedence over environment variables and apply without a restart. Saving them requires `EMDASH_ENCRYPTION_KEY`, which encrypts the password in the database. Changing the host or username requires entering the password again.
  
  Port 465 uses implicit TLS and port 587 uses STARTTLS. The provider verifies the server certificate, never signs in before TLS is established, and signs in with `AUTH PLAIN` or `AUTH LOGIN`, whichever the server offers. Port 25 is refused. Invalid environment variables are ignored with a warning in the server log.
  
  #### Provider selection
  
  Settings → Email now has a provider dropdown that lists SMTP and any installed email plugins. When its environment variables are set, SMTP delivers email unless an email plugin is active or another provider is selected. Without them, SMTP is used only after you select it. A site with a single email plugin still selects that plugin automatically. In `astro dev`, the console provider is used only when no other email provider is active, and that choice is no longer saved to the database.
  
  **Send test email** now shows the SMTP server's error, for example a rejected login, instead of a generic failure.
  
  #### API
  
  `GET /_emdash/api/settings/email` also reports the SMTP settings, without the password. The new `PUT /_emdash/api/settings/email` saves SMTP settings together with the selected provider, or selects a plugin provider. `PUT` with `{ "provider": "smtp" }` and no settings selects SMTP from its saved settings or environment variables. Sending a test email with `POST /_emdash/api/settings/email` returns SMTP delivery errors with status 502.

### Change 61

Applies to: `emdash@1.5.0` (patch)  
Source: [#3066](https://github.com/emdash-cms/emdash/pull/3066)

Accepts BMP images in the Media Library. Uploads through the admin, the media API, and the MCP `media_upload` tool no longer fail with `File type not allowed`. BMP files show as thumbnails in the upload dialog, are included in the "Images" preset of the allowed file types editor, and are displayed in the browser instead of downloaded. Fields with their own `allowedMimeTypes` can list them as `.bmp`.

### Change 62

Applies to: `emdash@1.5.0` (patch)  
Source: [#3707](https://github.com/emdash-cms/emdash/pull/3707)

Fixes the admin manifest so the logo selected in Site Settings appears in the admin branding when no logo is configured directly in `admin.logo`.

### Change 63

Applies to: `emdash@1.5.0` (patch)  
Source: [#4631](https://github.com/emdash-cms/emdash/pull/4631)

Reduces database queries on pages that render the same byline more than once in a single request, such as several `getEmDashCollection()` lists or a `getEmDashEntry()` page with a related-posts list, when byline custom fields are defined. Each byline's custom field values are now loaded once per request instead of once per list, including when several lists render at the same time.

### Change 64

Applies to: `emdash@1.5.0` (patch)  
Source: [#4237](https://github.com/emdash-cms/emdash/pull/4237)

Fixes the command `emdash login` suggests after "Device Flow is not available for this instance.", such as on a site that uses Cloudflare Access for sign-in. The suggested `emdash --token` command failed with "Unknown command"; the hint now shows `emdash schema list --url <url> --token <token>`, and when login got past Cloudflare Access with `--header` flags, `EMDASH_HEADERS` or cloudflared, it also says how to pass that access with each command.

### Change 65

Applies to: `emdash@1.5.0` (patch)  
Source: [#4340](https://github.com/emdash-cms/emdash/pull/4340)

Fixes `EmDashClient` so migration scripts can keep an entry's original dates: `create()` accepts `publishedAt` and `createdAt`, and `update()` and `publish()` accept `publishedAt`. The content API already accepted these fields for users with `content:publish_any`, but the client's types rejected them and `update()` and `publish()` did not send them.

### Change 66

Applies to: `emdash@1.5.0` (patch)  
Source: [#4339](https://github.com/emdash-cms/emdash/pull/4339)

Fixes the `MediaItem` type returned by `EmDashClient` so it describes the media items the API sends. `storageKey`, `status`, `contentHash`, `blurhash`, `dominantColor` and `authorId` are now typed, and `mediaList()` and `mediaUpload()` return items with their file `url`.
  
  Code that reads these items may need small type changes; runtime values are unchanged:
  
  - `key` and `updatedAt` are removed. The API never returned them, so they were always `undefined`. Read `item.storageKey`, or use `item.url` to link to the file.
  - `size`, `width`, `height`, `alt` and `caption` are typed `T | null` instead of optional `T`, because the API sends `null` when they are unset. Use `item.alt ?? undefined` where a `string | undefined` is expected.

### Change 67

Applies to: `emdash@1.5.0` (patch)  
Source: [#4603](https://github.com/emdash-cms/emdash/pull/4603)

Fixes the Columns and Cover blocks dropping everything inside them except text. Images, buttons, galleries, embeds, tables and other blocks inside a column or a cover now render on the site, with the same components EmDash's `PortableText` uses elsewhere.

### Change 68

Applies to: `emdash@1.5.0` (patch)  
Source: [#4575](https://github.com/emdash-cms/emdash/pull/4575)

Fixes dark mode styling across `Comments` and `CommentForm` components under `.dark`:
  
  - Updates `Comments` to use a dark border color (`[#374151](https://github.com/emdash-cms/emdash/issues/374151)`, overridable via `--ec-comment-border-color-dark`) for separators and reaction buttons.
  - Inverts `.ec-comment-form-submit` in dark mode (`#f3f4f6` background, `[#111827](https://github.com/emdash-cms/emdash/issues/111827)` text, overridable via `--ec-form-submit-bg-dark` and `--ec-form-submit-color-dark`) for high contrast against dark backgrounds.
  - Fixes `.ec-comment-user-info` retaining a light border color in dark mode by applying `border-color: var(--ec-form-user-border-dark, #4b5563)`.

### Change 69

Applies to: `emdash@1.5.0` (patch)  
Source: [#4098](https://github.com/emdash-cms/emdash/pull/4098)

Fixes generating a taxonomy term slug on Cloudflare D1 when the slug derived from the term's name is already taken and 49 characters or longer. The lookup failed with `LIKE or GLOB pattern too complex` instead of adding a numeric suffix.

### Change 70

Applies to: `emdash@1.5.0` (patch)  
Source: [#4651](https://github.com/emdash-cms/emdash/pull/4651)

Fixes sites using an `objectCache` backend serving the previous version of an entry after a content update under concurrent read load, where the stale entry could keep being served until the next write to the same collection or until the cache TTL expired.

### Change 71

Applies to: `emdash@1.5.0` (patch)  
Source: [#4445](https://github.com/emdash-cms/emdash/pull/4445)

Fixes slug changes on draft entries so they no longer create a redirect from the draft's old URL or remove the redirect that already answers at its new URL.

### Change 72

Applies to: `emdash@1.5.0` (patch)  
Source: [#4483](https://github.com/emdash-cms/emdash/pull/4483)

Updates the Zod dependency from 4.5.4 to 4.6.7 to address the reported high-severity `npm audit` warning for the older version. Upgrade EmDash and any separately installed plugin tooling to receive the updated dependency; refreshing a lockfile alone cannot replace the previous exact pin.
  
  Oversized repeater arrays now report the array-length error without validating their rows. Arrays within the configured limit still report individual row errors.

### Change 73

Applies to: `emdash@1.5.0` (patch)  
Source: [#4696](https://github.com/emdash-cms/emdash/pull/4696)

Fixes embed blocks whose HTML contains an iframe from a host other than YouTube or Vimeo, such as Google My Maps embeds imported from WordPress, or whose HTML is empty after sanitizing. They rendered as an empty frame or box; they now link to the embed URL, and any other HTML in the embed still renders.

### Change 74

Applies to: `emdash@1.5.0` (patch)  
Source: [#3600](https://github.com/emdash-cms/emdash/pull/3600)

Exports the email hook types (`EmailMessage`, `EmailDeliverEvent`, `EmailBeforeSendEvent`, `EmailAfterSendEvent` and their handler types) from `emdash`, so a plugin that provides `email:deliver` or hooks `email:beforeSend` / `email:afterSend` can type its handlers without copying the definitions.

### Change 75

Applies to: `emdash@1.5.0` (patch)  
Source: [#4619](https://github.com/emdash-cms/emdash/pull/4619)

Returns a generic `503 Service Unavailable` (with `Retry-After: 60` and `Cache-Control: private, no-store`) instead of `401 Authentication failed` when external authentication such as Cloudflare Access succeeds but the local user lookup, provisioning, or sync fails, for example because database migrations have not been applied. Rejected identities still return 401.

### Change 76

Applies to: `emdash@1.5.0` (patch)  
Source: [#4727](https://github.com/emdash-cms/emdash/pull/4727)

Removes a separate schema-version query when `getEmDashEntry()` and `getEmDashCollection()` render bylines, saving a round trip to D1 and other remote databases. Changes to custom byline fields remain visible across server instances on the next request.

### Change 77

Applies to: `emdash@1.5.0` (patch)  
Source: [#4508](https://github.com/emdash-cms/emdash/pull/4508)

Fixes invite creation returning “Admin privileges required” for signed-in admins when the API URL has a trailing slash. Invite acceptance remains available without signing in.

### Change 78

Applies to: `emdash@1.5.0` (patch)  
Source: [#4172](https://github.com/emdash-cms/emdash/pull/4172)

When using auto migration mode, cold starts on an already-migrated database no longer spend a separate database round trip on the migration check: on backends with a coalescing dialect (D1, Durable Object SQL), the applied-migration count is read in the same batch as the other startup reads.

### Change 79

Applies to: `emdash@1.5.0` (patch)  
Source: [#4733](https://github.com/emdash-cms/emdash/pull/4733)

Fixes admin browser tabs to show the current page and Site Title, falling back to configured admin branding and then EmDash when Site Title is empty. Content editor tabs include the collection type and entry title and update during client-side navigation.

### Change 80

Applies to: `emdash@1.5.0` (patch)  
Source: [#4460](https://github.com/emdash-cms/emdash/pull/4460)

Fixes stale comments on route-cached pages after approved submissions, moderation, or deletion, including bulk actions. Comment actions that leave approved comments unchanged do not purge cached pages.

### Change 81

Applies to: `emdash@1.5.0` (patch)  
Source: [#4734](https://github.com/emdash-cms/emdash/pull/4734)

Fixes content lists showing the original title and field values after saving changes to unpublished drafts in collections with revisions. Entries with a live revision continue to show their published values until the draft is published.

### Change 82

Applies to: `emdash@1.5.0` (patch)  
Source: [#4644](https://github.com/emdash-cms/emdash/pull/4644)

Fixes auth emails, test emails, domain-change notices, and passkey prompts ignoring the title saved in Settings > General. They now prefer that title, falling back to the title recorded during setup when no Settings title is set. Plugins also receive this title when the runtime initializes; an already-running runtime needs to reload before plugins see a changed title.

### Change 83

Applies to: `emdash@1.5.0` (patch)  
Source: [#4531](https://github.com/emdash-cms/emdash/pull/4531)

Fixes widget API mutations purging cached routes and returning before the object-cache epoch write has settled. Widget edits now wait for the epoch-write attempt before purging routes. This orders the epoch write only: isolates that revalidate through the site-wide change marker can still reuse an old widget epoch until the background marker update becomes visible. Workers KV propagation delays and isolate-local epoch reuse also remain; this does not guarantee immediate cross-isolate freshness.
  
  Code that writes widget tables directly can await `invalidateWidgetObjectCache({ waitForPersist: true })` before purging routes. The same option is available on `invalidateObjectCache(namespace, { waitForPersist: true })`. Existing calls without options remain non-blocking. Epoch writes for all namespaces now use the configured cache timeout, logging failures without failing the mutation; a timed-out backend write may still complete later. Change-marker updates and retries remain background work.

### Change 84

Applies to: `emdash@1.5.0` (patch)  
Source: [#4705](https://github.com/emdash-cms/emdash/pull/4705)

Fixes CLI authentication against local dev servers configured with an external auth provider, such as Cloudflare Access, so commands can use dev bypass without a stored token.

### Change 85

Applies to: `emdash@1.5.0` (patch)  
Source: [#4607](https://github.com/emdash-cms/emdash/pull/4607)

Fixes Markdown imports through the client API, CLI, and MCP to preserve nested inline formatting, links, and list depth. GFM pipe tables now import as native table blocks and export as Markdown tables, including cell formatting and alignment. Tables with merged cells or other layouts that GFM cannot represent remain preserved in opaque block comments. Headings containing hard line breaks are also exported as opaque blocks to preserve their text and formatting.
  
  Markdown imports now treat a single newline as a soft wrap within one paragraph; separate paragraphs with a blank line. Reads escape literal inline punctuation (for example, `snake_case` becomes `snake\_case`), use `*text*` for italics instead of `_text_`, and write hard line breaks as a trailing backslash (`\`).
  
  Unlinked images in ordinary paragraphs become native image blocks, splitting surrounding text into separate paragraphs. Images inside list items, blockquotes, or links remain inline Markdown text so their containing list, quote, or link is preserved.

### Change 86

Applies to: `emdash@1.5.0` (patch)  
Source: [#4484](https://github.com/emdash-cms/emdash/pull/4484)

Fixes the visual editor toolbar to detect and publish unpublished changes for every annotated entry on the page, rather than only the first entry on load or the last entry saved. If an entry fails to publish, other pending entries are still published and the page stays open so failed entries can be retried without republishing entries that already succeeded.

### Change 87

Applies to: `emdash@1.5.0` (patch)  
Source: [#4417](https://github.com/emdash-cms/emdash/pull/4417)

Fixes seed imports assigning taxonomy terms from another locale when slugs are shared across translations. Taxonomy references now resolve in the content entry's locale. When no term with that slug exists in the entry's locale, the import logs a warning and skips that assignment instead of attaching a term from another locale; add the term in that locale to keep the assignment.
  
  Reapplying a seed in update mode also preserves taxonomy assignments contributed by each content translation instead of letting later translations erase earlier ones.
  
  Existing assignments are not repaired automatically. To repair seeded entries already attached to a wrong-locale term, reapply the seed with `--on-conflict update`. This also overwrites other seeded records with the seed's values, so review the seed before reapplying it.

### Change 88

Applies to: `emdash@1.5.0` (patch)  
Source: [#4703](https://github.com/emdash-cms/emdash/pull/4703)

Fixes concurrent CLI sign-ins, token refreshes, and sign-outs overwriting credentials for other EmDash sites.

### Change 89

Applies to: `emdash@1.5.0` (patch)  
Source: [#4095](https://github.com/emdash-cms/emdash/pull/4095)

Fixes plugin storage-index synchronization so a fresh runtime cannot serve state-changing plugin routes before the declared indexes are materialized. These routes return `503 STORAGE_INDEXES_NOT_READY` if synchronization is incomplete. After correcting the underlying conflict, a subsequent write request or scheduled maintenance pass retries synchronization without a process restart. GET and HEAD plugin routes do not trigger index synchronization.
  
  When stored indexes match the plugin's declarations, a cold runtime checks them once without reissuing index statements. Updating or reinstalling a runtime-installed plugin rechecks its declarations before its next state-changing route runs. While a conflict remains, each subsequent write request retries the plugin's full index synchronization and returns 503. Correct the conflicting data before retrying to avoid repeated index work.

### Change 90

Applies to: `emdash@1.5.0` (patch)  
Source: [#4476](https://github.com/emdash-cms/emdash/pull/4476)

Fixes stale runtimes and background cron jobs surviving Node.js `astro dev` restarts, such as after editing `astro.config.mjs`, which could cause `Vite module runner has been closed` errors. The next request now initializes a fresh runtime.

### Change 91

Applies to: `emdash@1.5.0` (patch)  
Source: [#4542](https://github.com/emdash-cms/emdash/pull/4542)

Fixes content creation on Cloudflare D1 when a long generated slug is already taken, allowing repeated titles to receive numeric slug suffixes instead of failing with `CONTENT_CREATE_ERROR`.

### Change 92

Applies to: `emdash@1.5.0` (patch)  
Source: [#4353](https://github.com/emdash-cms/emdash/pull/4353)

Fixes intermittent Cloudflare Workers startup failures with `Cannot access 'VALID_HOOK_NAMES_SET' before initialization` when standard-format plugins are configured in the Astro integration.

### Change 93

Applies to: `emdash@1.5.0` (patch)  
Source: [#4598](https://github.com/emdash-cms/emdash/pull/4598)

Fixes the Portable Text link mark dropping a `title` stored on the link, so `<PortableText>` now renders it as the link's `title` attribute (shown by browsers on hover). Links without a title render as before.

### Change 94

Applies to: `emdash@1.5.0` (patch)  
Source: [#4563](https://github.com/emdash-cms/emdash/pull/4563)

Fixes `<LiveSearch>` keyboard navigation after a result has focus: Down and Up keep moving through the results (wrapping at either end), and Escape closes the results and returns focus to the search input. Previously both keys stopped working once the first result was focused.

### Change 95

Applies to: `emdash@1.5.0` (patch)  
Source: [#4694](https://github.com/emdash-cms/emdash/pull/4694)

Fixes the MCP `settings_update` tool reporting success for `seo.robotsTxt` and `seo.disallowAiTraining` on sites with their own `src/pages/robots.txt`. That file replaces EmDash's `/robots.txt`, so these settings never took effect. The tool now rejects changes to them with `ROBOTS_TXT_OVERRIDDEN` and stores nothing. Sending the stored values back unchanged, or clearing them with `""` or `false`, still works.

### Change 96

Applies to: `emdash@1.5.0` (patch)  
Source: [#4668](https://github.com/emdash-cms/emdash/pull/4668)

Fixes MCP `content_update` reporting a plain conflict after it had already saved field changes. When it saves the fields and the publish or unpublish requested with `status` then conflicts, the `CONFLICT` error now says the fields were saved and returns their new `_rev` in `details._rev`, so an agent can retry the status change without sending the fields again.

### Change 97

Applies to: `emdash@1.5.0` (patch)  
Source: [#4326](https://github.com/emdash-cms/emdash/pull/4326)

Fixes **Used in** missing rich text images and videos that refer to a library file by its `/_emdash/api/media/file/` URL instead of its media ID. Markdown images written through MCP or the CLI are stored this way, so files placed by agents and scripts looked unused, even right after media usage tracking was turned on. These references are now indexed. On sites that already track media usage, collections with rich text or blocks fields are marked for reindexing after the upgrade, and **Used in** reports their index as stale. To reindex them, an administrator opens **Settings** > **Media usage tracking** and keeps the page open until the status reads **Ready**.
  
  Saving rich text through the REST API, MCP, or the CLI now also stores the media ID (`asset._ref`) for these blocks when the URL matches a file in the media library, as images placed in the editor already have.

### Change 98

Applies to: `emdash@1.5.0` (patch)  
Source: [#4454](https://github.com/emdash-cms/emdash/pull/4454)

Fixes deleting a menu item on SQLite, libSQL, and Cloudflare D1 so the items nested under it are deleted too, as they already were on PostgreSQL. Before, the nested items stayed behind: the site showed them as top-level menu items, but the menu editor no longer listed them, so they could not be edited or removed.
  
  When a menu item has nested items, the menu editor's delete confirmation now says they will be deleted too.
  
  Upgrading moves every menu item whose parent is missing from its menu to the top level, where the site already shows it, so the menu editor lists it again.
  
  #### What should I do?
  
  After upgrading, review your menus in the admin. Items left behind by an earlier delete now appear at the top level, where your site was already showing them. Delete any you no longer want.

### Change 99

Applies to: `emdash@1.5.0` (patch)  
Source: [#4491](https://github.com/emdash-cms/emdash/pull/4491)

Fixes uploads into image and file fields inside blocks ignoring the nested field's `allowedMimeTypes`. Allowed Word documents and other types outside the default upload list can now be uploaded directly from a block's media picker.
  
  API clients uploading into a block field can send `blockType` (the block type slug) and `blockVersion` (the block's version number) with the composite `fieldId` (`<outerFieldId>:<blockKey>:<fieldSlug>`) to `POST /_emdash/api/media` or `POST /_emdash/api/media/upload-url`. Use the database ID of the collection's blocks field for `outerFieldId`, and send `blockVersion` as a string in multipart requests or a number in upload-URL JSON requests. Without the block context, the default upload allowlist still applies.

### Change 100

Applies to: `emdash@1.5.0` (patch)  
Source: [#4289](https://github.com/emdash-cms/emdash/pull/4289)

Fixes OAuth sign-in on Node adapters ignoring provider credentials (`EMDASH_OAUTH_*` and provider `*_CLIENT_ID`, `*_CLIENT_SECRET` and `*_TENANT_ID` values) set at runtime, for example with container environment variables. Sign-in failed with `provider_not_configured` unless the credentials were also present when the site was built, and credentials present at build time were written into the server bundle.
  
  On Node, OAuth credentials must now be in the server's process environment at runtime; values baked in from `.env` at build time are no longer used. If you only set them in a `.env` file, load it when starting the server (for example `node --env-file=.env ./dist/server/entry.mjs`) or set them in your host's environment; otherwise sign-in fails with `provider_not_configured`. `astro dev` still falls back to `.env`. If your server build output was shared or stored, rotate any client secret that was present at build time.

### Change 101

Applies to: `emdash@1.5.0` (patch)  
Source: [#4079](https://github.com/emdash-cms/emdash/pull/4079)

Fixes the object cache reading one epoch key per namespace on every render once `revalidate` has passed. On Workers KV with `kvCache()`, a page that reads several collections, menus, bylines, and taxonomies now usually reads one change-marker key to revalidate all of them, instead of one KV read per namespace. Isolates still pick up a change within KV propagation plus `revalidate`. After deploying, the saving starts with the first content, menu, or settings change, because older releases do not write the marker. Comment changes don't rewrite the marker, and the comments epoch is always read directly. With `revalidate: 0`, every query still reads its epochs directly.

### Change 102

Applies to: `emdash@1.5.0` (patch)  
Source: [#3019](https://github.com/emdash-cms/emdash/pull/3019)

Fixes the JSON-LD that core emits on public pages, which published nodes nothing could reference. `BlogPosting`, its `publisher`, and `WebSite` had no `@id`, so an Organization graph describing the site — from a plugin or written into a template — stood beside the article's publisher as a second, competing organisation instead of merging with it. Article pages carried two organisations, and the fuller one was not the article's publisher.
  
  Each of the three nodes now carries an `@id`: `<canonical>#article`, `<origin>/#organization`, and `<origin>/#website`. The publisher keeps its `@type` and `name`, so a site publishing no Organization graph of its own is unaffected.
  
  Sites already emitting an Organization graph should confirm its `@id` is `<origin>/#organization` — with the slash before the fragment. `https://example.com#organization` is a different IRI, and a mismatch produces two organisations rather than one.

### Change 103

Applies to: `emdash@1.5.0` (patch)  
Source: [#3266](https://github.com/emdash-cms/emdash/pull/3266)

Speeds up `getEmDashCollection()` listings on SQLite and D1 that filter by two or more taxonomies and no content fields. The listing now starts from the taxonomy with the fewest entries instead of the one written first in `where`, so a broad taxonomy listed first no longer slows it down.

### Change 104

Applies to: `emdash@1.5.0` (patch)  
Source: [#4511](https://github.com/emdash-cms/emdash/pull/4511)

Fixes preview links in Playground sessions: the admin's Preview button now shows the saved draft instead of the published page.

### Change 105

Applies to: `emdash@1.5.0` (patch)  
Source: [#2817](https://github.com/emdash-cms/emdash/pull/2817)

Fixes config-registered plugins showing their identifier instead of their display name and omitting their description in the admin Plugins list.

### Change 106

Applies to: `emdash@1.5.0` (patch)  
Source: [#4593](https://github.com/emdash-cms/emdash/pull/4593)

Fixes `astro dev` reloading the admin on the first visit after a cold start. Plugin admin pages that import `emdash/plugin-utils` no longer load against stale pre-bundled modules from before the reload.

### Change 107

Applies to: `emdash@1.5.0` (patch)  
Source: [#4284](https://github.com/emdash-cms/emdash/pull/4284)

Fixes `getSiteSettings()` and `getSiteSetting()` ignoring the storage `publicUrl`. On sites that serve media from an R2 custom domain or S3 CDN, the site logo, favicon, and default social image now use that URL instead of `/_emdash/api/media/file/`. Admin and REST API responses keep the internal route.
  
  Also fixes `<Media>` throwing "Local media provider requires database connection" when rendering media from the media library. It now renders local media with the storage `publicUrl` when one is configured.

### Change 108

Applies to: `emdash@1.5.0` (patch)  
Source: [#4591](https://github.com/emdash-cms/emdash/pull/4591)

Fixes Archives and Recent Posts widget links and `hreflang` alternate URLs on sites configured with an Astro `base`. They now include the base path instead of pointing to the site root.

### Change 109

Applies to: `emdash@1.5.0` (patch)  
Source: [#4708](https://github.com/emdash-cms/emdash/pull/4708)

Fixes site transfer imports failing with `TRANSFER_TARGET_NOT_EMPTY` after an interruption while removing starter collections created during setup. Resuming the import now continues that cleanup instead of treating the collection as existing content.
  
  **Settings → Transfer** now identifies collections whose deletion failed and explains how to retry them before importing. Deletions that are still in progress do not block a new import; the importer advances their cleanup.
  
  #### What should I do?
  
  If your import was interrupted, reopen **Settings → Transfer** to continue it, or run `emdash site import resume <operation-id>`. If the import or a collection deletion failed, follow the guide's [retry and recovery steps](https://docs.emdashcms.com/guides/site-transfer/#resolve-failed-collection-cleanup) before starting another import.

### Change 110

Applies to: `emdash@1.5.0` (patch)  
Source: [#4742](https://github.com/emdash-cms/emdash/pull/4742)

Fixes WXR imports publishing password-protected WordPress posts for anyone to read on the imported site. The admin import and `emdash import wordpress` now bring in a post with a WordPress password as a draft, whatever its WordPress status, and list each one on the **Import Complete** screen and in the CLI output.
  
  Imports through the EmDash Exporter plugin are unchanged: the exporter does not send post passwords, so a published, password-protected post still arrives published.
  
  #### What should I do?
  
  If you imported a WXR file before this release, or import through the EmDash Exporter, find the entries that WordPress marks as "Password protected" on its **Posts**, **Pages** and custom post type screens, and unpublish them in EmDash if they should stay private.

### Change 111

Applies to: `emdash@1.5.0` (patch)  
Source: [#3016](https://github.com/emdash-cms/emdash/pull/3016)

Fixes `emdash schema delete --force` so it can delete a collection that still has content. The flag only skipped the confirmation prompt and was never sent to the API, which then refused with "Use force: true to delete". `EmDashClient.deleteCollection` accepts `{ force: true }` for the same purpose.

### Change 112

Applies to: `emdash@1.5.0` (patch)  
Source: [#3916](https://github.com/emdash-cms/emdash/pull/3916)

Fixes `getEmDashCollection()` with `where: { id: [...] }` on SQLite walking the whole collection once `ANALYZE` has run on a database with trashed entries. The requested ids are now looked up by primary key; other list queries are unchanged.

### Change 113

Applies to: `emdash@1.5.0` (patch)  
Source: [#4403](https://github.com/emdash-cms/emdash/pull/4403)

Fixes re-enabling a plugin reporting success when its `plugin:activate` hook fails. Failed activation now returns an enable error and leaves the plugin inactive, with its routes, hooks, sandbox host access, and cron tasks disabled.

### Change 114

Applies to: `emdash@1.5.0` (patch)  
Source: [#4557](https://github.com/emdash-cms/emdash/pull/4557)

Fixes Registry plugin installs and updates failing with `AGGREGATOR_RECORD_MISMATCH` when a newer package profile is awaiting listing review. Releases still have to match the publisher's signed records, and verification and consent continue to use the publisher's current signed release policy. While a newer profile is awaiting review, installed and updated plugins take their name and description from the approved registry listing.

### Change 115

Applies to: `emdash@1.5.0` (patch)  
Source: [#4539](https://github.com/emdash-cms/emdash/pull/4539)

Fixes a rare case where a redirect that took too long to create could still be added after a newer redirect change had started, once the redirect write lock had been recreated. Such a redirect is now rejected.

### Change 116

Applies to: `emdash@1.5.0` (patch)  
Source: [#4366](https://github.com/emdash-cms/emdash/pull/4366)

Fixes redirect creation and editing failing with "Another redirect change is in progress" when the redirect write lock row is missing. Redirect writes now recreate the missing row automatically while preserving active locks.

### Change 117

Applies to: `emdash@1.5.0` (patch)  
Source: [#4615](https://github.com/emdash-cms/emdash/pull/4615)

Fixes redirects whose source path contains non-ASCII characters, such as `/stitek/domácí-zvířata`. These rules never matched before and visitors got a 404. Exact and pattern redirects now match whether the source was entered as raw Unicode or percent-encoded in either letter case, with no changes needed to existing rules. Non-ASCII characters in a redirect destination are percent-encoded in the `Location` header instead of failing the request. Loop detection, both when saving a redirect and on the Redirects page, treats raw and percent-encoded spellings of a path as the same path.

### Change 118

Applies to: `emdash@1.5.0` (patch)  
Source: [#4061](https://github.com/emdash-cms/emdash/pull/4061)

Fixes API tokens being unable to manage redirects without the `admin` scope. Reading redirects now takes `content:read` and creating, updating or deleting one takes `settings:manage`. Reading the 404 log, which holds visitor IP addresses, takes `settings:read`, and clearing or pruning it takes `settings:manage`. The token owner's role is still checked.

### Change 119

Applies to: `emdash@1.5.0` (patch)  
Source: [#4782](https://github.com/emdash-cms/emdash/pull/4782)

Fixes a scheduled entry that publishing refuses staying overdue forever. When the scheduler's publish fails with a validation error or a slug conflict, the entry is now unscheduled and the dashboard lists it with the error message, as it already does when a plugin rejects a scheduled publish. Before, the error went only to the server log, the scheduler retried it on every run, and the calendar said scheduled publishing might not be running.
  
  `ScheduledPolicyRejection.pluginId` is now optional, and the record gains an optional `code`: a record written for a refused publish has no `pluginId` and carries the publish error's `code` instead. Code that reads `emdash:scheduled-policy-rejection:*` records, or narrows with `isScheduledPolicyRejection`, should handle a missing `pluginId`.

### Change 120

Applies to: `emdash@1.5.0` (patch)  
Source: [#4560](https://github.com/emdash-cms/emdash/pull/4560)

Shortens each cron tick on sites with several collections, most noticeably on Cloudflare D1, where every query is a network round trip: the scheduled-publishing sweep now skips collections with nothing due instead of querying each of them twice.

### Change 121

Applies to: `emdash@1.5.0` (patch)  
Source: [#4715](https://github.com/emdash-cms/emdash/pull/4715)

Fixes plugin storage `uniqueIndexes` rejecting duplicate field values in unrelated plugins and collections. Uniqueness now applies only to the collection that declares it, while indexed lookups remain available. A database migration repairs existing tracked unique indexes, including those left by plugins removed from configuration; no manual index cleanup is needed. Unique index names also keep case-distinct collections and fields separate on SQLite/D1 and avoid PostgreSQL truncation collisions. Existing regular lookup indexes retain their short names; tracked names longer than 63 characters may be rebuilt on the next storage-index sync, triggered by a write or scheduled task.
  
  Sites with plugin storage unique indexes need a maintenance window for migration `095_plugin_storage_unique_scope`. Do not apply it in a pre-deploy migration job while older builds still serve traffic or scheduled work: they can recreate the non-partial constraints. Stop and drain old Node.js processes before migrating. On Workers, route traffic to maintenance and drain old invocations, deploy the upgraded build in `check` mode, then migrate and reopen traffic. Follow the platform-specific steps in the [upgrade guide](https://docs.emdashcms.com/deployment/updating/#fixed-plugin-storage-uniqueness).
  
  If a previous index-name collision or manual index removal allowed duplicates in a declared unique field, the migration stops without deleting data or dropping legacy constraints. Resolve the duplicate values in the collection named by the error, then retry the migration.

### Change 122

Applies to: `emdash@1.5.0` (patch)  
Source: [#4534](https://github.com/emdash-cms/emdash/pull/4534)

Fixes the default SEO title ignoring a collection's `titleField`. When an entry's SEO title is empty, `getSeoMeta()` now takes the page title from the collection's title field for entries from `getEmDashEntry()` and `resolveEmDashPath()`, and falls back to the `title` field when the collection sets no `titleField` or the entry leaves that field empty. The **SEO Title** placeholder in the editor shows the same value. Before, both read only the `title` field, so a collection that keeps its titles in a `headline` field got an empty page title.
  
  #### What should I do?
  
  If a collection's `titleField` names a field other than `title` and the collection also has a `title` field, its pages now take their title from the `titleField` value. To keep using the `title` field, pass it as the default title:
  
  ```ts
  const seo = getSeoMeta(post, { defaultTitle: post.data.title });
  ```

### Change 123

Applies to: `emdash@1.5.0` (patch)  
Source: [#4553](https://github.com/emdash-cms/emdash/pull/4553)

Fixes the `Embed` component rendering unrelated links as YouTube or Vimeo players when they contain a video URL in their path or query string, or use a lookalike hostname. Video detection now recognizes only `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, `vimeo.com`, and `www.vimeo.com`; other hosts remain links unless the block supplies HTML or an explicit audio/video provider.

### Change 124

Applies to: `emdash@1.5.0` (patch)  
Source: [#4697](https://github.com/emdash-cms/emdash/pull/4697)

Fixes slug-change redirects for collections whose URL pattern ends in `/`, such as `/whats-on/{slug}/`. The automatic redirect now points to the URL with its trailing slash. When an entry's slug changes, existing redirects to or from its old and new URLs are matched with or without the trailing slash, so old URLs no longer take an extra hop and a redirect at the new URL no longer sends visitors away. Disabled redirects and 410 or 451 rules at the old URL are left unchanged, and the old URL keeps that rule instead of getting a new redirect. When an entry is published at a URL that an automatic slug-change redirect still points away from, that redirect is now removed in either form.

### Change 125

Applies to: `emdash@1.5.0` (patch)  
Source: [#4596](https://github.com/emdash-cms/emdash/pull/4596)

Reduces the code a site evaluates on the first request of each new server instance. Importing anything from `emdash`, such as `getEmDashCollection`, no longer forces the API schemas, the WordPress importer, the seed applier and other admin-only code to load before a page renders. They load when an admin, API or import request first uses them. Sites need no changes.

### Change 126

Applies to: `emdash@1.5.0` (patch)  
Source: [#4610](https://github.com/emdash-cms/emdash/pull/4610)

Fixes backup downloads and preview snapshots failing on Cloudflare D1 for sites with a lot of content or revision history. From November 4, 2026, D1 rejects query results larger than 50 MB. Backups and snapshots now stay under that limit and contain the same data as before.

### Change 127

Applies to: `emdash@1.5.0` (patch)  
Source: [#4478](https://github.com/emdash-cms/emdash/pull/4478)

Fixes the public Image component and Portable Text image and gallery blocks emitting duplicate `srcset` URLs when Astro’s image service returns the source URL unchanged. This includes the public Image component’s `formats`/`<picture>` output for light and dark variants. These images now render without generated `srcset` or `sizes`; resizing still requires a working image service.

### Change 128

Applies to: `emdash@1.5.0` (patch)  
Source: [#4510](https://github.com/emdash-cms/emdash/pull/4510)

Replaces the Change domain error "does not serve this site yet" with "Could not verify that … serves this site" when the server cannot verify a domain, including Cloudflare Workers Custom Domains. The dialog now explains that a Worker may be unable to reach its own domain and asks you to confirm the new address shows your site in a browser before using it without the check.

### Change 129

Applies to: `emdash@1.5.0` (patch)  
Source: [#4389](https://github.com/emdash-cms/emdash/pull/4389)

Fixes Revisions missing the content an entry started with, so editors can compare against it or restore it after editing. In collections with revisions, the first save of an entry that has no revision yet now keeps its starting content as its oldest revision, whether that save comes from the admin, the API, MCP or a plugin. This covers new and duplicated entries, translations, imported posts, and existing entries that haven't been saved since they were created.

### Change 130

Applies to: `emdash@1.5.0` (patch)  
Source: [#4589](https://github.com/emdash-cms/emdash/pull/4589)

Fixes category, tag, and search widget URLs on sites configured with an Astro `base`. Built-in sitemap routes now initialize correctly under the base instead of returning 500, and sitemap URLs and robots.txt sitemap references include the base path.

### Change 131

Applies to: `emdash@1.5.0` (patch)  
Source: [#4401](https://github.com/emdash-cms/emdash/pull/4401)

Fixes responsive table widths in the admin editor with Tiptap 3.32.0. Gives both editors' textboxes accessible names for screen readers.
  
  Pins the editor's Tiptap dependencies to exactly 3.32.0 so installations use the version covered by the editor tests. Code-block highlighting keeps its existing lowlight extension version. Sites or plugins that share Tiptap dependencies with EmDash should align them to 3.32.0 to avoid installing multiple copies.
  
  Links applied at an empty caret now end when you type a space, following Tiptap's updated behavior. In the visual editor, typing a space at the end of an existing link also ends the link. Text typed after that space is not part of the link.

### Change 132

Applies to: `emdash@1.5.0` (patch)  
Source: [#4726](https://github.com/emdash-cms/emdash/pull/4726)

Fixes unnecessary session-store reads on public pages for visitors without a session cookie, reducing anonymous render latency on sites using remote session storage such as Cloudflare KV. Respects custom Astro session cookie names when identifying authenticated requests in the main middleware and on public routes.

### Change 133

Applies to: `emdash@1.5.0` (patch)  
Source: [#4088](https://github.com/emdash-cms/emdash/pull/4088)

Avoids an extra query when a listed entry has no terms in a taxonomy. `getTermsForEntries()` and `getEntryTerms()` now answer from the terms already loaded with the content query, so a blog list with an untagged post no longer queries its tags again.

### Change 134

Applies to: `emdash@1.5.0` (patch)  
Source: [#4581](https://github.com/emdash-cms/emdash/pull/4581)

Fixes taxonomy `where` filters with long term-slug lists failing with D1's bound-parameter limit and returning an empty collection result with an error, including queries that combine taxonomy and field filters.

### Change 135

Applies to: `emdash@1.5.0` (patch)  
Source: [#4711](https://github.com/emdash-cms/emdash/pull/4711)

Fixes CLI dev authentication creating `dev@emdash.local` before first-run setup and blocking the setup wizard with “Admin user already exists”. Dev authentication now requires completed setup; finish the wizard first or explicitly skip it under `astro dev` with `/_emdash/api/setup/dev-bypass?content=0`.
  
  If an earlier version has already left your development site blocked by this error, opening `/_emdash/api/setup/dev-bypass?content=0` under `astro dev` completes setup using the existing dev account without adding sample content, bylines, or taxonomy terms. It still applies the seed's schema and structure. This skips the wizard rather than replacing the dev account with a personal account.

### Change 136

Applies to: `emdash@1.5.0` (patch)  
Source: [#4699](https://github.com/emdash-cms/emdash/pull/4699)

Fixes WordPress import URL rewriting skipping Portable Text images and links on PostgreSQL. Also handles image and file fields returned as parsed JSON, while preserving existing behavior for text-backed media fields.

### Change 137

Applies to: `emdash@1.5.0` (patch)  
Source: [#4526](https://github.com/emdash-cms/emdash/pull/4526)

Fixes passkey login returning “Not authenticated” before the browser can request a passkey when middleware adds trailing slashes to API URLs. Public API routes, including login options and health checks, now accept either spelling while keeping private routes protected and preserving CSRF checks.

### Change 138

Applies to: `emdash@1.5.0` (patch)  
Source: [#4482](https://github.com/emdash-cms/emdash/pull/4482)

Fixes stylesheets imported by a plugin's `adminEntry` appearing on public pages in production builds. Plugin admin styles now load with the admin app without adding render-blocking stylesheet requests for public visitors.

### Change 139

Applies to: `emdash@1.5.0` (patch)  
Source: [#4358](https://github.com/emdash-cms/emdash/pull/4358)

Fixes config-declared sandboxed plugins, including those running with `sandbox: false`, skipping `plugin:install` and `plugin:activate` on first boot. These hooks now run for plugins without a recorded state, including on the first start after upgrading, so activation hooks can set up recurring tasks without an admin disable/re-enable cycle.
  
  If a sandbox stops before setup finishes, `plugin:install` can run again on the next boot. Make install hooks safe to repeat when settings or plugin data already exist.
  
  `createPluginRuntimeTestHost()` also runs install → activate when creating a host, before test fixtures are added. A failure in the plugin's own lifecycle hook disables it in the test host, so later actions will not invoke its hooks. Tests that explicitly call `actions.plugin.activate()` should account for the initial activation.
  
  #### What should I do?
  
  Make install hooks set only missing values. If a plugin hook failed, fix the hook and re-enable the plugin from the Plugins page to run `plugin:activate` again.

### Change 140

Applies to: `emdash@1.5.0` (patch)  
Source: [#4398](https://github.com/emdash-cms/emdash/pull/4398)

Fixes `/_emdash/api/search` silently returning no results on Node.js builds whose SQLite lacks FTS5. Search and suggestion requests return `503 SEARCH_UNAVAILABLE` with an explanation; enabling or rebuilding search reports the same cause. MCP search errors also use the `SEARCH_UNAVAILABLE` code. Programmatic search functions throw the exported `SearchUnavailableError`. Server-rendered search pages that do not catch it return an error until FTS5 is available. Catch this error to display an unavailable message. After switching to a build with FTS5 support, enable search for any collections whose setup failed.

### Change 141

Applies to: `emdash@1.5.0` (patch)  
Source: [#4415](https://github.com/emdash-cms/emdash/pull/4415)

Fixes content previews after a saved slug change to open and render the draft at its new slug, without changing the published URL until publication.

### Change 142

Applies to: `emdash@1.5.0` (patch)  
Source: [#4662](https://github.com/emdash-cms/emdash/pull/4662)

Fixes Portable Text type exports from `emdash/ui` so TypeScript consumers can resolve the types and reject invalid values such as a number assigned to `PortableTextBlock`.
  
  The `<PortableText>` component's props are now type-checked too, so invalid `value`, `components`, or `listNestingMode` arguments may report errors after upgrading. Undefined content remains supported and renders as empty content.

### Change 143

Applies to: `emdash@1.5.0` (patch)  
Source: [#4702](https://github.com/emdash-cms/emdash/pull/4702)

Fixes plugin route handlers receiving `null` client IP and geo metadata on Cloudflare when invoked through MCP tools, content editor panels, or editor actions.

### Change 144

Applies to: `emdash@1.5.0` (patch)  
Source: [#4660](https://github.com/emdash-cms/emdash/pull/4660)

Fixes `emdash/ui`, `emdash/ui/search`, `emdash/ui/comments`, and `emdash/ui/webmcp-search` imports so TypeScript uses package declarations instead of checking EmDash source under your project's compiler settings, including when using Astro's TypeScript content mapper. Astro continues to compile the components from source when building your site.
  
  Plain `tsc` now checks component props, including required props and `Blocks` renderer types. Calls that previously relied on loosely typed `.astro` imports may report invalid props after upgrading.

### Change 145

Applies to: `emdash@1.5.0` (patch)  
Source: [#4632](https://github.com/emdash-cms/emdash/pull/4632)

Updates `portableTextToProsemirror` so a video block's unset `provider`, `width` and `height` attributes are `null`, as in the admin editor, instead of `undefined`.

### Change 146

Applies to: `emdash@1.5.0` (patch)  
Source: [#4709](https://github.com/emdash-cms/emdash/pull/4709)

Fixes WordPress WXR and plugin imports discarding dates on posts imported as drafts. Publishing those posts now keeps the imported date and date-based permalink. This also applies to genuine WordPress drafts with a source date, including the local-date fallback, rather than dating them at first publication in EmDash. Posts scheduled for a future date still get their publication date from the final schedule. WordPress missed schedules remain drafts and keep their past source date when published.

### Change 147

Applies to: `emdash@1.5.0` (patch)  
Source: [#4604](https://github.com/emdash-cms/emdash/pull/4604)

Fixes the Categories, Tags, Recent Posts and Archives widgets showing visitors the default language on translated pages. They now list the terms, posts and months of the page's own locale, as signed-in editors already saw, and link under that locale, such as `/en/category/news`, `/en/archives/2025/01` and `/en/posts/museum-news`. A Recent Posts `urlTemplate` gets the locale prefix too, after Astro's `base` when the template starts with it, unless the template already has the prefix.
  
  Recent Posts links to translated posts change from `/posts/en/museum-news` to `/en/posts/museum-news`, the shape Astro's locale routing and the EmDash templates use.

### Change 148

Applies to: `emdash@1.5.0` (patch)  
Source: [#3765](https://github.com/emdash-cms/emdash/pull/3765)

Adds the `emdash import wordpress` command that the WordPress migration guide refers to. It converts a WordPress WXR export into JSON files on disk. This release also fixes `emdash --version` and `emdash --help` reporting `v0.0.0` instead of the installed version.
  
  Analyze the export first, review the generated `migration-config.json`, then convert the content:
  
  ```sh
  npx emdash import wordpress export.xml
  npx emdash import wordpress export.xml --execute
  ```
  
  Converted entries, a redirect map, downloaded attachments, and a progress file are written to `./wordpress-import` unless you pass `--output-dir`. After an interruption, run the command again with `--resume` to skip entries and attachments that were already converted. The analysis step does not overwrite an existing `migration-config.json` unless you pass `--force`. Attachments keep their path below `wp-content/uploads` inside the media directory, and scheduled WordPress posts are converted with the status `scheduled` and a `scheduledAt` date. `--skip-media` leaves attachments out, and `--dry-run` reports the files a step would write. The command does not write to an EmDash database; the admin importer remains the way to import WordPress content into a site.

### Change 149

Applies to: `emdash@1.5.0` (patch)  
Source: [#4601](https://github.com/emdash-cms/emdash/pull/4601)

Fixes WordPress WXR file imports creating a new guest byline for the same author every 30 posts. An author who is not mapped to a user now gets one byline for the whole file import, so their posts are no longer split between `author`, `author-2`, `author-3` and so on. Imports through the WordPress plugin connector (EmDash Exporter) are not yet covered by this fix.

### Change 150

Applies to: `emdash@1.5.0` (patch)  
Source: [#4592](https://github.com/emdash-cms/emdash/pull/4592)

Fixes WordPress menu links to custom post type entries disappearing from the site after an import through the EmDash Exporter plugin. Imported menu items now link to the collection the content was imported into.
  
  #### What should I do?
  
  Menus imported before this release are not repaired. Links to post types with a hyphen in their name, such as `team-member`, and to post types the import renames, such as `event`, `faq` and `testimonial`, can be missing from the site, together with their submenu items. If you imported through the exporter API (`/_emdash/api/import/wordpress-plugin/execute`) with your own `postTypeMappings`, links to any post type you mapped to a different collection can be missing too, `post` and `page` included.
  
  In the menu editor, an affected link's badge names a collection your content isn't in, such as `team-member` instead of `team_member`. Add each affected link again with **Add Content**. Deleting a link also deletes its submenu items, so first make the new link the **Parent** of the old link's submenu items. Then delete the old link.

### Change 151

Applies to: `emdash@1.5.0` (patch)  
Source: [#4666](https://github.com/emdash-cms/emdash/pull/4666)

Fixes WordPress export file (WXR) imports leaving out menus. The admin said the WXR path imports menus, but the import created none, and the review screen didn't list them. The review screen now lists a file's menus by their names in WordPress, with the switch that exporter imports already have, and the import creates them with their nesting and with links to the imported pages and posts. An item without its own label shows the linked entry's title, as in WordPress. On a site translated with Polylang or WPML, each menu takes the language of the pages it links to. An item that links to a post type archive links to the archive of the collection that the post type was imported into. Items that link to a category or tag archive, to content the import left out, or to one of several pages that share a slug in the same collection and language are skipped and counted in the import result. So is a Polylang language switcher, which only Polylang can turn into language links. A menu that already exists under the same name and language is left as it is.

### Change 152

Applies to: `emdash@1.4.0` (minor)  
Source: [#3856](https://github.com/emdash-cms/emdash/pull/3856)

Adds `admin.hiddenNavItems` to hide built-in admin areas a site doesn't use. Set it to any of `calendar`, `media`, `comments`, `menus`, `redirects`, `widgets`, `sections`, `bylines`, and `import`, for example `admin: { hiddenNavItems: ["comments", "redirects"] }`. Hidden areas disappear from the sidebar and the command palette. On the dashboard, listing `media` hides the Upload Media button, and listing `calendar` keeps the Scheduled count but removes its link to the calendar. The pages and API routes stay reachable for users with the required role. An unknown name fails the build.

### Change 153

Applies to: `emdash@1.4.0` (patch)  
Source: [#4364](https://github.com/emdash-cms/emdash/pull/4364)

Fixes translating a menu on Cloudflare D1, which failed for larger menus and left an empty translated menu behind. On D1, translating or deleting a menu and reordering or replacing its items now either save completely or leave the menus unchanged.
  
  #### What should I do?
  
  If translating a menu failed before, delete the empty translated menu it left behind, then translate the menu again.

### Change 154

Applies to: `emdash@1.4.0` (patch)  
Source: [#4167](https://github.com/emdash-cms/emdash/pull/4167)

Fixes extra database round trips on `getEmDashEntry` and `getEmDashCollection` for sites that register byline custom fields or have entries with an author but no explicit byline credit. These reads now resolve bylines from the content query itself and load custom-field values in one batched step, instead of re-reading every entry's credits. On Cloudflare D1, a page that reads a few entries saves two to six sequential queries.

### Change 155

Applies to: `emdash@1.4.0` (patch)  
Source: [#4287](https://github.com/emdash-cms/emdash/pull/4287)

Fixes expired OAuth tokens and unused login codes from `emdash login` and MCP clients staying in the database forever. Scheduled cleanup now deletes them after they expire.

### Change 156

Applies to: `emdash@1.4.0` (patch)  
Source: [#4286](https://github.com/emdash-cms/emdash/pull/4286)

Fixes lost edits on D1, Durable Objects and PostgreSQL when two saves of the same entry, both based on the same version, arrive at once, for example from two MCP clients or from scripts using `emdash content update --rev`: both reported success, and the first was silently overwritten. The second save now returns `409 CONFLICT`, the same response a save based on an outdated version already gets.

### Change 157

Applies to: `emdash@1.4.0` (patch)  
Source: [#4459](https://github.com/emdash-cms/emdash/pull/4459)

Fixes `POST /_emdash/api/oauth/token` returning uppercase `INVALID_GRANT` for refresh-token and device-code failures. These responses now use the RFC-standard `invalid_grant` code so OAuth clients can recognize rejected grants and restart authorization.

### Change 158

Applies to: `emdash@1.4.0` (patch)  
Source: [#4243](https://github.com/emdash-cms/emdash/pull/4243)

Fixes Cloudflare-cached pages remaining outdated after content is deleted or unpublished. Pages using EmDash cache hints no longer send an automatic `Last-Modified` header, so Cloudflare stops answering `304 Not Modified` based on an entry timestamp that does not cover related lists or settings changes. This applies to entry, collection, publication-date, and reference-list hints. Sites using an object cache reload those content snapshots once after upgrading so cached validators from earlier versions are not reused.
  
  Taxonomy definitions and collection-to-taxonomy mappings also revalidate in the background after 30 seconds, so long-lived server processes pick up changes saved elsewhere without adding a blocking query to each render. A failed refresh retains the last good snapshot.
  
  #### What should I do?
  
  `cacheHint.lastModified` is no longer populated automatically. For an entry's displayed modification date, use `entry.data.updatedAt` instead; it is not a validator for the whole page.
  
  Pages relying on automatic validators also lose Astro's implicit `Cache-Control: no-cache` header. Set your own browser `Cache-Control` if you need a fresh check on every visit. If you want conditional requests, supply a custom `lastModified` hint to `Astro.cache.set()`. Its timestamp must advance whenever any part of the response changes, including settings, related entries, deletions, and unpublishes.

### Change 159

Applies to: `emdash@1.4.0` (patch)  
Source: [#4157](https://github.com/emdash-cms/emdash/pull/4157)

Fixes external auth providers, such as Cloudflare Access, writing the session store on every authenticated `/_emdash` request. EmDash now writes the session only when the signed-in user differs from the stored one, so sites on Cloudflare no longer spend one Workers KV write per request, which could exhaust the Workers Free plan's daily write limit and hit KV's one-write-per-second limit on a key for parallel requests.

### Change 160

Applies to: `emdash@1.4.0` (patch)  
Source: [#3192](https://github.com/emdash-cms/emdash/pull/3192)

Names media downloads after the file that was uploaded. The public media file route previously sent `Content-Disposition: attachment` with no `filename`, so browsers fell back to the last path segment of the URL and saved every PDF, DOCX or CSV under its storage key. The route now looks the original filename up by storage key and emits both the quoted ASCII `filename` and the RFC 5987 `filename*` form, so non-ASCII names survive.
  
  Media with no matching database row is served exactly as before, and a failed lookup never fails the download.

### Change 161

Applies to: `emdash@1.4.0` (patch)  
Source: [#3129](https://github.com/emdash-cms/emdash/pull/3129)

Fixes saving an entry turning an empty image or file field (`""`) into `{ "provider": "external", "id": "", "src": "" }`. A blank image or file field, or a blank image inside a repeater, is now saved as `null`, the canonical empty value. Entries with no image stop changing on every save after that.
  
  A required image or file field now returns a validation error for `""` instead of saving an empty image. This only affects API, MCP or import clients, because the admin never sends `""`.

### Change 162

Applies to: `emdash@1.4.0` (patch)  
Source: [#4296](https://github.com/emdash-cms/emdash/pull/4296)

Fixes media usage tracking in collections that have a reference field named `title` or `name`, where saving an entry recorded none of the images and files it uses. Saving now records them.
  
  #### What should I do?
  
  Entries in those collections that were saved before this release can still be missing from **Used in** after you upgrade. Open **Settings → Media usage tracking** and wait until it shows **Ready**. If it shows **Needs attention** instead, repair each affected collection once:
  
  ```sh
  npx emdash media repair-usage --collection <collection>
  ```

### Change 163

Applies to: `emdash@1.4.0` (patch)  
Source: [#4285](https://github.com/emdash-cms/emdash/pull/4285)

Fixes menus showing dead links to entries that are in the trash or not published. `getMenu()` leaves those items out. Any item `getMenu()` leaves out now takes its child items with it, instead of moving them to the top level of the menu. In edit mode, menus still link to unpublished entries. With the object cache enabled, a cached menu now refreshes when an entry or taxonomy term it links to changes.

### Change 164

Applies to: `emdash@1.4.0` (patch)  
Source: [#4365](https://github.com/emdash-cms/emdash/pull/4365)

Fixes creating a child menu item through the menu items API on PostgreSQL. A request with a `parentId` and no `sortOrder` failed; the item is now placed after its existing siblings.

### Change 165

Applies to: `emdash@1.4.0` (patch)  
Source: [#4208](https://github.com/emdash-cms/emdash/pull/4208)

Fixes content list search, in the admin and through the content list API's `q` parameter, failing when the collection has a reference field named `title` or `name`. The search now leaves out a reference field bound to a relation and matches the entry's other fields.

### Change 166

Applies to: `emdash@1.4.0` (patch)  
Source: [#4205](https://github.com/emdash-cms/emdash/pull/4205)

Fixes entry creation, entry saves and content-list search failing with `no such column` in a collection that has a reference field marked `searchable`. Adding such a field to a search-enabled collection failed, and after a seed turned search on, creating or saving any entry in that collection failed. Site search and content-list search now ignore the `searchable` flag on a reference field bound to a relation.
  
  #### What should I do?
  
  If creating or saving entries in a collection still fails after upgrading and the server log shows `no such column`, open the collection under **Content Types**, untick **Search** and save, then tick it again and save. This rebuilds the collection's search index.

### Change 167

Applies to: `emdash@1.4.0` (patch)  
Source: [#4386](https://github.com/emdash-cms/emdash/pull/4386)

Fixes entry slugs being generated from a field named `title` instead of the collection's configured title field. In a collection whose `titleField` is `name` and which also has a `title` field (a person's job title, say), typing in the editor now fills the slug from the name, and entries created through the API without a slug get one from the name too, so two people with the same job title no longer collide with `SLUG_CONFLICT`. Collections without a `titleField` keep the previous `title`, then `name`, order.

### Change 168

Applies to: `emdash@1.4.0` (patch)  
Source: [#4380](https://github.com/emdash-cms/emdash/pull/4380)

Fixes `emdash site import` failing with `COLLECTION_EXISTS` when manually deleted target collections still have media-usage cleanup pending. For these manually deleted collections, import now runs as many cleanup steps as the request budget allows, then imports the collection in the same request if enough budget remains. It waits for active deletion leases or retry delays before reusing a slug. Cancellation during this per-collection cleanup stops before importing the collection. Failed cleanup of a manually deleted collection includes recovery instructions, and collection schema error messages are preserved in status `errorDetail`.

### Change 169

Applies to: `emdash@1.4.0` (patch)  
Source: [#4276](https://github.com/emdash-cms/emdash/pull/4276)

Fixes site builds using `zustand/traditional` or other dependencies that default-import `use-sync-external-store` shims, which previously failed with a missing default export error.

### Change 170

Applies to: `emdash@1.4.0` (patch)  
Source: [#4396](https://github.com/emdash-cms/emdash/pull/4396)

Fixes keyboard navigation and entrance animations in the admin and visual editor's floating toolbars with Tiptap 3.20.3 and later. Escape closes image alt-text editing, Shift+Tab returns to the caption, and arrow keys move between toolbar controls again.

### Change 171

Applies to: `emdash@1.4.0` (patch)  
Source: [#3279](https://github.com/emdash-cms/emdash/pull/3279)

Fixes the visual editing toolbar's "Open in admin" so each entry gets its own admin window. The window name was a single constant shared by the whole site, so opening the admin for one entry navigated away from another already open in that tab. A repeat click on the same entry still reuses that entry's window.

### Change 172

Applies to: `emdash@1.4.0` (patch)  
Source: [#3596](https://github.com/emdash-cms/emdash/pull/3596)

Caches widget areas in the object cache. With an object cache configured, `<WidgetArea>`, `getWidgetArea()`, `getWidgetAreaWithCacheHint()` and `getWidgetAreas()` no longer query the database on each page load. Widget changes made in the admin, by seeding or by a site transfer invalidate the cached areas; code that writes the widget tables directly should call the new `invalidateWidgetObjectCache()` export.

### Change 173

Applies to: `emdash@1.4.0` (patch)  
Source: [#3890](https://github.com/emdash-cms/emdash/pull/3890)

Fixes importing WordPress custom post types with a hyphen in their name (such as `team-member`) through the EmDash Exporter plugin. The import created the `team_member` collection but then failed every entry with `Collection "team-member" does not exist`, and custom taxonomies for that post type were not linked to the collection. The review step now shows the collection the import will use and recognizes it on a repeated import, so field type conflicts with it are reported. The `wxrSource` import source now suggests the same valid collection names, such as `team_member` for `team-member` and `wp_content` for a post type named `content`.

## Agent skills

The updater ran:

```sh
npx --yes skills@1.7.0 add emdash-cms/skills -y
```

Use the refreshed `upgrading-emdash` skill for this work order. If the skills command reported a conflict or failure, resolve that before continuing.

## Core database migrations

Installed EmDash changed from `1.3.1` to `1.6.0`.

The target package adds these core migrations:

- `092_plugin_kv_options`
- `093_menu_item_orphans`
- `094_media_usage_file_url_reindex`
- `095_plugin_storage_unique_scope`
- `096_revision_kind_and_editors`
- `097_room_storage`
- `098_user_last_login`

Do not apply migrations until the application changes compile and the target build has generated `.emdash/migrations.json`. Before starting or deploying the upgraded build, follow [Backups and recovery](https://docs.emdashcms.com/guides/backups/) to create a restorable database backup, back up media storage separately, and retain the `EMDASH_ENCRYPTION_KEY` rotation list. A JSON backup is not a recovery point. Apply migrations from the same build artifact that will be deployed.

Build the upgraded project and inspect the exact database target:

```sh
pnpm build
pnpm exec emdash migrate --status
```

After a human has reviewed the target and backup, apply pending migrations:

```sh
pnpm exec emdash migrate
```

The command shows the target and asks for confirmation. In a non-interactive shell, add `--expected-target-fingerprint` with the target fingerprint that the status command printed for the reviewed database.

Deploy the same build artifact with the project's deployment workflow, without rebuilding it. On Cloudflare Workers, run `wrangler deploy`.

Verify the deployed database against that artifact:

```sh
pnpm exec emdash migrate --check
```

Do not run migration `down()` functions or delete migration records to roll back. Restore the matching pre-migration database, media, keys, and application artifact together if recovery is required.

## Verification

1. Assess every release entry above and make the project changes it requires.
2. Run the project's format, tests, typecheck, and build commands.
3. Inspect the migration target and pending names before applying them.
4. Verify the public site, admin sign-in, content editing, media reads, and encrypted plugin settings after deployment.
