# @azydeco/emdash-plugin-custom-404

A **native** [EmDash](https://github.com/emdash-cms/emdash) plugin that lets content editors configure the site's 404 page from the admin dashboard, and makes the public site return that page with a genuine HTTP 404 status and fixed SEO and caching headers.

Native, not sandboxed, because it needs three things a sandboxed plugin cannot do: render markup on the public site, use React in the admin (the Media Library picker), and set a response status and headers.

| Item | Value |
| --- | --- |
| Plugin id | `custom-404` |
| Admin page | `/_emdash/admin/plugins/custom-404/` |
| Public config route | `/_emdash/api/plugins/custom-404/config` |
| Licence | MIT |

Peer floors: `emdash >=0.37.0`, `astro >=7.0.0`, `react` and `react-dom` `^18 || ^19`, `@emdash-cms/admin >=0.37.0`. Only Astro 7 is claimed — the native plugin guide mentions Astro 6, but only 7 has been verified.

## Install

The EmDash Marketplace has been deprecated; the sandboxed plugin registry is now the only listing surface, and it accepts sandboxed plugins only. This plugin — being native — cannot be listed there. That's a limitation of native plugins, not a gap to be filled later. Install it from npm:

```bash
pnpm add @azydeco/emdash-plugin-custom-404
```

(A `github:` reference is not supported. This package ships from a monorepo — see [Packaging and publishing](https://github.com/azydeco/emdash-plugin-404/blob/main/docs/emdash-plugin-custom-404/packaging.md) — and a git reference would install the whole workspace at its root, not this package, and cannot resolve the `pnpm` catalog versions in its manifest. npm publish handles both, the same way `emdash-cms/emdash` publishes each of its own `@emdash-cms/plugin-*` packages.)

Then register it in `astro.config.mjs`, in `plugins: []` — **never** `sandboxed: []`:

```ts
import { custom404Plugin } from "@azydeco/emdash-plugin-custom-404";

export default defineConfig({
	integrations: [
		emdash({
			plugins: [custom404Plugin()],
		}),
	],
});
```

## Wire it into `404.astro`

```astro
---
import { Custom404, markNotFound } from "@azydeco/emdash-plugin-custom-404/astro";
import Base from "../layouts/Base.astro";

markNotFound(Astro.response);
---

<Base title="Not Found">
	<Custom404>
		<h1>Page not found</h1>
		<p>The page you're looking for doesn't exist.</p>
		<a href="/">Go home</a>
	</Custom404>
</Base>
```

Two things matter here:

- **Call `markNotFound(Astro.response)` in the page's own frontmatter, not only inside `Custom404`.** Astro copies the response headers into the Response as soon as the page's own frontmatter has run; under streaming (the default, and what the Cloudflare adapter uses) a child component's frontmatter runs later, so headers set only inside the component never reach the client. `Custom404` still calls it too, which covers the non-streamed case, but the page-level call is load-bearing.
- **Everything inside `<Custom404>` is the fallback slot** — your site's existing 404 markup. It renders whenever the plugin is disabled, or enabled with no headline saved.

### Route to `/404` with a rewrite, not a redirect

Use `Astro.rewrite("/404")`, not `Astro.redirect("/404")`, wherever a page needs to send the visitor to the 404 page:

```diff
- return Astro.redirect("/404");
+ return Astro.rewrite("/404");
```

A redirect sends a 302 first and the 404 page loads as a second request, which fails a `curl -I` 404 check against the original URL. A rewrite renders `404.astro` in place, so the status and headers below land on the URL the visitor actually requested.

## Configuring the 404 page

Editors configure one site-wide document from the admin page:

| Field | Type | Rules |
| --- | --- | --- |
| Enabled | boolean | Default off. Off means the site's own 404 markup (the fallback slot) shows. |
| Headline | string | Required when Enabled. Max 200 characters. |
| Body | string | Plain text. A blank line starts a new paragraph. Max 5000 characters. |
| CTA label | string | Optional. Max 80. Required if CTA URL is set. |
| CTA URL | string | Optional. Relative path or absolute https URL. Required if CTA label is set. Opens in the same tab. |
| Image source | `library` or `external` | Optional image, from the Media Library or an external URL. |
| Alt text | string | Required when an image is set. Max 250. Prefilled from the library item's alt, editable. |
| Placement | `above`, `below`, `left`, `right` | Where the image sits relative to the text. Default `above`. |

Only one CTA, no background placement, no per-locale or per-path variants, and no in-admin preview — use the admin page's "View 404 page" link, which opens `/404` on the public site.

**External image URLs** are verified server-side at save time: the plugin fetches the URL and confirms the response content type starts with `image/`. Only `https:` URLs are accepted. The verification timestamp is stored and shown in the admin; there is no scheduled re-check.

**Saving** requires the `content:edit_any` permission, which the editor role holds — not `plugins:manage` (the default plugin-route permission, admin-only), which this plugin does not use.

## Verifying the 404 response

```bash
curl -I http://localhost:4321/does-not-exist
```

Expect, whether or not the plugin is enabled:

```
HTTP/1.1 404 Not Found
x-robots-tag: noindex, nofollow
cache-control: public, max-age=60, s-maxage=300
```

No `location` header — if you see one, something in the request path is still using `Astro.redirect("/404")` instead of `Astro.rewrite("/404")`.

## Notes for anyone extending the plugin

- `usePluginAPI`, mentioned in the bundled EmDash "creating plugins" skill docs, does not exist in 0.37.0. Use `apiFetch` and `parseApiResponse` from `emdash/plugin-utils` instead.
- Throwing a `Response` from a plugin route handler for a custom status is not honoured and becomes a JSON 500. Use `PluginRouteError`.

## Licence

Azydeco chooses the MIT license for this project to ensure that developers can feel they have access to the source code within their native Emdash deploys without a concern that they are expected to deliver access to the origins of this source within their own deploys. The freedoms of the MIT license both commercially and in terms of Source access are considered to be the best option for this project.
