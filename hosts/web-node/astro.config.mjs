import inspector from "node:inspector";
import { fileURLToPath } from "node:url";

import node from "@astrojs/node";
import react from "@astrojs/react";
import { custom404Plugin } from "@azydeco/emdash-plugin-custom-404";
import custom404Listing from "@azydeco/emdash-plugin-custom-404-listing";
import { defineConfig, fontProviders } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

// Under `pnpm dev:debug` the Node inspector is open, but it can't reach the workerd
// isolate that sandboxed plugins run in. So the Listing plugin loads in-process
// instead, from its TypeScript source, and breakpoints in its src/plugin.ts bind.
// The entrypoint is pasted into a generated `import`, so it needs forward slashes on Windows.
const debugListingInProcess = inspector.url() !== undefined;
const custom404ListingFromSource = {
	...custom404Listing,
	entrypoint: fileURLToPath(
		new URL("../../packages/emdash-plugin-custom-404-listing/src/plugin.ts", import.meta.url),
	).replaceAll("\\", "/"),
};

export default defineConfig({
	output: "server",
	adapter: node({
		mode: "standalone",
	}),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
			// Native plugin: must be in `plugins`, never `sandboxed`.
			plugins: debugListingInProcess
				? [custom404Plugin(), custom404ListingFromSource]
				: [custom404Plugin()],
			// Listing plugin: loaded from its built `dist/` descriptor, so build it first.
			sandboxed: debugListingInProcess ? [] : [custom404Listing],
			// Node has no Worker Loader; this runner isolates sandboxed plugins in workerd.
			sandboxRunner: "@emdash-cms/sandbox-workerd/sandbox",
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-body",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
