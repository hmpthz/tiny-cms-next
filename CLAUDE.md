Plan mode: If user **explicitly** asked to make a plan, write it under `.claude/` as a markdown file. The plan must have actual implementation details with code snippets, so that agents can follow it straight away.

# Project Structure

Monorepo managed by pnpm workspaces. Packages are designed to be composed and used together in Next.js apps.

- packages/core
  - Core CMS runtime: collections, CRUD, validation, hooks, access control
  - Hono API app with route registration and CORS (mounts plugin routes)
  - Defines adapter and plugin interfaces (DB, plugins, SDK augmentation)
  - Authentication integration via better-auth wrapper (cookies only)
  - Docs under `packages/core/docs/*` (auth, api-routes, sdk, plugins)

- packages/next
  - Thin Next.js integration over the core Hono app with catch-all API routing
  - Cookie-only auth helpers: `getServerAuth`, `requireServerAuth`, `withServerAuth`
  - Root admin routing component that wires CMS, admin-ui pages, and server actions
  - Exposes any API routes contributed by plugins

- packages/db-postgres
  - Official PostgreSQL adapter using Kysely
  - Implements the core DB adapter interface; schema builder for collections

- packages/plugin-storage
  - Storage plugin with an S3-compatible adapter interface
  - Bundled Supabase implementation using `@supabase/storage-js`
  - Contributes minimal `/storage/*` routes and SDK extensions

- packages/admin-ui
  - Prefab minimal admin dashboard (client components)
  - Base UI components and Tailwind CSS v4
  - Ships shared layout shell, minimal document form, and a markdown preview component.

- examples/blog
  - Blog template using the packages above
  - Next.js App Router with catch-all Hono API route
  - Uses cookie-only auth helpers in admin pages and server actions

## Reference

Goal: build a lean CMS inspired by "Payload CMS" architecture, keeping essentials and removing plugin-era complexity. When implementing features, inspect `payload-main/` (upstream reference code) and `reports/` (curated briefings). Let these guide design choices without reintroducing bloat.

# Development Guidelines

## Design Choices

- Next.js only; all integrations assume App Router
- Database: standardizes on PostgreSQL via Kysely in official packages, with a clear adapter interface in core
- Storage: single S3-compatible adapter interface; Supabase implementation provided
- Auth: better-auth with cookies only; no custom headers
- Plugins: minimal but powerful – can extend config, mount API routes in the Hono app, and augment the client SDK. Storage plugin provided; search plugin planned/kept lean
- UI: Base UI + Tailwind CSS v4; textarea-based richtext editing with markdown preview

## Dependency Relationships

- core – defines adapter + plugin interfaces and owns runtime behavior
- next – wraps the core Hono app; forwards plugin routes; no business logic
- db-postgres – official DB adapter consumed by core
- plugin-storage – optional plugin consumed by core via config (adds routes + SDK)
- admin-ui – prefab admin dashboard that relies on the core SDK and next integration
- examples/blog – composes core, next, db-postgres, plugin-storage, admin-ui

## Required Scripts and Conventions

Each package should expose these scripts:

- `build` – typecheck and build the package
- `dev` – watch mode when applicable
- `lint` – lint the package (always run before your work is finished)
- `test` – run tests (if present)

Packages are designed for composition; respect peer dependencies to avoid duplicate or conflicting versions (especially for core). Other 3rd party libraries may be peer or direct depending on package; always check `package.json`.

## Coding Standards

- TypeScript strict mode; use `any` only at unavoidable integration boundaries
- Named exports everywhere except Next.js special files (page/layout) – those use default exports
- Use `useMemo`, `useCallback`, `React.memo` appropriately to prevent unnecessary re-renders for react components.

## Auth Integration Summary

- Core wraps better-auth and provides:
  - Cookie-only Hono controllers under `/auth/*`
  - Generic cookie middleware helpers (resolve from `cookie` header)
- Next package provides cookie-only helpers for Server Components/server actions
- Example blog uses these helpers in admin UI; no custom headers

# Agent Rules

- `README.md` for packages are important references for agents to understand then design. They should be rather technical, not for humans to read.
- When modifying or adding features, put business logic in core; keep next/example thin
- Prefer small, incremental patches;
- **Always update docs** alongside code changes (README.md from root and each package, root CLAUDE.md for agents to read).

## Error Handling

- Include context in thrown errors; return `{ error: string }` shapes in API handlers
- Don’t over-catch; prefer bubbling to route-level responses

## Principles

- KISS & YAGNI: implement only what’s needed, avoid complex abstractions
- Keep changes minimal and focused; align with existing patterns
