import { describe, expect, it } from "vitest";

import plugin, { SIGNPOST_PATH } from "./plugin";

const NATIVE_PACKAGE = "@azydeco/emdash-plugin-custom-404";

async function admin(input: unknown) {
	return plugin.routes.admin.handler({ input });
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
					type: "section",
					text: expect.stringMatching(/public markup.*React admin.*status and headers/s),
				},
				{ type: "section", text: `pnpm add ${NATIVE_PACKAGE}` },
				{
					type: "actions",
					elements: [
						externalLink("npm", `https://www.npmjs.com/package/${NATIVE_PACKAGE}`),
						externalLink("npmx", `https://npmx.dev/package/${NATIVE_PACKAGE}`),
						externalLink("GitHub", "https://github.com/azydeco/emdash-plugin-404"),
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
