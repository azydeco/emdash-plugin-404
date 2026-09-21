# EmDash Test Site (Cloudflare)

The Test site this monorepo uses to develop and exercise `packages/emdash-plugin-custom-404` against a real EmDash/Astro app. It runs locally only — it is not deployed to Cloudflare or anywhere else. Includes posts, pages, categories, and tags with minimal styling.

## What's Included

- Posts with category and tag archives
- Static pages via slug routing
- Seed data with demo content
- D1 database and R2 storage pre-configured
- Dark/light mode support

## Pages

| Page | Route |
|---|---|
| Homepage | `/` |
| All posts | `/posts` |
| Single post | `/posts/:slug` |
| Category archive | `/category/:slug` |
| Tag archive | `/tag/:slug` |
| Static pages | `/:slug` |
| 404 | fallback |

## Infrastructure

All of the below runs locally only, via Wrangler's emulation — this site is never deployed.

- **Runtime:** Cloudflare Workers
- **Database:** D1
- **Storage:** R2
- **Framework:** Astro with `@astrojs/cloudflare`

## Local Development

```bash
pnpm install
pnpm dev
```

### Admin login (dev only)

Passkeys work locally.
If, however, you use a password manager to manage your passkeys, you won't be able to use the passkey when trying to access the Chrome instance used to hit the debug points in VS Code because Chrome extensions Are disabled in that instance.   Two dev-only routes sign you in as `dev@emdash.local` (admin) instead:

- `/_emdash/api/auth/dev-bypass?content=0&redirect=/_emdash/admin` — just creates a session. Use this.
- `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` — the URL the Dev server prints. Also runs migrations and re-applies `seed/seed.json` on every visit. Only needed on an empty database.
- `content=0` on the setup route skips the seed's sample content (`?content=0&redirect=...`).
- Reference: the header comment of `emdash/src/astro/routes/api/setup/dev-bypass.ts`. No docs page lists the parameters.

## See Also

- [EmDash documentation](https://github.com/emdash-cms/emdash/tree/main/docs)
