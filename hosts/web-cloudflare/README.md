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

## See Also

- [EmDash documentation](https://github.com/emdash-cms/emdash/tree/main/docs)
