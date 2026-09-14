import { definePlugin } from "emdash";
import { ADMIN_ENTRY, ADMIN_PAGES, PLUGIN_ID, PLUGIN_VERSION } from "./constants";

/**
 * Runtime entry. EmDash imports the descriptor's `entrypoint` at request time
 * and calls `createPlugin(options)` with the descriptor's serialised options.
 *
 * Routes are filled in by issue 02.
 */
export function createPlugin(_options: Record<string, unknown> = {}) {
	return definePlugin({
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		hooks: {},
		routes: {},
		admin: {
			entry: ADMIN_ENTRY,
			pages: ADMIN_PAGES,
		},
	});
}
