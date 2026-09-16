import type { PublicPluginApiRouteHandler } from "emdash/plugin-utils";
import { configDocumentSchema, type ConfigDocument } from "./config";
import { CONFIG_ROUTE, PLUGIN_ID } from "./constants";

/** What the `Custom404` component renders when the plugin is enabled. */
export interface PageModel {
	headline: string;
	/** Body text split at blank lines. Astro escapes each one when it renders it. */
	paragraphs: string[];
	cta: ConfigDocument["cta"];
	image: Pick<NonNullable<ConfigDocument["image"]>, "value" | "alt"> | null;
	placement: ConfigDocument["placement"];
}

/**
 * Read the config document through the host's public route dispatcher and
 * decide what the 404 page shows. `null` means render the fallback slot.
 *
 * The request is synthetic on purpose: the route only needs a method, and
 * the page's own request would carry the visitor's cookies into the plugin.
 */
export async function loadCustom404(
	dispatch: PublicPluginApiRouteHandler | undefined,
): Promise<PageModel | null> {
	if (!dispatch) return null;
	let data: unknown;
	try {
		const result = await dispatch(PLUGIN_ID, "GET", `/${CONFIG_ROUTE}`, new Request(`https://internal/${CONFIG_ROUTE}`));
		if (!result.success) return null;
		data = result.data;
	} catch (error) {
		// A 404 page must still render; the site's own markup is the safe answer.
		console.error(`[${PLUGIN_ID}] could not read the config document:`, error);
		return null;
	}
	const parsed = configDocumentSchema.safeParse(data);
	if (!parsed.success) return null;
	const config = parsed.data;
	if (!config.enabled || config.headline.trim() === "") return null;
	return {
		headline: config.headline,
		paragraphs: paragraphs(config.body),
		cta: config.cta,
		image: config.image ? { value: config.image.value, alt: config.image.alt } : null,
		placement: config.placement,
	};
}

/** A blank line (any whitespace-only line, with LF or CRLF endings) starts a new paragraph. */
function paragraphs(body: string): string[] {
	return body
		.split(/\r?\n[ \t]*\r?\n/)
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph !== "");
}
