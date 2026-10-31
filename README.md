# KEEN ERP frontend

React, Vite, and TypeScript PWA. This folder is self-contained and can be deployed directly from its own GitHub repository.

## Local development

Use Node.js 22.12+ within the Node 22 release line.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Start the backend separately on port 8080. The development server proxies `/api` requests to the backend. Open `http://localhost:5173`.

Validate the production bundle:

```powershell
npm run build
```

## Vercel deployment

1. Push this folder's repository to GitHub, including `package-lock.json`, `src/`, `public/`, the Vite/TypeScript configuration, and `vercel.json`.
2. Import the frontend repository into Vercel. Leave Root Directory at the repository root (`.`). If deploying from a combined repository that contains both folders, select `frontend` instead.
3. Choose Vite. `vercel.json` sets `npm ci` as the install command, `npm run build` as the build command, and `dist` as the output directory. `package.json` selects Node 22.
4. Add the Production environment variable:

   ```text
   VITE_API_BASE_URL=https://your-backend.onrender.com
   ```

   Use the Render backend origin without `/api` or a trailing slash. Add it to Preview separately if previews should call that backend.

5. Deploy. Update `FASHIONPOS_CORS_ALLOWED_ORIGINS` in Render to the exact Vercel frontend origin.
6. Verify sign-in, a protected screen, and a refresh on a nested route such as `/settings`. The SPA rewrite in `vercel.json` serves `index.html` for application routes.

Vite embeds `VITE_` values in the public JavaScript at build time. Keep database passwords, admin passwords, email-provider keys, and M-Pesa secrets exclusively on Render. Redeploy the frontend after changing the API URL in Vercel.

The backend uses session cookies and CSRF protection. Keep its production cookie settings at `Secure=true` and `SameSite=None`. For browsers that block third-party cookies, use `pos.example.com` and `api.example.com` under the same owned domain.

## GitHub contents

An earlier version of `e2e/phase0-smoke.spec.ts` contained a password that matched a local login credential. The current test uses `E2E_ADMIN_PASSWORD` with a mock-only default. Rotate the affected login password before deployment. For a new GitHub upload, use the prepared `github-ready/frontend` snapshot with a fresh Git repository, so the old Git history is excluded.

Commit source, public assets, font licenses, tests, configuration, `package-lock.json`, and the placeholder-only `.env.example`. Git excludes real environment files, hosting CLI state, credentials, `node_modules/`, built bundles, logs, browser-test reports, and local editor files. `.vercelignore` and `.dockerignore` also exclude local files from deployment uploads/build contexts.

Review before committing:

If this is a clean upload snapshot, first create a fresh repository with `git init -b main`. Follow the upload folder's top-level README to set a new GitHub remote.

```powershell
git status --short
git ls-files -ci --exclude-standard
git add --dry-run --all
```

The second command should print nothing. Use Git to commit and push; GitHub's browser uploader does not apply `.gitignore`. Secrets already committed require rotation and history cleanup before publishing.

See [Vite deployment on Vercel](https://vercel.com/docs/frameworks/frontend/vite).
