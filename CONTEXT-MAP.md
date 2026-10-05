# Context Map

## Contexts

- [web-cloudflare](./hosts/web-cloudflare/CONTEXT.md): the Test site that plugins in `packages/*` are exercised against before release
- [Custom404 listing](./packages/emdash-plugin-custom-404-listing/CONTEXT.md): the sandboxed Listing plugin that represents the native Custom404 plugin in the EmDash Registry

## Relationships

- **Custom404 listing → Custom404**: the Listing plugin points readers to the Native plugin's npm package; it shares no code, settings or storage with it
- **web-cloudflare → packages**: the Test site links each plugin in via `workspace:*` and runs sandboxed ones through its Sandbox runner
