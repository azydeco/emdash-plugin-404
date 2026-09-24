# EmDash Test Site (Cloudflare)

The Test site this monorepo uses to develop and exercise `packages/emdash-plugin-custom-404` against a real EmDash/Astro app. It runs locally only — it is not deployed to Cloudflare or anywhere else. Includes posts, pages, categories, and tags with minimal styling.

## What's Included

- Posts with category and tag archives
- Static pages via slug routing
- Seed data with demo content
- D1 database and R2 storage pre-configured
- Dark/light mode support


## What's Included

- Featured post hero on the homepage
- Post archive with reading time estimates
- Category and tag archives
- Full-text search
- RSS feed
- SEO metadata and JSON-LD
- Dark/light mode
- Forms plugin and webhook notifier

## Pages

| Page | Route |
|---|---|
| Homepage | `/` |
| All posts | `/posts` |
| Single post | `/posts/:slug` |
| Category archive | `/category/:slug` |
| Tag archive | `/tag/:slug` |
| Search | `/search` |
| Static pages | `/pages/:slug` |
| 404 | `404 plugin renderer` and fallback  |

## Screenshots

| | Desktop | Mobile |
|---|---|---|
| Light | ![homepage light desktop](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-light-desktop.jpg) | ![homepage light mobile](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-light-mobile.jpg) |
| Dark | ![homepage dark desktop](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-dark-desktop.jpg) | ![homepage dark mobile](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-dark-mobile.jpg) |

## Infrastructure

- **Runtime:** Cloudflare Workers
- **Database:** D1
- **Storage:** R2
- **Framework:** Astro with `@astrojs/cloudflare`

## Local Development

```bash
pnpm install
cp .env.example .env
npx emdash secrets generate  # paste the printed key into .env
pnpm dev
```

### Admin login (dev only)

**Note:** if you get the following error when using the dev bypass url ```{"success":false,"error":{"code":"DEV_BYPASS_ERROR","message":"Dev bypass failed"}}  ```  check if you have deleted a page in the cms, the seed is trying to re-create the page but the entry still exists in the db but with the same file hash, is a known issue [emdash-cms/emdash#1814](https://github.com/emdash-cms/emdash/pull/1814)

Passkeys work locally.
If, however, you use a password manager to manage your passkeys, you won't be able to use the passkey when trying to access the Chrome instance used to hit the debug points in VS Code because Chrome extensions Are disabled in that instance.   Two dev-only routes sign you in as `dev@emdash.local` (admin) instead:

- `_emdash/api/auth/dev-bypass?redirect=/_emdash/admin/plugins/custom-404/` — just creates a session. Use this.
- `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` — the URL the Dev server prints. Also runs migrations and re-applies `seed/seed.json` on every visit. Only needed on an empty database.
- `content=0` on the setup route skips the seed's sample content (`?content=0&redirect=...`).





## See Also

- [EmDash documentation](https://github.com/emdash-cms/emdash/tree/main/docs)