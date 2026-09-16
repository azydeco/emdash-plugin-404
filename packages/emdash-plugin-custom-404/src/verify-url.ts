/**
 * Server-side check that an external URL really serves an image, so the
 * admin can store it with a verification timestamp (spec section 4.1).
 *
 * The check is deliberately shallow: at most two requests, no body decoding,
 * no scheduled re-check. It answers "does this https URL currently respond
 * with an image content type", nothing more.
 */

/** Default request timeout. Spec fixes it at 5 seconds. */
export const VERIFY_TIMEOUT_MS = 5000;

/**
 * The slice of `fetch` the verifier needs. Narrower than `typeof fetch` so
 * tests can pass a plain function; the real `fetch` is assignable to it.
 */
export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

/** Every way verification can fail, phrased for the admin to display. */
export type VerifyFailure = { ok: false; reason: string };

export type VerifyResult = { ok: true; contentType: string; verifiedAt: string } | VerifyFailure;

export interface VerifyOptions {
	/** Overrides `VERIFY_TIMEOUT_MS`. Tests use a short value to exercise the abort path. */
	timeoutMs?: number;
}

/**
 * Verify that `url` is https and serves an image.
 *
 * Issues a `HEAD` first. Some image hosts answer `HEAD` with 405 or omit
 * `content-type` on a successful `HEAD`, so in either case the check retries
 * with a one-byte ranged `GET` and discards the body. A failed `HEAD` (any
 * non-2xx other than 405) is final; a `GET` would only repeat it.
 *
 * The timeout is one budget for the whole check, so `HEAD` plus the `GET`
 * fallback together never exceed it. Redirects are followed by `fetch`, so
 * a hop over plain http is made before the final URL is rejected; that is
 * accepted for a verifier that never stores what it fetched.
 *
 * Failure is a value, not an exception: every reason the admin might show is
 * returned as `{ ok: false, reason }`.
 */
export async function verifyImageUrl(
	url: string,
	fetchImpl: FetchLike,
	options: VerifyOptions = {},
): Promise<VerifyResult> {
	const parsed = parseHttpsUrl(url);
	if (!parsed.ok) return parsed;

	const timeoutMs = options.timeoutMs ?? VERIFY_TIMEOUT_MS;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const send = (init: RequestInit) =>
		request(fetchImpl, parsed.url, init, controller.signal, timeoutMs);

	try {
		const head = await send({ method: "HEAD" });
		if (!head.ok) return head;

		let response = head.response;
		if (response.status === 405 || (response.ok && !response.headers.has("content-type"))) {
			const get = await send({ method: "GET", headers: { range: "bytes=0-0" } });
			if (!get.ok) return get;
			response = get.response;
			await response.body?.cancel();
		}

		return judge(response, parsed.url);
	} finally {
		clearTimeout(timer);
	}
}

function parseHttpsUrl(url: string): { ok: true; url: URL } | VerifyFailure {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return { ok: false, reason: "Enter a valid URL" };
	}
	if (parsed.protocol !== "https:") {
		return { ok: false, reason: "Only https URLs are accepted" };
	}
	return { ok: true, url: parsed };
}

type RequestOutcome = { ok: true; response: Response } | VerifyFailure;

/** One request on the shared abort signal. Network and abort errors become reasons. */
async function request(
	fetchImpl: FetchLike,
	url: URL,
	init: RequestInit,
	signal: AbortSignal,
	timeoutMs: number,
): Promise<RequestOutcome> {
	try {
		const response = await fetchImpl(url, { ...init, redirect: "follow", signal });
		return { ok: true, response };
	} catch (error) {
		if (signal.aborted) {
			return { ok: false, reason: `Timed out after ${timeoutMs / 1000} seconds` };
		}
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, reason: `Could not fetch ${url.host}: ${message}` };
	}
}

/**
 * Apply the acceptance rules to the final response: still https after
 * redirects, a 2xx status, and an `image/*` media type.
 *
 * A synthetic `Response` (and some fetch implementations) report an empty
 * `url`; that means no redirect happened, so the requested URL stands.
 */
function judge(response: Response, requested: URL): VerifyResult {
	const finalUrl = response.url === "" ? requested : new URL(response.url);
	if (finalUrl.protocol !== "https:") {
		return { ok: false, reason: "The URL redirects to a non-https address" };
	}
	if (!response.ok) {
		return { ok: false, reason: `The server answered ${response.status}` };
	}
	const header = response.headers.get("content-type");
	if (header === null) {
		return { ok: false, reason: "The server did not report a content-type" };
	}
	const contentType = mediaType(header);
	if (!contentType.startsWith("image/")) {
		return { ok: false, reason: `The URL is not an image (content-type ${contentType})` };
	}
	return { ok: true, contentType, verifiedAt: new Date().toISOString() };
}

/** `image/svg+xml; charset=utf-8` -> `image/svg+xml`. */
function mediaType(header: string): string {
	return header.split(";", 1)[0].trim().toLowerCase();
}
