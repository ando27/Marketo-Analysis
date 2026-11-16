# Marketo Auditor

Upload a Marketo email performance export (CSV or Excel) to filter it, audit it against your benchmarks, compare segments, chart trends and export the results.

Everything runs in your browser. Your file is never uploaded or stored anywhere.

## Live app

- GitHub Pages: https://ando27.github.io/Marketo-Analysis/
- Vercel: deployed automatically from `main`

## Run it locally

```bash
npm install
```

```bash
npm run dev
```

Other commands:

- `npm run build` builds the app into `dist/`
- `npm run lint` checks the code
- `npm run preview` serves the built app locally

## Deployment

Every push to `main` deploys to both places:

- **Vercel** builds with the app at the site root (`/`).
- **GitHub Pages** is built by `.github/workflows/deploy-pages.yml`. It sets `GITHUB_PAGES=true`, which makes `vite.config.js` build for the `/Marketo-Analysis/` subpath.

For the GitHub Pages deploy to work, the repository's **Settings → Pages → Source** must be set to **GitHub Actions** (a one-time setting).

To try the GitHub Pages build locally:

```bash
GITHUB_PAGES=true npm run build && GITHUB_PAGES=true npm run preview
```

Built with React, Vite and Tailwind CSS.
