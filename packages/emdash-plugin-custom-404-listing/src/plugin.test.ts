/// <reference types="node" />
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import plugin, { SCREENSHOT_ROUTE, SIGNPOST_PATH } from "./plugin";

const NATIVE_PACKAGE = "@azydeco/emdash-plugin-custom-404";
// Registry installs get an opaque id, so the route URL must come from the context.
const PLUGIN_ID = "r_3k9x/abc";

async function admin(input: unknown) {
	return plugin.routes.admin.handler({ input }, { plugin: { id: PLUGIN_ID } });
}

function externalLink(label: string, url: string) {
	return { type: "link", label, appearance: "secondary", target: { kind: "external", url } };
}

describe("admin route", () => {
	it("renders the Signpost page on page_load for its path", async () => {
		const result = await admin({ type: "page_load", page: SIGNPOST_PATH });

		expect(result).toEqual({
			blocks: [
				{ type: "header", text: "Custom 404" },
				{
					type: "section",
					text: expect.stringMatching(
						/Registry listing.*adds only this page.*native plugin, installed from npm/s,
					),
				},
				{
					type: "image",
					url: "/_emdash/api/plugins/r_3k9x%2Fabc/screenshot",
					alt: expect.stringMatching(/404 page/),
				},
				{
					type: "section",
					text: expect.stringMatching(/public markup.*React admin.*status and headers/s),
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
	});

	it("never states the Native plugin's version", async () => {
		const result = await admin({ type: "page_load", page: SIGNPOST_PATH });

		expect(JSON.stringify(result)).not.toMatch(/\d+\.\d+\.\d+/);
	});

	it.each([
		{ type: "page_load", page: "/other" },
		{ type: "page_load", page: "widget:status" },
		{ type: "block_action", action_id: "anything" },
		{ type: "form_submit", action_id: "anything", values: {} },
		undefined,
	])("returns no blocks for %o", async (input) => {
		expect(await admin(input)).toEqual({ blocks: [] });
	});
});

describe("screenshot route", () => {
	const route = plugin.routes[SCREENSHOT_ROUTE];

	it("is a public GET route, because an <img> can't send the X-EmDash-Request header", () => {
		expect(route).toMatchObject({ public: true, methods: ["GET"], response: "raw" });
	});

	it("answers with the screenshot's PNG bytes", async () => {
		const response = await route.handler();

		expect(response.status).toBe(200);
		expect(response.headers).toContainEqual(["content-type", "image/png"]);
		const png = readFileSync(new URL("../assets/404_plugin.png", import.meta.url));
		// If the PNG changed, regenerate src/screenshot.ts with `pnpm embed-screenshot`.
		expect(response.body).toEqual({ kind: "bytes", value: new Uint8Array(png) });
	});
});
