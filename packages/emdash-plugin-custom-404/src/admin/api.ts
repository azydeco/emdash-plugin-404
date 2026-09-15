/**
 * The admin page's view of the three plugin routes. Every outcome is a
 * value so the page can render each case; nothing here throws. The fetch
 * is injected so tests drive it without a browser or a host.
 */
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import type { ConfigDocument, SaveInput } from "../config";
import { PLUGIN_ID } from "../constants";
import type { FetchLike, VerifyResult } from "../verify-url";
import { fieldForPath, type FieldErrors } from "./form";

/** One call's result. `ok` carries the route's data; every other kind carries something to show. */
export type ApiOutcome<T> =
	| { kind: "ok"; data: T }
	| { kind: "validation"; message: string; fields: FieldErrors }
	| { kind: "forbidden"; message: string }
	| { kind: "unauthenticated"; message: string }
	| { kind: "error"; message: string };

/** The three routes the page calls, each returning an `ApiOutcome`. */
export interface AdminApi {
	loadConfig(): Promise<ApiOutcome<ConfigDocument>>;
	saveConfig(input: SaveInput): Promise<ApiOutcome<ConfigDocument>>;
	verifyUrl(url: string): Promise<ApiOutcome<VerifyResult>>;
}

const ROUTE_BASE = `/_emdash/api/plugins/${PLUGIN_ID}`;

/** Build the API over a fetch. Tests pass a fake; `adminApi` is the browser instance. */
export function createAdminApi(fetchImpl: FetchLike): AdminApi {
	const call = <T>(route: string, init?: RequestInit) => request<T>(fetchImpl, `${ROUTE_BASE}/${route}`, init);
	return {
		loadConfig: () => call<ConfigDocument>("config"),
		saveConfig: (input) => call<ConfigDocument>("save", postJson(input)),
		verifyUrl: (url) => call<VerifyResult>("verify-url", postJson({ url })),
	};
}

/** Production instance: `apiFetch` adds the `X-EmDash-Request` header non-public routes require. */
export const adminApi: AdminApi = createAdminApi(apiFetch);

function postJson(body: unknown): RequestInit {
	return {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	};
}

async function request<T>(fetchImpl: FetchLike, url: string, init?: RequestInit): Promise<ApiOutcome<T>> {
	let response: Response;
	try {
		response = await fetchImpl(url, init);
	} catch (error) {
		return { kind: "error", message: errorMessage(error) };
	}
	if (response.ok) {
		try {
			return { kind: "ok", data: await parseApiResponse<T>(response) };
		} catch (error) {
			return { kind: "error", message: errorMessage(error) };
		}
	}
	return classifyFailure(response);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Non-2xx responses carry `{ success: false, error: { code, message } }`.
 *
 * The route runner attaches zod's formatted issues as `error.details`, but
 * emdash 0.37.0's HTTP handler for plugin routes rebuilds the envelope with
 * only `code` and `message`, so `details` never reaches the browser. A
 * validation failure is therefore reported with whatever fields can be
 * read (none today; mapped if a later host forwards them) and the page
 * falls back to the shared schema to place the errors.
 *
 * A 403 is a permission failure unless it is the CSRF check, which only
 * fails when a caller bypasses `apiFetch`.
 */
async function classifyFailure<T>(response: Response): Promise<ApiOutcome<T>> {
	const error = await readErrorBody(response);
	const message = error?.message ?? `The server answered ${response.status}`;
	if (response.status === 401) return { kind: "unauthenticated", message };
	if (response.status === 403 && error?.code !== "CSRF_REJECTED") return { kind: "forbidden", message };
	if (response.status === 400 && error?.code === "VALIDATION_ERROR") {
		return { kind: "validation", message, fields: fieldErrorsFromDetails(error.details) };
	}
	return { kind: "error", message };
}

type ErrorBody = { code?: string; message?: string; details?: unknown };

async function readErrorBody(response: Response): Promise<ErrorBody | null> {
	try {
		const body: unknown = await response.json();
		if (typeof body !== "object" || body === null || !("error" in body)) return null;
		const error = (body as { error: unknown }).error;
		if (typeof error !== "object" || error === null) return null;
		const { code, message, details } = error as { code?: unknown; message?: unknown; details?: unknown };
		return {
			code: typeof code === "string" ? code : undefined,
			message: typeof message === "string" ? message : undefined,
			details,
		};
	} catch {
		return null;
	}
}

/**
 * Turn the host's `VALIDATION_ERROR.details` (zod's `formatError` tree:
 * `{ _errors: string[], <key>: <subtree> }`) into field errors. The first
 * message per field wins. Unknown keys fall to `form` only when they carry
 * a message at the top level; nested unknown paths are dropped, since the
 * form has nowhere honest to show them.
 */
export function fieldErrorsFromDetails(details: unknown): FieldErrors {
	const errors: FieldErrors = {};
	walkFormatted(details, [], (path, message) => {
		const field = fieldForPath(path);
		if (field === "form" && path.length > 0) return;
		errors[field] ??= message;
	});
	return errors;
}

function walkFormatted(node: unknown, path: string[], visit: (path: string[], message: string) => void): void {
	if (typeof node !== "object" || node === null) return;
	const record = node as Record<string, unknown>;
	const own = record._errors;
	if (Array.isArray(own) && typeof own[0] === "string") visit(path, own[0]);
	for (const [key, child] of Object.entries(record)) {
		if (key !== "_errors") walkFormatted(child, [...path, key], visit);
	}
}
