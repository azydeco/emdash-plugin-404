import { assert, describe, expect, it, vi } from "vitest";

import { fakeFetch, type FetchCall } from "./test-support";
import { verifyImageUrl, VERIFY_TIMEOUT_MS } from "./verify-url";

/**
 * A string body would make `Response` add `content-type: text/plain` on its
 * own, so the body is a byte, which sets no header. A `finalUrl` overrides
 * the response's `url` to simulate a redirect (synthetic Responses have an
 * empty `url`).
 */
function response(status: number, contentType?: string, finalUrl?: string): Response {
	const headers: Record<string, string> =
		contentType === undefined ? {} : { "content-type": contentType };
	const body = status === 204 || status === 304 ? null : new Uint8Array([0]);
	const res = new Response(body, { status, headers });
	if (finalUrl !== undefined) Object.defineProperty(res, "url", { value: finalUrl });
	return res;
}

const IMAGE_URL = "https://cdn.example.com/hero.png";

describe("verifyImageUrl: URL shape", () => {
	it("rejects a string that does not parse as a URL", async () => {
		const fetch = fakeFetch([]);
		const result = await verifyImageUrl("not a url", fetch);
		expect(result).toEqual({ ok: false, reason: expect.stringMatching(/valid/i) });
		expect(fetch.calls).toHaveLength(0);
	});

	it("rejects http without fetching", async () => {
		const fetch = fakeFetch([]);
		const result = await verifyImageUrl("http://cdn.example.com/hero.png", fetch);
		expect(result).toEqual({ ok: false, reason: expect.stringMatching(/https/i) });
		expect(fetch.calls).toHaveLength(0);
	});

	it("rejects other schemes without fetching", async () => {
		const fetch = fakeFetch([]);
		const result = await verifyImageUrl("ftp://cdn.example.com/hero.png", fetch);
		expect(result).toMatchObject({ ok: false });
		expect(fetch.calls).toHaveLength(0);
	});
});

describe("verifyImageUrl: HEAD path", () => {
	it("accepts a 2xx image response and stamps verifiedAt", async () => {
		const before = Date.now();
		const fetch = fakeFetch([response(200, "image/png")]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);

		expect(result).toMatchObject({ ok: true, contentType: "image/png" });
		expect(fetch.calls).toHaveLength(1);
		expect(fetch.calls[0]).toMatchObject({ url: IMAGE_URL, method: "HEAD" });
		assert(result.ok);
		const verifiedAt = Date.parse(result.verifiedAt);
		expect(verifiedAt).toBeGreaterThanOrEqual(before);
		expect(verifiedAt).toBeLessThanOrEqual(Date.now());
	});

	it("passes an abort signal so the request can time out", async () => {
		const fetch = fakeFetch([response(200, "image/png")]);
		await verifyImageUrl(IMAGE_URL, fetch);
		expect(fetch.calls[0]?.signal).toBeInstanceOf(AbortSignal);
	});

	it("keeps only the media type from a content-type with parameters", async () => {
		const fetch = fakeFetch([response(200, "image/svg+xml; charset=utf-8")]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);
		expect(result).toMatchObject({ ok: true, contentType: "image/svg+xml" });
	});

	it("rejects a 2xx response whose content-type is not an image", async () => {
		const fetch = fakeFetch([response(200, "text/html; charset=utf-8")]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);
		expect(result).toEqual({ ok: false, reason: expect.stringContaining("text/html") });
		expect(fetch.calls).toHaveLength(1);
	});

	it("rejects a non-2xx response without retrying", async () => {
		const fetch = fakeFetch([response(404, "image/png")]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);
		expect(result).toEqual({ ok: false, reason: expect.stringContaining("404") });
		expect(fetch.calls).toHaveLength(1);
	});

	it("rejects when a redirect lands on a non-https URL", async () => {
		const fetch = fakeFetch([response(200, "image/png", "http://cdn.example.com/hero.png")]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);
		expect(result).toEqual({ ok: false, reason: expect.stringMatching(/https/i) });
	});

	it("accepts when a redirect lands on another https URL", async () => {
		const fetch = fakeFetch([response(200, "image/webp", "https://img.example.net/hero.webp")]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);
		expect(result).toMatchObject({ ok: true, contentType: "image/webp" });
	});
});

describe("verifyImageUrl: ranged GET fallback", () => {
	it("retries with a one-byte ranged GET when HEAD answers 405", async () => {
		const fetch = fakeFetch([response(405), response(206, "image/jpeg")]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);

		expect(result).toMatchObject({ ok: true, contentType: "image/jpeg" });
		expect(fetch.calls).toHaveLength(2);
		expect(fetch.calls[1]).toMatchObject({ url: IMAGE_URL, method: "GET" });
		expect(fetch.calls[1]?.headers.get("range")).toBe("bytes=0-0");
	});

	it("retries with a ranged GET when HEAD omits content-type", async () => {
		const fetch = fakeFetch([response(200), response(200, "image/gif")]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);
		expect(result).toMatchObject({ ok: true, contentType: "image/gif" });
		expect(fetch.calls.map((c) => c.method)).toEqual(["HEAD", "GET"]);
	});

	it("discards the GET body", async () => {
		const get = response(200, "image/gif");
		const fetch = fakeFetch([response(405), get]);
		await verifyImageUrl(IMAGE_URL, fetch);
		expect(get.bodyUsed || get.body === null).toBe(true);
	});

	it("rejects when the GET fallback is not an image either", async () => {
		const fetch = fakeFetch([response(405), response(200, "application/json")]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);
		expect(result).toEqual({ ok: false, reason: expect.stringContaining("application/json") });
	});

	it("does not retry when a failed HEAD omits content-type", async () => {
		const fetch = fakeFetch([response(404)]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);
		expect(result).toEqual({ ok: false, reason: expect.stringContaining("404") });
		expect(fetch.calls).toHaveLength(1);
	});

	it("rejects when neither HEAD nor GET reports a content-type", async () => {
		const fetch = fakeFetch([response(200), response(200)]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);
		expect(result).toEqual({ ok: false, reason: expect.stringMatching(/content-type/i) });
	});
});

/** A fetch that only settles when its abort signal fires, as a real fetch does. */
function hangUntilAborted(call: FetchCall): Promise<Response> {
	return new Promise<Response>((_, reject) => {
		call.signal?.addEventListener("abort", () =>
			reject(new DOMException("The operation was aborted", "AbortError")),
		);
	});
}

describe("verifyImageUrl: failures", () => {
	it("rejects with a timeout reason when the server does not answer in time", async () => {
		const fetch = fakeFetch([hangUntilAborted]);
		const result = await verifyImageUrl(IMAGE_URL, fetch, { timeoutMs: 10 });
		expect(result).toEqual({ ok: false, reason: expect.stringMatching(/timed out/i) });
	});

	it("shares one timeout budget between HEAD and the GET fallback", async () => {
		vi.useFakeTimers();
		try {
			const fetch = fakeFetch([
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 3000));
					return response(405);
				},
				hangUntilAborted,
			]);
			const pending = verifyImageUrl(IMAGE_URL, fetch);
			await vi.advanceTimersByTimeAsync(VERIFY_TIMEOUT_MS);
			const result = await pending;

			expect(result).toEqual({ ok: false, reason: expect.stringMatching(/timed out/i) });
			expect(fetch.calls.map((c) => c.method)).toEqual(["HEAD", "GET"]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("defaults the timeout to 5 seconds", () => {
		expect(VERIFY_TIMEOUT_MS).toBe(5000);
	});

	it("rejects with the network error message when fetch throws", async () => {
		const fetch = fakeFetch([
			() => {
				throw new TypeError("getaddrinfo ENOTFOUND cdn.example.com");
			},
		]);
		const result = await verifyImageUrl(IMAGE_URL, fetch);
		expect(result).toEqual({ ok: false, reason: expect.stringContaining("ENOTFOUND") });
	});
});
