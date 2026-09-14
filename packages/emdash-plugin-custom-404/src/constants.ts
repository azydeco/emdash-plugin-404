import type { PluginAdminPage } from "emdash";

/**
 * Identity shared by the descriptor (build time) and the definition (request time).
 * Both must agree, so they read from here rather than repeating literals.
 */
export const PLUGIN_ID = "custom-404";
export const PLUGIN_VERSION = "0.1.0";
export const PACKAGE_NAME = "@azydeco/emdash-plugin-custom-404";
export const ADMIN_ENTRY = `${PACKAGE_NAME}/admin`;
export const COMPONENTS_ENTRY = `${PACKAGE_NAME}/astro`;

/** Admin pages mount at `/_emdash/admin/plugins/<id>/<path>`. */
export const ADMIN_PAGES = [{ path: "/", label: "Custom 404" }] satisfies PluginAdminPage[];
