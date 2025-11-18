# @tiny-cms/admin-ui

Prefab admin UI for tiny-cms projects.

This package provides:

- A small set of admin pages implemented as client components
- A React context for hosting a `TinyCmsSDK` instance on the client
- A minimal layout and document form that render collections and fields from `@tiny-cms/core`

It is intentionally thin and is designed to be wired up by the Next.js integration and your app.

## Design

- **Headless + Tailwind**: pages are built with Tailwind CSS v4 utility classes, with Base UI used only for headless primitives (for example, the markdown preview switch).
- **No business logic**: all CRUD and auth logic lives in `@tiny-cms/core` and is exposed through the SDK and Hono routes. Admin UI only calls SDK methods and server actions.
- **SDK-injected**: the SDK instance is created in the app project and injected via `SdkClientProvider`. This keeps API base URLs and auth behaviour app-specific.

## Exports

- `SdkClientProvider`, `useSdkClient` – context for a `TinyCmsSDK` instance.
- `AdminLayout` – shared shell used by all admin pages (sidebar + header).
- `DocumentForm` – very small form renderer for collection fields; no validation.
- Pages:
  - `AdminDashboardPage`
  - `CollectionListPage`
  - `CollectionCreatePage`
  - `CollectionEditPage`
  - `AccountPage`
  - `SignInPage`

All pages follow the same pattern:

- Accept `initialData` from the server (RSC).
- Accept server actions (for create/update/delete/account mutations).
- Use `useSdkClient` + `swr` to re-fetch and re-render after mutations on the client.

## Usage

In your app, create a `TinyCmsSDK` instance and wrap admin routes:

```tsx
// app/admin/[...slug]/page.tsx
import { RootAdminPage } from '@tiny-cms/next/admin'
import { SdkClientProvider } from '@tiny-cms/admin-ui'
import { TinyCmsSDK } from '@tiny-cms/core/sdk'
import { getCMS } from '@/lib/cms'

function RootProvider({ children }: { children: React.ReactNode }) {
  const sdk = new TinyCmsSDK({
    baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    apiPrefix: '/api',
  })

  return <SdkClientProvider sdk={sdk}>{children}</SdkClientProvider>
}

export default async function AdminPage({ params, searchParams }: any) {
  const cms = getCMS()
  const { slug } = await params
  const search = await searchParams

  return (
    <RootAdminPage
      cms={cms}
      segments={slug || []}
      searchParams={search}
      RootProvider={RootProvider}
    />
  )
}
```

Business logic (collections, access control, hooks, auth) stays in `@tiny-cms/core`. The admin pages only coordinate data fetching via the SDK and server actions passed from the Next.js side.
