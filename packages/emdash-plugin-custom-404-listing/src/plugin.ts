import { pluginResponse, type SandboxedPlugin } from "emdash/plugin";

import { SCREENSHOT_PNG_BASE64 } from "./screenshot";

const NATIVE_PACKAGE = "@azydeco/emdash-plugin-custom-404";

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
		{ type: "header", text: "Custom 404" },
		{
			type: "section",
			text:
				"Custom 404 lets editors design the site's 404 page from the EmDash admin and serves it with a real 404 status. " +
				"This is its Registry listing: installing it from the Registry adds only this page. " +
				"The feature itself is the native plugin, installed from npm.",
		},
		{
			type: "image",
			url: screenshotUrl(pluginId),
			alt:
				'A Custom 404 page as a visitor sees it: a gold logo, the heading "There might have been a page here; now it is just a 404", ' +
				"a short message written by an editor, and a link button.",
		},
		{
			type: "section",
			text:
				"Why native? Custom 404 renders public markup on your site, uses a React admin, " +
				"and sets the response status and headers. Those need a native plugin, which the Registry can't list, " +
				"so you install it from npm and register it in plugins: [] in astro.config.mjs.",
		},
		{ type: "section", text: `pnpm add ${NATIVE_PACKAGE}` },
		{
			type: "actions",
			elements: [
				externalLink("npm", `https://www.npmjs.com/package/${NATIVE_PACKAGE}`),
				externalLink("npmx", `https://npmx.dev/package/${NATIVE_PACKAGE}`),
				externalLink(
					"GitHub",
					"https://github.com/azydeco/emdash-plugin-404/tree/main/packages/emdash-plugin-custom-404",
				),
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
