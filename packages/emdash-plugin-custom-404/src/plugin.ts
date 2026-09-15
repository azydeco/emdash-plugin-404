import { definePlugin } from "emdash";
import { ADMIN_ENTRY, ADMIN_PAGES, PLUGIN_ID, PLUGIN_VERSION } from "./constants";
import { configRoute, saveRoute } from "./routes";

/**
 * Runtime entry. EmDash imports the descriptor's `entrypoint` at request time
 * and calls `createPlugin(options)` with the descriptor's serialised options.
 *
 * Route names become URL path segments under `/_emdash/api/plugins/custom-404/`.
 */
export function createPlugin(_options: Record<string, unknown> = {}) {
	return definePlugin({
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		hooks: {},
		routes: {
			config: configRoute,
			save: saveRoute,
		},
		admin: {
			entry: ADMIN_ENTRY,
			pages: ADMIN_PAGES,
		},
	});
}
