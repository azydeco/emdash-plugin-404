import type { KVAccess, RouteContext } from "emdash";

/** In-memory `KVAccess` for tests. The KV store is the only boundary the routes touch. */
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
