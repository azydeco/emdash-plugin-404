# Changelog

All notable changes to `@azydeco/emdash-plugin-custom-404` are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While it is pre-1.0, a breaking change is a minor bump.

## [0.2.1] - 2026-09-29

### Fixed

- `Custom404`'s layout styles no longer outrank a site's own overrides. Astro's default scoping added a `[data-astro-cid-*]` attribute to every rule, so a plain class override such as `.custom-404-page { gap: … }` lost on specificity. The rules are now global and wrapped in `:where()`, giving them zero specificity.

### Changed

- The README's "Styling the rendered page" section states that the plugin's layout rules have zero specificity.

## [0.2.0] - 2026-09-29

### Changed

- **Breaking:** the peer dependency floors for `emdash` and `@emdash-cms/admin` are raised from `>=0.37.0` to `>=1.0.0`. Earlier EmDash versions may still work but are no longer tested.
- The README is updated for EmDash v1. It drops the note about the deprecated EmDash Marketplace and the stale `usePluginAPI` note, and the styling example is now a plain `<style>` block.

## [0.1.1] - 2026-09-28

### Added

- A "Styling the rendered page" section in the README. It documents the `custom-404-page__*` class surface, explains why a host's scoped `<style>` needs `:global(...)` to reach it, and gives a reference block that touches every class.

## [0.1.0] - 2026-09-28

### Added

- First release: a native EmDash plugin that lets editors configure the site's 404 page from the admin and serves it with a genuine 404 status.
- Admin configuration page with headline, body, a single CTA, an optional image from the Media Library or an external URL, and image placement (`above`, `below`, `left`, `right`).
- Config and save routes, with the config document stored in KV and validated by a schema.
- Server-side verification of external image URLs at save time (`https:` only, `image/*` content type).
- `Custom404` Astro component and `markNotFound` helper, exported from `@azydeco/emdash-plugin-custom-404/astro`.

[0.2.1]: https://www.npmjs.com/package/@azydeco/emdash-plugin-custom-404/v/0.2.1
[0.2.0]: https://www.npmjs.com/package/@azydeco/emdash-plugin-custom-404/v/0.2.0
[0.1.1]: https://www.npmjs.com/package/@azydeco/emdash-plugin-custom-404/v/0.1.1
[0.1.0]: https://www.npmjs.com/package/@azydeco/emdash-plugin-custom-404/v/0.1.0
