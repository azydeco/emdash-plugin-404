import type { PublicPluginApiRouteHandler } from "emdash/plugin-utils";
import { describe, expect, it } from "vitest";

import { defaultConfig, type ConfigDocument } from "./config";
import { loadCustom404 } from "./page-model";
import { fakeDispatch } from "./test-support";

const savedDocument: ConfigDocument = {
	...defaultConfig(),
	enabled: true,
	headline: "Lost?",
	body: "This page has moved on.",
	cta: { label: "Go home", href: "/" },
	image: {
		source: "external",
		value: { id: "", provider: "external", src: "https://cdn.example.com/lost.png" },
		alt: "A lost balloon",
	},
	placement: "left",
	updatedAt: "2026-09-15T10:00:00.000Z",
};

const throwingDispatch: PublicPluginApiRouteHandler = async () => {
	throw new Error("runtime unavailable");
};

describe("loadCustom404 without a dispatcher", () => {
	it("returns null, meaning the fallback slot, when the host exposes no public route dispatcher", async () => {
		expect(await loadCustom404(undefined)).toBeNull();
	});
});

describe("loadCustom404 with an enabled document", () => {
	it("asks the host for this plugin's public config route with a synthetic request", async () => {
		const dispatch = fakeDispatch({ success: true, data: savedDocument });
		await loadCustom404(dispatch);
		expect(dispatch.calls).toHaveLength(1);
		const call = dispatch.calls[0];
		expect(call).toMatchObject({ pluginId: "custom-404", method: "GET", path: "/config" });
		expect(new URL(call.request.url).host).toBe("internal");
	});

	it("returns the headline, CTA, image and placement to render", async () => {
		const page = await loadCustom404(fakeDispatch({ success: true, data: savedDocument }));
		expect(page).toMatchObject({
			headline: "Lost?",
			cta: { label: "Go home", href: "/" },
			image: {
				value: { provider: "external", src: "https://cdn.example.com/lost.png" },
				alt: "A lost balloon",
			},
			placement: "left",
		});
	});
});

describe("loadCustom404 with a disabled document", () => {
	it("returns null, meaning the fallback slot, while the plugin is not enabled", async () => {
		const disabled = { ...savedDocument, enabled: false };
		expect(await loadCustom404(fakeDispatch({ success: true, data: disabled }))).toBeNull();
	});
});

describe("loadCustom404 when the host cannot serve the config", () => {
	it("returns null when the dispatch result is not a success", async () => {
		const failed = { success: false, error: { code: "NOT_FOUND", message: "Route not found" } };
		expect(await loadCustom404(fakeDispatch(failed))).toBeNull();
	});

	it("returns null when the dispatcher throws", async () => {
		expect(await loadCustom404(throwingDispatch)).toBeNull();
	});

	it("returns null when the data is not a config document", async () => {
		expect(
			await loadCustom404(fakeDispatch({ success: true, data: { enabled: true } })),
		).toBeNull();
	});
});

const withBody = (body: string) =>
	fakeDispatch({ success: true, data: { ...savedDocument, body } });

describe("loadCustom404 body paragraphs", () => {
	it("starts a new paragraph at each blank line, however the line endings are written", async () => {
		const page = await loadCustom404(
			withBody("First line\nstill first.\r\n\r\nSecond.\n\n\n  Third.  \n"),
		);
		expect(page?.paragraphs).toEqual(["First line\nstill first.", "Second.", "Third."]);
	});

	it("has no paragraphs for an empty body", async () => {
		const page = await loadCustom404(withBody("   \n\n"));
		expect(page?.paragraphs).toEqual([]);
	});
});
