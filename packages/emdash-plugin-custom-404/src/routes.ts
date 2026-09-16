import { PluginRouteError, type PluginRoute } from "emdash";
import { z } from "zod";

import { readConfig, saveInputSchema, writeConfig, type ConfigDocument } from "./config";
import { verifyImageUrl, type FetchLike, type VerifyResult } from "./verify-url";

/**
 * EmDash dispatches every HTTP method to a named route, so each handler
 * enforces its own method. A thrown `Response` would surface as a 500;
 * `PluginRouteError` is the only way to pick the status.
 */
function requireMethod(request: Request, method: string): void {
	if (request.method.toUpperCase() !== method) {
		throw new PluginRouteError("METHOD_NOT_ALLOWED", `Use ${method} for this route`, 405);
	}
}

/**
 * `GET /_emdash/api/plugins/custom-404/config`
 *
 * Public: the 404 page reads it on anonymous requests via in-process
 * dispatch, and it contains nothing secret. Returns the default document
 * until an editor saves one.
 */
export const configRoute: PluginRoute = {
	public: true,
	handler: async (ctx): Promise<ConfigDocument> => {
		requireMethod(ctx.request, "GET");
		return readConfig(ctx.kv);
	},
};

/**
 * `POST /_emdash/api/plugins/custom-404/save`
 *
 * Editors hold `content:edit_any`; the default `plugins:manage` would make
 * the page admin-only. The host validates the body against `input` before
 * dispatch and passes it as `ctx.input`; the parse here only narrows the
 * type (the route map is typed with `unknown` input) and cannot fail on a
 * host-dispatched call.
 *
 * `version` and `updatedAt` are stamped server-side and cannot be supplied
 * by the client. `image.verifiedAt` is client-supplied by design: the admin
 * obtains it from the `verify-url` route and stores it through this one.
 */
export const saveRoute: PluginRoute = {
	permission: "content:edit_any",
	input: saveInputSchema,
	handler: async (ctx): Promise<ConfigDocument> => {
		requireMethod(ctx.request, "POST");
		return writeConfig(ctx.kv, saveInputSchema.parse(ctx.input));
	},
};

export const verifyUrlInputSchema = z.object({ url: z.string() });

/**
 * `POST /_emdash/api/plugins/custom-404/verify-url`
 *
 * Fetches an external image URL server-side and returns the verification
 * result. A failed verification is a normal 200 result with `ok: false` and
 * a reason the admin can show; only a wrong method is a route error.
 *
 * Native plugins run in-process, so the handler uses plain `fetch` rather
 * than `ctx.http` (which is host-allowlisted and would need every image
 * host declared up front). The descriptor still lists `network:request` so
 * the outbound call is documented. The factory exists so tests can inject a
 * fake fetch; `verifyUrlRoute` is the production instance.
 */
export function createVerifyUrlRoute(fetchImpl: FetchLike): PluginRoute {
	return {
		permission: "content:edit_any",
		input: verifyUrlInputSchema,
		handler: async (ctx): Promise<VerifyResult> => {
			requireMethod(ctx.request, "POST");
			const { url } = verifyUrlInputSchema.parse(ctx.input);
			return verifyImageUrl(url, fetchImpl);
		},
	};
}

export const verifyUrlRoute = createVerifyUrlRoute((input, init) => fetch(input, init));
