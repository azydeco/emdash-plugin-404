import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { custom404Plugin } from "@azydeco/emdash-plugin-custom-404";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	// `inspectorPort` pins the workerd DevTools inspector so `.vscode/launch.json`
	// can attach to a known port; unpinned, the Cloudflare Vite plugin silently
	// moves to the next free port when 9229 is busy. See CONTRIBUTING.md#debugging.
	adapter: cloudflare({ inspectorPort: 9229 }),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			// Native plugin: must be in `plugins`, never `sandboxed`.
			plugins: [custom404Plugin()],
		}),
	],
	devToolbar: { enabled: false },
});
