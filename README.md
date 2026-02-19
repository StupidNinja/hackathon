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
- Email/password auth and Google OAuth via Supabase.
- Email verification is required for email/password registration.
- OAuth users are authenticated when Supabase returns a valid session.

## Environment

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

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
- SPA rewrite is configured in `vercel.json` so client-side routes work on refresh.
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
