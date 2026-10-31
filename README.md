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

## Shops and warehouses

Sign in as an administrator, then open **Apps > Administration > Shops & warehouses** (or `/branches`). Settings also includes a shortcut.

Enter the location name, a unique code, timezone, and status, then select **Save location**. Active locations become available in the business branch selector. Use **Users** to assign staff to the locations they should access.

The list supports search, status filtering, editing, deactivation, and reactivation. Deactivating a location removes it from active choices while keeping its history. Locations are saved through the existing backend branch API; this screen does not introduce a separate Shop/Warehouse classification.

## Product photos

In **Products → New Product**, use **Product photo** to choose a JPG, PNG or WebP image from your device (up to 10 MB). The form shows a preview and automatically resizes the photo before saving it with the product. The same picker in **Edit Product** replaces an existing photo; **Remove photo** clears it. Product photos are included with the saved catalogue for offline use after preparation.

## Offline work

Deploy the backend with migration V34 before this frontend. Sign in online with **Remember this device** and wait for **Offline ready**. Products, inventory and locations are prepared automatically, including products never opened in POS. The production service worker saves app code, local branding and fonts for offline reloads. Offline password sign-in lasts 30 days after online password sign-in; plaintext passwords are never stored.

Complete cash or manually recorded M-Pesa sales, receive stock, transfer stock between authorized locations, and record physical stock counts offline. Select **Record M-Pesa manually (no STK push)** for payments already received. STK requests and live provider verification require internet. Existing STK checkouts cannot switch to manual. Other administrative/accounting changes and server shift opening/closing still require internet.

Transactions save in an IndexedDB queue before forms clear. They keep immutable IDs and synchronize in order when the app is open and connectivity returns. PostgreSQL commits each mutation with its permanent acknowledgement. Lost responses, reloads and overlapping tabs retry the same IDs. Captured published prices/VAT and the original sale time are retained. Counts and stock conflicts stay saved for review instead of silently overwriting changes or disappearing.

Open **Offline & sync** to prepare products, inspect pending/synced/review records, reopen sale receipts, retry, or export/restore a device backup. Signing out locks access and retains work. Sync requires the original operator's authenticated backend session; an expired session requires online sign-in. Keep the API address and frontend domain unchanged while work is pending. Browser clearing or device failure can remove local storage, so retain backups. Backup files exclude credentials and are ignored by Git and deployment uploads. See [the offline guide](OFFLINE.md) for recovery and limitations.

Offline shell behavior is enabled in production builds. Development deliberately unregisters service workers to avoid stale development assets. Verify the real offline flow with:

```powershell
npm run test:offline
```

This builds the app and tests a production preview in Chromium with networking disabled: prepared products, completed cash/manual M-Pesa sales, offline password login, reload recovery, stock receipt/transfer synchronization and lost acknowledgements. Business APIs are fixtures; live payment providers and production databases are not contacted.

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
