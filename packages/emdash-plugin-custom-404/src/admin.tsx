/**
 * Admin entry. Loaded in the browser by the EmDash admin bundle.
 * Page components receive no props. Pages are keyed by the `path` declared
 * in the descriptor's `adminPages`.
 */
export function Custom404Admin() {
	return (
		<div>
			<h1>Custom 404</h1>
			<p>Configuration for the site's 404 page will appear here.</p>
		</div>
	);
}

export const pages = {
	"/": Custom404Admin,
};
