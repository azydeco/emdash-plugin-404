## References

- [Publishing plugins](https://docs.emdashcms.com/plugins/creating-plugins/publishing/): the EmDash guide to Atmosphere accounts, `emdash-plugin login`, and `publish`.
- [Automated plugin releases](https://docs.emdashcms.com/plugins/creating-plugins/delegated-releases/): publishing from GitHub Actions with `emdash-plugin release setup`.
- [atmosphereaccount.com](https://atmosphereaccount.com): a list of Atmosphere account providers.
- [AT Protocol handles](https://atproto.com/specs/handle): how a domain handle is verified with a DNS `TXT` record or `/.well-known/atproto-did`.
- [AT Protocol DIDs](https://atproto.com/specs/did) and the [PLC directory](https://web.plc.directory): the permanent account identifier that `publisher` pins.
- [Bluesky: custom domain handles](https://bsky.social/about/blog/4-28-2023-domain-handle-tutorial): a step-by-step guide to switching a Bluesky handle to your own domain.
- [publishing.md](../../hosts/web-node/.agents/skills/creating-plugins/references/publishing.md): the plugin CLI's publishing reference, vendored in this repo.
- [publishing.md](publishing.md): the Listing plugin's publishing checklist, which starts from this setup.
- [Ticket 05](../../.scratch/custom-404-listing/issues/05-first-registry-publish-and-smoke-test.md): the first Registry publish, which this setup unblocks.

## Setting up the Atmosphere account

An Atmosphere account is a standard AT Protocol account, the same kind of identity Bluesky uses. The EmDash Registry has no separate signup or approval step. Once the account exists, you log in with the plugin CLI, and the account becomes the publisher of the Listing plugin.

### 1. Create the account

Create the account with any provider:

- **Bluesky** ([bsky.app](https://bsky.app)): the quickest route. It gives you a handle like `azydeco.bsky.social`, hosted on Bluesky's server.
- **A community provider**, from [atmosphereaccount.com](https://atmosphereaccount.com).
- **Self-hosted**: you run your own server. This gives full control, but it's more to operate.

Bluesky is the recommended route. Sign up with a shared company mailbox, not a personal address, because this account owns the plugin permanently.

### 2. Use `azydeco.com` as the handle

A domain handle shows the publisher as `@azydeco.com` rather than `@azydeco.bsky.social`. In Bluesky, open **Settings → Account → Handle → I have my own domain**. It gives you a DNS record to add to the `azydeco.com` zone:

| Type  | Name                   | Value            |
| ----- | ---------------------- | ---------------- |
| `TXT` | `_atproto.azydeco.com` | `did=did:plc:…` |

After the record is verified, the handle becomes `azydeco.com`. You can change the handle later. The Registry ties the plugin to the account's **DID**, which never changes, not to the handle.

### 3. Set `publisher` in the manifest

`packages/emdash-plugin-custom-404-listing/emdash-plugin.jsonc` has a placeholder `publisher` (`did:plc:aaaaaaaaaaaaaaaaaaaaaaaa`). Replace it with the account's DID. Prefer the DID to the handle, because the DID never changes.

The DID is the `did=` value in the DNS record from step 2. You can also resolve it from the handle:

```bash
curl 'https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=azydeco.com'
```

### 4. Log in and validate

Run these from `packages/emdash-plugin-custom-404-listing`:

```bash
pnpm exec emdash-plugin login azydeco.com   # opens the provider's sign-in page in the browser
pnpm exec emdash-plugin validate
```

`login` uses AT Protocol OAuth, so EmDash never sees the password.

> [!CAUTION]
> Don't run `publish` yet. It can't be undone: the first publish ties the slug `emdash-plugin-custom-404` to this DID permanently. We need to make sure we have all details correct first 

## Decisions to make before creating the account

- **Who controls the account.** The `publisher` account owns every future release. Decide whether a named person or a shared company login holds it, and where its credentials are kept.
- **Automated releases (optional).** `emdash-plugin release setup` generates a GitHub Actions workflow that publishes without stored secrets. On its first run, the publisher account approves the `azydeco/emdash-plugin-404` repository in the release dashboard. See [Automated plugin releases](https://docs.emdashcms.com/plugins/creating-plugins/delegated-releases/).
