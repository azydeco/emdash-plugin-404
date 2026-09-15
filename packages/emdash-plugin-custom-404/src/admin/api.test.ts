import { describe, expect, it } from "vitest";
import { defaultConfig } from "../config";
import { fakeFetch } from "../test-support";
import { createAdminApi, fieldErrorsFromDetails } from "./api";

const BASE = "/_emdash/api/plugins/custom-404";

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("createAdminApi loadConfig", () => {
	it("GETs the config route and unwraps the envelope", async () => {
		const fetchImpl = fakeFetch([json({ success: true, data: defaultConfig() })]);
		const result = await createAdminApi(fetchImpl).loadConfig();
		expect(fetchImpl.calls[0]).toMatchObject({ url: `${BASE}/config`, method: "GET" });
		expect(result).toEqual({ kind: "ok", data: defaultConfig() });
	});
});

describe("createAdminApi saveConfig", () => {
	const input = { ...defaultConfig(), version: undefined, updatedAt: undefined };

	it("POSTs the input as JSON to the save route", async () => {
		const saved = { ...defaultConfig(), updatedAt: "2026-09-15T10:00:00.000Z" };
		const fetchImpl = fakeFetch([json({ success: true, data: saved })]);
		const result = await createAdminApi(fetchImpl).saveConfig(defaultConfig());
		const call = fetchImpl.calls[0]!;
		expect(call).toMatchObject({ url: `${BASE}/save`, method: "POST" });
		expect(call.headers.get("content-type")).toBe("application/json");
		expect(JSON.parse(String(call.body))).toEqual(defaultConfig());
		expect(result).toEqual({ kind: "ok", data: saved });
	});

	it("reports a 400 VALIDATION_ERROR as validation with no fields, as the host sends it", async () => {
		const fetchImpl = fakeFetch([
			json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } }, 400),
		]);
		const result = await createAdminApi(fetchImpl).saveConfig(input);
		expect(result).toEqual({ kind: "validation", message: "Invalid request body", fields: {} });
	});

	it("maps field details onto fields when a host forwards them", async () => {
		const fetchImpl = fakeFetch([
			json(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Invalid request body",
						details: { _errors: [], headline: { _errors: ["Headline is required"] } },
					},
				},
				400,
			),
		]);
		const result = await createAdminApi(fetchImpl).saveConfig(input);
		expect(result).toEqual({
			kind: "validation",
			message: "Invalid request body",
			fields: { headline: "Headline is required" },
		});
	});

	it("treats a 400 with another code as a plain error", async () => {
		const fetchImpl = fakeFetch([json({ success: false, error: { code: "PLUGIN_ERROR", message: "Nope" } }, 400)]);
		const result = await createAdminApi(fetchImpl).saveConfig(input);
		expect(result).toEqual({ kind: "error", message: "Nope" });
	});

	it("does not report the CSRF 403 as a permission problem", async () => {
		const fetchImpl = fakeFetch([
			json({ success: false, error: { code: "CSRF_REJECTED", message: "Missing required header" } }, 403),
		]);
		const result = await createAdminApi(fetchImpl).saveConfig(input);
		expect(result).toEqual({ kind: "error", message: "Missing required header" });
	});

	it("reports a 403 as forbidden with the server's message", async () => {
		const fetchImpl = fakeFetch([
			json({ success: false, error: { code: "FORBIDDEN", message: "Permission denied" } }, 403),
		]);
		const result = await createAdminApi(fetchImpl).saveConfig(input);
		expect(result).toEqual({ kind: "forbidden", message: "Permission denied" });
	});

	it("reports a 401 as unauthenticated", async () => {
		const fetchImpl = fakeFetch([json({ success: false, error: { code: "UNAUTHORIZED", message: "Sign in" } }, 401)]);
		const result = await createAdminApi(fetchImpl).saveConfig(input);
		expect(result).toEqual({ kind: "unauthenticated", message: "Sign in" });
	});

	it("reports any other failure with the server's message", async () => {
		const fetchImpl = fakeFetch([json({ success: false, error: { code: "INTERNAL", message: "Boom" } }, 500)]);
		const result = await createAdminApi(fetchImpl).saveConfig(input);
		expect(result).toEqual({ kind: "error", message: "Boom" });
	});

	it("falls back to a generic message when the error body is not JSON", async () => {
		const fetchImpl = fakeFetch([new Response("<html>", { status: 502 })]);
		const result = await createAdminApi(fetchImpl).saveConfig(input);
		expect(result.kind).toBe("error");
		if (result.kind === "error") expect(result.message).toMatch(/502/);
	});

	it("reports a network failure as an error rather than throwing", async () => {
		const fetchImpl = fakeFetch([
			() => {
				throw new TypeError("Failed to fetch");
			},
		]);
		const result = await createAdminApi(fetchImpl).saveConfig(input);
		expect(result).toEqual({ kind: "error", message: "Failed to fetch" });
	});
});

describe("createAdminApi verifyUrl", () => {
	it("POSTs the URL and returns the verification result, including a failed one", async () => {
		const fetchImpl = fakeFetch([json({ success: true, data: { ok: false, reason: "Only https URLs are accepted" } })]);
		const result = await createAdminApi(fetchImpl).verifyUrl("http://x");
		expect(fetchImpl.calls[0]).toMatchObject({ url: `${BASE}/verify-url`, method: "POST" });
		expect(JSON.parse(String(fetchImpl.calls[0]!.body))).toEqual({ url: "http://x" });
		expect(result).toEqual({ kind: "ok", data: { ok: false, reason: "Only https URLs are accepted" } });
	});
});

describe("fieldErrorsFromDetails", () => {
	it("maps the host's formatted zod error tree onto form fields", () => {
		const details = {
			_errors: [],
			headline: { _errors: ["Headline is required"] },
			cta: { _errors: [], href: { _errors: ["CTA URL is required"] } },
			image: {
				_errors: [],
				alt: { _errors: ["Alt text is required"] },
				value: { _errors: [], src: { _errors: ["must be https"] } },
			},
		};
		expect(fieldErrorsFromDetails(details)).toEqual({
			headline: "Headline is required",
			ctaHref: "CTA URL is required",
			alt: "Alt text is required",
			externalUrl: "must be https",
		});
	});

	it("puts top-level and unknown-path errors on the form", () => {
		expect(fieldErrorsFromDetails({ _errors: ["bad"], mystery: { _errors: ["odd"] } })).toEqual({
			form: "bad",
		});
	});

	it("returns nothing for a non-object", () => {
		expect(fieldErrorsFromDetails("nope")).toEqual({});
		expect(fieldErrorsFromDetails(null)).toEqual({});
	});
});
