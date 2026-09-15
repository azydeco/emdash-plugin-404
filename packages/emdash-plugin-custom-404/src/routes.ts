import { PluginRouteError, type PluginRoute } from "emdash";
import { readConfig, saveInputSchema, writeConfig, type ConfigDocument } from "./config";

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
