## Release checklist

Work through this list for every release of the Listing plugin. Each step is explained in more detail below. For the Native plugin's npm release, see [packaging.md](../emdash-plugin-custom-404/packaging.md) instead.

- [ ] The `azydeco` Atmosphere account exists, and `publisher` in `emdash-plugin.jsonc` is its DID, not the `did:plc:aaaaaaaaaaaaaaaaaaaaaaaa` placeholder (see [One-time setup](#one-time-setup)).
- [ ] The release changes are merged to `main`, and your local `main` is checked out, clean and up to date with `origin`.
- [ ] This release changes the listing or the Signpost page. If it doesn't, don't release (see [When to release](#when-to-release)).
- [ ] `version` is bumped in `packages/emdash-plugin-custom-404-listing/package.json`. Published versions can't be changed, so every publish needs a new version.
- [ ] No listing text states the Native plugin's version, and none of it suggests that installing from the Registry provides a custom 404 page.
- [ ] Listing screenshot 2, the Native plugin's admin editor, is in the manifest (first publish only; see [Listing screenshots](#listing-screenshots)).
- [ ] `pnpm test`, `pnpm lint` and `pnpm format:check` pass. Run them from the repo root.
- [ ] `validate` and `bundle` pass without warnings (see [Check the bundle](#check-the-bundle)).
- [ ] `whoami` shows the `azydeco` account as the active publisher.
- [ ] Published with `publish`, and the labeler has approved the release (see [Publish](#publish)).
- [ ] The Registry install smoke test passes in the Test site (see [Smoke test](#smoke-test)).
- [ ] The Native plugin's README links to the listing (first publish only; see [Link the listing from the Native plugin](#link-the-listing-from-the-native-plugin)).

## Where to run the commands

Unless a step says otherwise, **run every command in this guide from the Listing plugin's package directory**:

```bash
cd packages/emdash-plugin-custom-404-listing   # starting from the repo root
```

`emdash-plugin` reads `emdash-plugin.jsonc` from the current directory. The lint, format and test scripts are the exception. They are root scripts (see `CONTRIBUTING.md`), so run them from the repo root.

This package is `private` and is never published to npm. Don't run `pnpm publish` here; the Registry is its only channel.

## What gets published

The Registry shows the package profile and the release, both built from `emdash-plugin.jsonc`:

| Listing field            | Source                                                     |
| ------------------------ | ---------------------------------------------------------- |
| Name, tagline and About  | `name` and `description`                                   |
| Description section      | `listing/description.md`                                   |
| Installation section     | `listing/installation.md`                                  |
| Icon                     | `icon.png` (256×256 PNG)                                   |
| Screenshots              | `release.artifacts.screenshots`                            |
| Permissions              | `capabilities` and `allowedHosts` (both empty)             |
| Keywords, author, licence, security contact and repo | the matching manifest fields   |

The install consent dialog also lists the plugin's one public route, `screenshot`, which serves the Signpost page's image. [ADR 0001](../../packages/emdash-plugin-custom-404-listing/docs/adr/0001-registry-presence-via-listing-plugin.md) explains why the route exists.

Profile fields (name, description, keywords, sections, licence, author, security contact) are ignored after the first publish, because the existing profile wins. To change them later without a new release, use `emdash-plugin update-package`.

## One-time setup

Do this before the first publish:

1. Create the `azydeco` Atmosphere account and give it the `azydeco.com` handle. [atmosphere-account.md](atmosphere-account.md) walks through both.
2. Replace the placeholder `publisher` in `emdash-plugin.jsonc` with the account's DID. Prefer the DID to the handle, because the handle can change and the DID can't.
3. Log in:

   ```bash
   pnpm exec emdash-plugin login azydeco.com   # opens the provider's sign-in page in the browser
   pnpm exec emdash-plugin whoami              # shows the active publisher
   ```

   `login` uses AT Protocol OAuth, so EmDash never sees the password. If `whoami` lists more than one session, make the `azydeco` one active with `emdash-plugin switch`.

> [!CAUTION]
> The first publish ties the slug `emdash-plugin-custom-404` to the publisher's DID permanently. It can't be moved to another account or renamed afterwards. Check the `slug` and `publisher` before you run `publish` for the first time.

## Listing screenshots

Screenshot 1 is `assets/404_plugin.png`, a rendered Custom 404 page. The same file is embedded in the plugin and served by the `screenshot` route, so it lives in `assets/` rather than `screenshots/`: `bundle` packs `screenshots/*.png` automatically and would pack it twice. If you replace this PNG, run `pnpm embed-screenshot` to regenerate `src/screenshot.ts`. The unit tests fail until you do.

Before the first publish, add screenshot 2, the Native plugin's admin editor:

1. Start the Test site, log in to the admin and open the Custom 404 editor.
2. Capture it as a PNG, JPEG or WebP of at most 1 MiB.
3. Save it as `assets/admin-editor.png` (not in `screenshots/`, for the same reason as screenshot 1).
4. Add it after screenshot 1 in `emdash-plugin.jsonc`:

   ```jsonc
   "screenshots": [{ "file": "assets/404_plugin.png" }, { "file": "assets/admin-editor.png" }],
   ```

The Registry allows up to 8 screenshots.

## Check the bundle

```bash
pnpm exec emdash-plugin validate
pnpm exec emdash-plugin bundle
```

`validate` checks the manifest offline. `bundle` builds the plugin and writes the tarball it would publish to `dist/`, without uploading anything. Both should pass without warnings. In particular, `bundle` warns if `icon.png` isn't 256×256, and its output should list `Capabilities: (none)`.

The Registry's limits are 128 KB per bundled file, 256 KB per bundle, 20,000 bytes per section, 140 graphemes (roughly, characters) for the `description`, 5 keywords, and 1 MiB per listing image.

## Publish

```bash
pnpm exec emdash-plugin whoami   # confirms the azydeco account is the active publisher
pnpm exec emdash-plugin publish
```

`publish` rebuilds the bundle, uploads it and the listing images to the publisher's server, and creates the release record.

Published versions can't be changed. Don't use `--allow-overwrite`: labelers may treat a changed release as a takedown event. If something is wrong with a release, bump the version and publish again.

### Wait for the labeler

The listing doesn't appear at [plugins.emdashcms.com](https://plugins.emdashcms.com) until the Registry's labeler approves the release. The labeler rejects misleading claims, which is why every piece of listing text says the feature is installed from npm. `publish` prints a command to follow the checks:

```bash
pnpm exec emdash-plugin info azydeco.com emdash-plugin-custom-404 --version <version> --watch
```

Until the release is approved, `info` shows only the labeler's current checks.

## Smoke test

Once the listing is live, install it from the Registry into the Test site:

1. Remove `custom404Listing` from `sandboxed: []` in `hosts/web-cloudflare/astro.config.mjs`, so the Signpost page you check is the Registry copy, not the workspace one. Don't commit this change.
2. Start the Test site and log in to the admin.
3. Open the Registry, search for "Custom 404", and choose **Install**.
4. Check that the consent dialog lists no permissions apart from the one public `screenshot` route.
5. Open the "Custom 404" page in the admin sidebar. Check that the screenshot renders and that each link button opens the right page in a new tab.
6. Check that the Test site's 404 page is unchanged: visit a missing URL and confirm it still shows the Native plugin's page with a `404` status.

Then uninstall the Registry copy and restore `astro.config.mjs`.

## Link the listing from the Native plugin

After the first publish, add a "Find it in the Registry" link to `packages/emdash-plugin-custom-404/README.md`, pointing at the listing URL that `publish` printed. The README ships in the Native plugin's npm tarball, so the link reaches npm with its next release.

## When to release

The Listing plugin's version is independent of the Native plugin's. It starts at 0.1.0. Bump it only when the listing or the Signpost page changes:

- Release when the Signpost page, the icon or the screenshots change. They belong to the release, so they need a new version.
- Release when `capabilities`, `allowedHosts` or `storage` change. Installed sites consented to the old trust contract, so the change needs a new version.
- For a change to profile text only (`name`, `description`, `keywords` or the sections), run `pnpm exec emdash-plugin update-package` instead. It updates the published profile without a release, because `publish` ignores profile fields once the profile exists.
- Don't release for a Native plugin release. Nothing in the listing states the Native plugin's version, so it never needs updating to match.
