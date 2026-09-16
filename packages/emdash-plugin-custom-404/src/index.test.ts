import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createPlugin, custom404Plugin } from "./index";

const packageJson = z
	.object({ name: z.string(), version: z.string(), exports: z.record(z.string(), z.string()) })
	.parse(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")));

describe("custom404Plugin descriptor", () => {
	const descriptor = custom404Plugin();

	it("declares the identity the spec fixes", () => {
		expect(descriptor.id).toBe("custom-404");
		expect(descriptor.format).toBe("native");
		expect(descriptor.entrypoint).toBe(packageJson.name);
	});

	it("keeps its version in step with package.json", () => {
		expect(descriptor.version).toBe(packageJson.version);
	});

	it("points adminEntry and componentsEntry at exports the package actually has", () => {
		expect(descriptor.adminEntry).toBe(`${packageJson.name}/admin`);
		expect(descriptor.componentsEntry).toBe(`${packageJson.name}/astro`);
		expect(packageJson.exports["./admin"]).toBeDefined();
		expect(packageJson.exports["./astro"]).toBeDefined();
	});

	it("declares one admin page at the root path", () => {
		expect(descriptor.adminPages).toEqual([{ path: "/", label: "Custom 404" }]);
	});

	it("documents the outbound fetch the verify-url route makes", () => {
		expect(descriptor.capabilities).toEqual(["network:request"]);
	});

	it("is plain data that survives JSON serialisation", () => {
		expect(JSON.parse(JSON.stringify(descriptor))).toEqual(descriptor);
	});
});

describe("createPlugin", () => {
	const plugin = createPlugin();
	const descriptor = custom404Plugin();

	it("resolves with the same id and version as the descriptor", () => {
		expect(plugin.id).toBe(descriptor.id);
		expect(plugin.version).toBe(descriptor.version);
	});

	it("declares the same admin entry and pages as the descriptor", () => {
		expect(plugin.admin.entry).toBe(descriptor.adminEntry);
		expect(plugin.admin.pages).toEqual(descriptor.adminPages);
	});

	it("exposes the config, save and verify-url routes", () => {
		expect(new Set(Object.keys(plugin.routes))).toEqual(new Set(["config", "save", "verify-url"]));
	});
});
