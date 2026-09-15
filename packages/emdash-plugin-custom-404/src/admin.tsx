/**
 * Admin entry. Loaded in the browser by the EmDash admin bundle.
 * Page components receive no props. Pages are keyed by the `path` declared
 * in the descriptor's `adminPages`.
 */
import { Custom404Admin } from "./admin/Custom404Admin";

export { Custom404Admin };

export const pages = {
	"/": Custom404Admin,
};
