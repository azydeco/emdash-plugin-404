# web-cloudflare

The EmDash test site plugins are developed and exercised against before release.

## Language

**Sandbox runner**:
The component this site configures to execute standard plugins in sandboxed mode: the Cloudflare Worker Loader runner or the Node workerd runner. Without one, plugins listed for sandboxed mode are skipped.
_Avoid_: Sandbox, isolate host, worker loader (that is the Cloudflare binding, not the runner)

**Test site**:
This site — the one plugins in `packages/*` are linked into via `workspace:*` and exercised against before release.
_Avoid_: Demo site, example site, starter
