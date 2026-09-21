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
