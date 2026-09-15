import type { KVAccess, RouteContext } from "emdash";
import type { FetchLike } from "./verify-url";

/**
 * In-memory `KVAccess` for tests. KV and `fetch` (see `fakeFetch`) are the
 * only boundaries the routes and the admin API touch.
 */
export function fakeKv(initial: Record<string, unknown> = {}): KVAccess {
	const store = new Map<string, unknown>(Object.entries(initial));
	return {
		async get<T>(key: string): Promise<T | null> {
			return store.has(key) ? (store.get(key) as T) : null;
		},
		async set(key, value) {
			store.set(key, value);
		},
		async delete(key) {
			return store.delete(key);
		},
		async list(prefix = "") {
			return [...store.entries()]
				.filter(([key]) => key.startsWith(prefix))
				.map(([key, value]) => ({ key, value }));
		},
	};
}

/**
 * Minimal `RouteContext` for driving a route handler directly. Only the
 * fields the handlers read are real: `kv`, `input`, and `request`. The rest
 * of `PluginContext` is not populated, which the cast makes explicit.
 */
export function routeContext<TInput>(opts: {
	method: string;
	input?: TInput;
	kv: KVAccess;
}): RouteContext<TInput> {
	const partial: Pick<RouteContext<TInput>, "kv" | "input" | "request"> = {
		kv: opts.kv,
		input: opts.input as TInput,
		request: new Request("https://internal/route", { method: opts.method }),
	};
	return partial as RouteContext<TInput>;
}

export type FetchCall = {
	url: string;
	method: string;
	headers: Headers;
	body: BodyInit | null | undefined;
	signal: AbortSignal | null | undefined;
};

/**
 * A fake `fetch` that answers each call from a queue of responses and records
 * what it was asked. A queued function receives the call, so a test can
 * inspect the abort signal or fail on demand. Running out of queued
 * responses is a test error, not a network one.
 */
export function fakeFetch(
	responses: Array<Response | ((call: FetchCall) => Response | Promise<Response>)>,
): FetchLike & { calls: FetchCall[] } {
	const calls: FetchCall[] = [];
	const impl = (async (input: string | URL, init?: RequestInit) => {
		const call: FetchCall = {
			url: String(input),
			method: init?.method ?? "GET",
			headers: new Headers(init?.headers),
			body: init?.body,
			signal: init?.signal,
		};
		calls.push(call);
		const next = responses.shift();
		if (!next) throw new Error(`fakeFetch: no response queued for ${call.method} ${call.url}`);
		return typeof next === "function" ? next(call) : next;
	}) as FetchLike & { calls: FetchCall[] };
	impl.calls = calls;
	return impl;
}
