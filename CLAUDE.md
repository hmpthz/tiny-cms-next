**Plan mode**: When asked to make a plan, write it under `.claude/` as a markdown file. Keep it detailed but concise.

# Project Structure

Monorepo managed by pnpm workspaces. Packages are designed to be composed and used together in Next.js apps.

- packages/core
  - Core CMS runtime: collections, CRUD, validation, hooks, access control
  - Hono API app with route registration and CORS
  - Authentication integration via better-auth wrapper
  - Docs under `packages/core/docs/*` (auth, api-routes, sdk, plugins)

- packages/next
  - Thin Next.js integration over the core Hono app
  - `createHonoHandler(cms)` for catch-all API routing
  - Cookie-only auth helpers: `authorize`, `getServerAuth`, `requireServerAuth`, `withServerAuth`
  - Minimal Admin UI server components (routing helpers and views)

- packages/db-postgres
  - PostgreSQL adapter using Kysely
  - Schema builder and adapter interface used by core

- packages/plugin-storage
  - Storage plugin using `@supabase/storage-js` (S3-compatible)
  - Exposes a simple adapter and minimal routes

- packages/ui
  - Minimal UI components (Tailwind/shadcn)
  - Basic field components and markdown editor/renderer

- examples/blog
  - Blog template using the packages above
  - Next.js App Router with catch-all Hono API route
  - Uses cookie-only auth helpers in admin pages and server actions

# Design Choices

- Next.js only; all integrations assume App Router
- Database: PostgreSQL via Kysely (no alternative drivers)
- Storage: single S3-compatible adapter via Supabase Storage SDK
- Auth: better-auth with cookies only; no custom headers
- Plugins: kept minimal; storage plugin provided, search plugin planned/kept lean
- UI: Tailwind + shadcn/ui; markdown editor/renderer for rich content

# Dependency Relationships

- core → defines interfaces and owns runtime behavior
- next → wraps core Hono app; no business logic
- db-postgres → provides `db` adapter consumed by core
- plugin-storage → optional plugin consumed by core via config
- examples/blog → consumes core, next, db-postgres, plugin-storage, ui

# Required Scripts and Conventions

Each package should expose these scripts:
- `build` — typecheck and build the package
- `dev` — watch mode when applicable
- `lint` — lint the package
- `test` — run tests (if present)

Peer dependencies: packages are designed for composition; respect peer versions to avoid duplicate React/Next or conflicting Hono versions. `next`, `react`, `react-dom`, `hono` may be peer or direct depending on package; always check `package.json`.

# Coding Standards

- TypeScript strict mode; use `any` only at unavoidable integration boundaries
- Named exports everywhere except Next.js special files (page/layout)—those use default exports
- Use `useMemo`, `useCallback`, `React.memo` appropriately to prevent unnecessary re-renders in UI packages

# Error Handling

- Include context in thrown errors; return `{ error: string }` shapes in API handlers
- Don’t over-catch; prefer bubbling to route-level responses

# Auth Integration Summary

- Core wraps better-auth and provides:
  - Cookie-only Hono controllers under `/auth/*`
  - Generic cookie middleware helpers (resolve from `cookie` header)
- Next package provides cookie-only helpers for Server Components/server actions
- Example blog uses these helpers in admin UI; no custom headers

# Agent Notes

- Read `README.md` (root) and `packages/*/README.md` for usage; detailed design in `packages/core/docs/*`
- When modifying or adding features, put business logic in core; keep next/example thin
- Prefer small, incremental patches; update docs alongside code

# Principles

- KISS & YAGNI: implement only what’s needed, avoid complex abstractions
- Keep changes minimal and focused; align with existing patterns
