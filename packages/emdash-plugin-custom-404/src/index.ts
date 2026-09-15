import type { PluginDescriptor } from "emdash";
import {
	ADMIN_ENTRY,
	ADMIN_PAGES,
	COMPONENTS_ENTRY,
	PACKAGE_NAME,
	PLUGIN_ID,
	PLUGIN_VERSION,
} from "./constants";

/**
 * Descriptor factory. Imported by the site's `astro.config.mjs` and evaluated
 * inside Vite at build time, so it must be side-effect free and return plain
 * data only: `options` is serialised to JSON before reaching `createPlugin()`.
 *
 * Register it in `plugins: []`, never `sandboxed: []`. This is a native plugin.
 */
export function custom404Plugin(): PluginDescriptor {
	return {
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		entrypoint: PACKAGE_NAME,
		format: "native",
		options: {},
		adminEntry: ADMIN_ENTRY,
		adminPages: ADMIN_PAGES,
		componentsEntry: COMPONENTS_ENTRY,
		/**
		 * Documentation only. The runtime enforces capabilities for standard
		 * plugins; this native plugin's `verify-url` route uses plain `fetch`.
		 */
		capabilities: ["network:request"],
	};
}

/**
 * Load-bearing: the descriptor's `entrypoint` is this package's `.` export, and
 * EmDash statically imports `createPlugin` from it at request time. Removing
 * this re-export breaks the plugin even though the build still passes.
 */
export { createPlugin } from "./plugin";
