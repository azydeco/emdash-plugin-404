import type { AstroGlobal } from "astro";

/**
 * Headers every 404 response carries, whether or not the plugin is enabled.
 * Hard-coded by design (spec 4.2): they are not editable in the admin.
 */
export const NOT_FOUND_HEADERS = {
	"X-Robots-Tag": "noindex, nofollow",
	"Cache-Control": "public, max-age=60, s-maxage=300",
} as const;

/**
 * Make the response a genuine 404 with the fixed headers.
 *
 * Call it from the frontmatter of the site's `404.astro` page, not only
 * from a component: Astro copies the response headers as soon as the page's
 * own frontmatter has run, and a child component's frontmatter runs later
 * while the page streams, so headers it sets never reach the client.
 */
export function markNotFound(response: AstroGlobal["response"]): void {
	response.status = 404;
	for (const [name, value] of Object.entries(NOT_FOUND_HEADERS)) {
		response.headers.set(name, value);
	}
}
