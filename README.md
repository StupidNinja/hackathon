# React + TypeScript + Vite

## Requirements

- Node.js 22 (see [.nvmrc](.nvmrc))

## Getting started

```sh
cp .env.example .env
npm install
npm run dev
```

## Routing

React Router DOM with object-based route config in [src/routes/routes.tsx](src/routes/routes.tsx).

## Styling

Tailwind CSS v4 via the Vite plugin, imported in [src/index.css](src/index.css).

## State and data

- Server state: TanStack Query ([src/common/query/queryClient.ts](src/common/query/queryClient.ts))
- Client state: Zustand ([src/common/auth/authStore.ts](src/common/auth/authStore.ts))
- Backend: Supabase client ([src/common/api/supabase/client.ts](src/common/api/supabase/client.ts)).

## Auth

- Combined auth page at `/auth` with sign-in/sign-up modes.
- Password recovery pages at `/auth/forgot-password` and `/auth/reset-password`.
- Email/password auth and Google OAuth via Supabase.
- Email verification is required for email/password registration.
- OAuth users are authenticated when Supabase returns a valid session.
- Supabase reset-password email redirects to `/auth/callback`, then app routes recovery sessions to `/auth/reset-password`.

### Google OAuth in Dev (Supabase)

1. In your **dev Supabase project** open: Authentication -> Providers -> Google.
2. Enable Google provider and paste Google OAuth Client ID/Secret.
3. In Authentication -> URL Configuration add callback URLs for dev:
   - `http://localhost:5173/auth/callback` (Vite dev)
   - `http://localhost:3000/auth/callback` (optional, if using `vercel:dev`)
   - These same callback URLs are used for password recovery links.
4. In Google Cloud Console (OAuth client):
   - Authorized JavaScript origins: `http://localhost:5173` (and `http://localhost:3000` if needed)
   - Authorized redirect URI:
     - `https://<your-dev-project-ref>.supabase.co/auth/v1/callback`
5. In local env set frontend keys for dev Supabase and (optionally) explicit redirect:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_AUTH_REDIRECT_URL=http://localhost:5173/auth/callback`
   - `VITE_AUTH_RECOVERY_REDIRECT_URL=http://localhost:5173/auth/callback` (optional; defaults to `VITE_AUTH_REDIRECT_URL`)

## Environment

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AUTH_REDIRECT_URL` (optional, defaults to `${window.location.origin}/auth/callback`)
- `VITE_AUTH_RECOVERY_REDIRECT_URL` (optional, defaults to `VITE_AUTH_REDIRECT_URL`)

## Vercel Dev Environment

1. Link project:
   - `npm run vercel:link`
2. Pull Vercel env vars into local file:
   - `npm run vercel:pull:dev`
3. Run local Vercel runtime:
   - `npm run vercel:dev`

Notes:
- `.vercel` is ignored by git.
- `vercel:pull:dev` writes to `.env.vercel.local` to avoid overwriting frontend `.env.local`.
- Keep only browser-safe keys in `.env.local` (for this app: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Never put secrets like `VERCEL_OIDC_TOKEN` or service-role keys into `VITE_*`.
- For local development use `npm run dev` (Vite). Use `vercel:dev` only when you need to emulate Vercel runtime behavior.
- For deploys use:
  - Preview: `npm run vercel:deploy:preview`
  - Production: `npm run vercel:deploy:prod`

## Scripts

| Command                | Description                  |
| ---------------------- | ---------------------------- |
| `npm run dev`          | Start dev server             |
| `npm run build`        | Typecheck + production build |
| `npm run typecheck`    | TypeScript check only        |
| `npm run test`         | Run tests once               |
| `npm run test:watch`   | Run tests in watch mode      |
| `npm run lint`         | Lint (zero warnings)         |
| `npm run lint:fix`     | Lint and auto-fix            |
| `npm run format`       | Format with Prettier         |
| `npm run format:check` | Check formatting             |
