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

TanStack Router with file-based routes in [src/routes](src/routes). The route tree is auto-generated — do not edit `src/routeTree.gen.ts`.

## Styling

Tailwind CSS v4 via the Vite plugin, imported in [src/index.css](src/index.css).

## State and data

- Server state: TanStack Query ([src/common/query/queryClient.ts](src/common/query/queryClient.ts))
- Client state: Zustand ([src/common/auth/authStore.ts](src/common/auth/authStore.ts))
- API calls: shared Axios client ([src/common/api/http.ts](src/common/api/http.ts))

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
