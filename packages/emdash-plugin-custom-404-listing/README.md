# Custom 404 (Registry listing)

The sandboxed **Listing plugin** that gives [Custom 404](../emdash-plugin-custom-404) a presence in the [EmDash Registry](https://plugins.emdashcms.com). Custom 404 is a native plugin, and the Registry lists sandboxed plugins only. See [CONTEXT.md](CONTEXT.md) for the vocabulary.

Installing it adds one admin page, the **Signpost page**, which explains what Custom 404 is and links to the native plugin on npm. It has no hooks, declares no capabilities, and shares no code, settings or storage with the native plugin.

This package is `private` and never published to npm. It reaches sites through the Registry only.

## Develop

Run from the repo root:

```sh
pnpm --filter @azydeco/emdash-plugin-custom-404-listing test       # emdash-plugin validate, then vitest
pnpm --filter @azydeco/emdash-plugin-custom-404-listing typecheck
pnpm --filter @azydeco/emdash-plugin-custom-404-listing build      # writes dist/
```

The Test site lists it in `sandboxed: []` and loads the built `dist/` descriptor, so build before starting the Dev server. The root `pnpm dev` runs `emdash-plugin dev`, which rebuilds on save.

## Publish

The listing is published to the Registry with `emdash-plugin publish`. Follow the checklist in [docs/emdash-plugin-custom-404-listing/publishing.md](../../docs/emdash-plugin-custom-404-listing/publishing.md). [ADR 0001](docs/adr/0001-registry-presence-via-listing-plugin.md) records why this package exists.

The listing's text lives in `emdash-plugin.jsonc` and `listing/*.md`; its icon is `icon.png` and its screenshot is `assets/404_plugin.png`. That PNG is also embedded in `src/screenshot.ts` for the Signpost page's image route, so run `pnpm embed-screenshot` after replacing it.

## Versioning

The version in `package.json` is independent of the native plugin's and starts at 0.1.0. Bump it only when the listing or the Signpost page changes. Nothing in this package states the native plugin's version, so a native release never needs a listing release.

The manifest slug, `emdash-plugin-custom-404`, is permanent once published. Bump the version whenever `capabilities`, `allowedHosts` or `storage` change, because installed sites consented to the old trust contract.
