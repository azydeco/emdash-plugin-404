import { PluginRouteError } from "emdash";
import { describe, expect, it } from "vitest";

import { configDocumentSchema, defaultConfig } from "./config";
import { createPlugin } from "./plugin";
import { createVerifyUrlRoute } from "./routes";
import { fakeFetch, fakeKv, routeContext } from "./test-support";

const plugin = createPlugin();
const configRoute = plugin.routes.config;
const saveRoute = plugin.routes.save;

const editable = {
	enabled: true,
	headline: "Page not found",
	body: "Try the homepage.",
	cta: { label: "Go home", href: "/" },
	image: null,
	placement: "below",
};

describe("config route", () => {
	it("is public", () => {
		expect(configRoute.public).toBe(true);
	});

	it("returns the default document when nothing has been saved", async () => {
		const result = await configRoute.handler(routeContext({ method: "GET", kv: fakeKv() }));
		expect(result).toEqual(defaultConfig());
	});

	it("rejects methods other than GET with a 405 route error", async () => {
		const call = configRoute.handler(routeContext({ method: "POST", kv: fakeKv() }));
		await expect(call).rejects.toBeInstanceOf(PluginRouteError);
		await expect(call).rejects.toMatchObject({ status: 405 });
	});
});

describe("save route", () => {
	it("requires content:edit_any and is not public", () => {
		expect(saveRoute.permission).toBe("content:edit_any");
		expect(saveRoute.public).not.toBe(true);
	});

	it("validates its input with the save schema", () => {
		expect(saveRoute.input?.safeParse(editable).success).toBe(true);
		expect(saveRoute.input?.safeParse({ ...editable, headline: "" }).success).toBe(false);
	});

	it("round-trips: what save stores, config returns, with version and updatedAt stamped", async () => {
		const kv = fakeKv();
		const before = Date.now();
		const saved = await saveRoute.handler(routeContext({ method: "POST", input: editable, kv }));
		const read = await configRoute.handler(routeContext({ method: "GET", kv }));

		expect(read).toEqual(saved);
		expect(read).toMatchObject({ ...editable, version: 1 });
		const updatedAt = Date.parse(configDocumentSchema.parse(read).updatedAt);
		expect(updatedAt).toBeGreaterThanOrEqual(before);
		expect(updatedAt).toBeLessThanOrEqual(Date.now());
	});

	it("rejects methods other than POST with a 405 route error", async () => {
		const call = saveRoute.handler(routeContext({ method: "GET", input: editable, kv: fakeKv() }));
		await expect(call).rejects.toMatchObject({ status: 405 });
	});
});

describe("verify-url route", () => {
	const verifyUrlRoute = plugin.routes["verify-url"];

	it("requires content:edit_any and is not public", () => {
		expect(verifyUrlRoute.permission).toBe("content:edit_any");
		expect(verifyUrlRoute.public).not.toBe(true);
	});

	it("accepts only an object with a string url", () => {
		expect(verifyUrlRoute.input?.safeParse({ url: "https://cdn.example.com/a.png" }).success).toBe(
			true,
		);
		expect(verifyUrlRoute.input?.safeParse({ url: 42 }).success).toBe(false);
		expect(verifyUrlRoute.input?.safeParse({}).success).toBe(false);
	});

	it("verifies the url with the injected fetch and returns the result", async () => {
		const fetch = fakeFetch([
			new Response(null, { status: 200, headers: { "content-type": "image/png" } }),
		]);
		const route = createVerifyUrlRoute(fetch);
		const result = await route.handler(
			routeContext({
				method: "POST",
				input: { url: "https://cdn.example.com/a.png" },
				kv: fakeKv(),
			}),
		);
		expect(result).toMatchObject({ ok: true, contentType: "image/png" });
		expect(fetch.calls.map((c) => c.url)).toEqual(["https://cdn.example.com/a.png"]);
	});

	it("returns a failed verification as a normal result, not an error", async () => {
		const route = createVerifyUrlRoute(fakeFetch([new Response(null, { status: 404 })]));
		const result = await route.handler(
			routeContext({
				method: "POST",
				input: { url: "https://cdn.example.com/a.png" },
				kv: fakeKv(),
			}),
		);
		expect(result).toMatchObject({ ok: false });
	});

	it("rejects methods other than POST with a 405 route error", async () => {
		const route = createVerifyUrlRoute(fakeFetch([]));
		const call = route.handler(
			routeContext({
				method: "GET",
				input: { url: "https://cdn.example.com/a.png" },
				kv: fakeKv(),
			}),
		);
		await expect(call).rejects.toMatchObject({ status: 405 });
	});
});
