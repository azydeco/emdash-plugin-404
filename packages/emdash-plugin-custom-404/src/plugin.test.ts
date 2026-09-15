import { PluginRouteError } from "emdash";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "./config";
import { createPlugin } from "./plugin";
import { fakeKv, routeContext } from "./test-support";

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
		const updatedAt = Date.parse((read as { updatedAt: string }).updatedAt);
		expect(updatedAt).toBeGreaterThanOrEqual(before);
		expect(updatedAt).toBeLessThanOrEqual(Date.now());
	});

	it("rejects methods other than POST with a 405 route error", async () => {
		const call = saveRoute.handler(routeContext({ method: "GET", input: editable, kv: fakeKv() }));
		await expect(call).rejects.toMatchObject({ status: 405 });
	});
});
