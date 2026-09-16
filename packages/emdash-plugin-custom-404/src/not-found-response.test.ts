import { describe, expect, it } from "vitest";
import { markNotFound } from "./not-found-response";

describe("markNotFound", () => {
	it("sets status 404 and the two fixed headers, replacing any the site already set", () => {
		const response = { status: 200, headers: new Headers({ "Cache-Control": "no-store" }) };
		markNotFound(response);
		expect(response.status).toBe(404);
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
		expect(response.headers.get("Cache-Control")).toBe("public, max-age=60, s-maxage=300");
	});
});
