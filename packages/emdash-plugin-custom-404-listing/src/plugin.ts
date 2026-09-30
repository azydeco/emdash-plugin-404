import type { SandboxedPlugin } from "emdash/plugin";

/** Must match the page `path` declared under `admin.pages` in emdash-plugin.jsonc. */
export const SIGNPOST_PATH = "/about";

const SIGNPOST_PAGE = {
	blocks: [
		{ type: "header", text: "Custom 404" },
		{
			type: "section",
			text: "header",
		},
	],
};

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
			handler: async ({ input }: { input: unknown }) =>
				isSignpostPageLoad(input) ? SIGNPOST_PAGE : NO_BLOCKS,
		},
	},
} satisfies SandboxedPlugin;

export default plugin;
