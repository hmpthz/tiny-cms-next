# Next.js Integration Package Analysis

## Executive Summary

The `@payloadcms/next` package (~16,244 lines of code, 186 TypeScript files) is Payload's official integration layer for Next.js App Router. It provides route handlers for REST/GraphQL APIs, server components for the admin UI, request initialization utilities, and configuration helpers. This package is critical for understanding how to build a Next.js-only CMS.

**Key Insight**: Payload's Next.js integration is built entirely around App Router patterns - no Pages Router support, no client-side routing. Everything is server-first with strategic client components for interactivity.

---

## 1. Package Overview

### 1.1 Directory Structure

```
packages/next/src/
├── auth/                    # Server actions for auth (login, logout, refresh)
├── elements/                # Server components for admin UI elements
│   ├── DocumentHeader/      # Document edit header with tabs
│   ├── FormHeader/          # Form headers
│   ├── Logo/                # Customizable logo component
│   └── Nav/                 # Navigation components
├── exports/                 # Package entry points
│   ├── auth.ts              # Auth server actions
│   ├── client.ts            # Client-side exports
│   ├── layouts.ts           # Layout components
│   ├── routes.ts            # Route handlers (REST/GraphQL)
│   ├── rsc.ts               # React Server Component exports
│   ├── templates.ts         # Page templates
│   ├── utilities.ts         # Server utilities
│   └── views.ts             # View components
├── layouts/                 # Root layouts
│   └── Root/                # Main application layout
├── routes/                  # Next.js route handlers
│   ├── graphql/             # GraphQL endpoint
│   └── rest/                # REST API endpoint + OG image
├── templates/               # Page templates (Default, Minimal)
├── utilities/               # Core utilities
│   ├── initReq.ts           # Request initialization
│   ├── selectiveCache.ts    # React cache wrapper
│   ├── getPayloadHMR.ts     # HMR-aware Payload instance
│   └── handleServerFunctions.ts  # Server function router
├── views/                   # Admin view components
│   ├── Root/                # Root page with routing logic
│   ├── Document/            # Document edit views
│   ├── List/                # List/collection views
│   ├── Login/               # Auth views
│   └── [20+ other views]
├── withPayload.js           # Next.js config wrapper
└── index.js                 # Main entry point
```

### 1.2 Package Dependencies

```json
{
  "dependencies": {
    "@dnd-kit/core": "6.0.8",              // Drag & drop
    "@payloadcms/graphql": "workspace:*",   // GraphQL schema generation
    "@payloadcms/translations": "workspace:*",
    "@payloadcms/ui": "workspace:*",        // UI primitives
    "busboy": "^1.6.0",                     // File upload parsing
    "dequal": "2.0.3",                      // Deep equality checks
    "file-type": "19.3.0",                  // File type detection
    "graphql-http": "^1.22.0",              // GraphQL over HTTP
    "graphql-playground-html": "1.6.30",    // GraphQL playground UI
    "http-status": "2.1.0",                 // HTTP status codes
    "path-to-regexp": "6.3.0",              // Path matching
    "qs-esm": "7.0.2",                      // Query string parsing
    "sass": "1.77.4",                       // Sass compilation
    "uuid": "10.0.0"                        // UUID generation
  },
  "peerDependencies": {
    "graphql": "^16.8.1",
    "next": "^15.2.3",
    "payload": "workspace:*"
  }
}
```

**Key takeaway**: Minimal dependencies. Most heavy lifting is done by `payload` and `@payloadcms/ui` packages.

### 1.3 Package Exports

The package uses subpath exports to organize functionality:

```typescript
// Main entry point
import { withPayload } from '@payloadcms/next'

// Route handlers for API routes
import { REST_GET, REST_POST, GRAPHQL_POST } from '@payloadcms/next/routes'

// Layouts and templates
import { RootLayout } from '@payloadcms/next/layouts'
import { DefaultTemplate } from '@payloadcms/next/templates'

// Auth server actions
import { login, logout, refresh } from '@payloadcms/next/auth'

// Utilities (mostly deprecated, use 'payload' directly)
import { getPayloadHMR } from '@payloadcms/next/utilities'

// Views (for custom admin panels)
import { RootPage, DocumentView, ListView } from '@payloadcms/next/views'

// Client components
import { /* various */ } from '@payloadcms/next/client'

// Server components and RSC utilities
import { DocumentHeader, Logo, DefaultNav } from '@payloadcms/next/rsc'
```

**Build process**: Uses SWC for transpilation, React Compiler (Babel plugin) for optimization, esbuild for SCSS bundling.

---

## 2. Next.js Integration Architecture

### 2.1 How Payload Integrates with App Router

Payload uses a **catch-all route pattern** for the admin panel:

```typescript
// In user's Next.js app: app/[...slug]/page.tsx
import { RootPage } from '@payloadcms/next/views'
import config from '@/payload.config'

export default RootPage(config)

// And app/[...slug]/layout.tsx
import { RootLayout } from '@payloadcms/next/layouts'
import config from '@/payload.config'

export default RootLayout(config)
```

**Route resolution flow**:

1. User visits `/admin/collections/posts/123`
2. Next.js matches `[...slug]` and passes `segments = ['admin', 'collections', 'posts', '123']`
3. `RootPage` parses segments to determine:
   - Is it a collection route? Global? Dashboard?
   - Which view to render (list, edit, version, etc.)
4. `getRouteData()` maps segments to the appropriate view component
5. View component is rendered as a server component
6. Client interactivity is added via strategic client components

### 2.2 REST API Route Handler

File: `src/routes/rest/index.ts`

```typescript
import { handleEndpoints, type SanitizedConfig } from 'payload'

const handlerBuilder =
  (config: Promise<SanitizedConfig> | SanitizedConfig) =>
  async (
    request: Request,
    args: { params: Promise<{ slug?: string[] }> }
  ): Promise<Response> => {
    const awaitedConfig = await config
    const awaitedParams = await args.params

    // Special OG image endpoint injection
    if (!awaitedConfig.endpoints.some(e => e.path === '/og')) {
      awaitedConfig.endpoints.push({
        handler: generateOGImage,
        method: 'get',
        path: '/og',
      })
    }

    // Delegate to Payload's universal endpoint handler
    const response = await handleEndpoints({
      config,
      path: awaitedParams
        ? `${awaitedConfig.routes.api}/${awaitedParams.slug.join('/')}`
        : undefined,
      request,
    })

    return response
  }

// Export all HTTP methods
export const OPTIONS = handlerBuilder
export const GET = handlerBuilder
export const POST = handlerBuilder
export const DELETE = handlerBuilder
export const PATCH = handlerBuilder
export const PUT = handlerBuilder
```

**Usage in user app**:

```typescript
// app/api/[...slug]/route.ts
import { REST_GET, REST_POST, REST_DELETE, REST_PATCH, REST_PUT } from '@payloadcms/next/routes'
import config from '@/payload.config'

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
```

**Key pattern**: Single handler builder that works for all HTTP methods. Payload's `handleEndpoints()` does the heavy lifting of routing to collections/globals/auth/custom endpoints.

### 2.3 GraphQL Route Handler

File: `src/routes/graphql/handler.ts`

```typescript
import { createHandler } from 'graphql-http/lib/use/fetch'
import { configToSchema } from '@payloadcms/graphql'

// Global cache for GraphQL schema (invalidated in dev mode)
let cached = global._payload_graphql

export const getGraphql = async (config: SanitizedConfig) => {
  if (process.env.NODE_ENV === 'development') {
    cached = global._payload_graphql = { graphql: null, promise: null }
  }

  if (cached.graphql) return cached.graphql

  if (!cached.promise) {
    const resolvedConfig = await config
    cached.promise = configToSchema(resolvedConfig)
  }

  cached.graphql = await cached.promise
  return cached.graphql
}

export const POST = (config: SanitizedConfig) => async (request: Request) => {
  const originalRequest = request.clone()
  const req = await createPayloadRequest({ config, request })

  await addDataAndFileToRequest(req)
  addLocalesToRequestFromData(req)

  const { schema, validationRules } = await getGraphql(config)

  const apiResponse = await createHandler({
    context: { headers, req },
    onOperation: async (request, args, result) => {
      // Error handling and extensions hook
      if (response.errors) {
        return {
          ...response,
          errors: await Promise.all(
            result.errors.map(error => handleError({ err: error, payload, req }))
          )
        }
      }
      return response
    },
    schema,
    validationRules,
  })(originalRequest)

  return new Response(apiResponse.body, {
    headers: mergeHeaders(req.responseHeaders, resHeaders),
    status: apiResponse.status,
  })
}
```

**Key patterns**:
- Schema is cached globally and reused across requests (except in dev)
- Uses `graphql-http` for HTTP transport (not Apollo)
- Errors are processed through `handleError()` which respects `config.debug`
- GraphQL playground available via separate GET handler

### 2.4 Server Components vs Client Components

Payload uses a **server-first architecture**:

| Component Type | Purpose | Examples |
|---|---|---|
| **Server Components** | Data fetching, access control, rendering | `RootPage`, `DocumentView`, `ListView`, `RootLayout` |
| **Client Components** | User interactions, forms, state management | Form inputs, buttons, modals, drag-drop |
| **Hybrid** | Server renders shell, client provides interactivity | `RenderServerComponent` wrapper pattern |

**RenderServerComponent Pattern**:

File: `@payloadcms/ui/elements/RenderServerComponent`

```typescript
export const RenderServerComponent = ({
  Component,          // Server component (PayloadComponent)
  Fallback,           // Client fallback (React.FC)
  importMap,
  clientProps,        // Props available on client
  serverProps,        // Props only on server
}) => {
  if (Component) {
    // Component marked with 'use server' or is PayloadComponent
    return <Component {...clientProps} {...serverProps} />
  }

  if (Fallback) {
    // Client component - server props are NOT passed
    return <Fallback {...clientProps} />
  }

  return null
}
```

This pattern allows:
1. Custom server components to access full server props (db queries, auth, etc.)
2. Default client components to work without server context
3. Type-safe separation of client and server props

**Example usage**:

```typescript
// In DocumentView (server component)
const clientProps: DocumentViewClientProps = {
  formState,
  documentSlots,
  viewType,
}

const serverProps: DocumentViewServerPropsOnly = {
  doc,
  i18n,
  payload,
  permissions,
  req,
}

return RenderServerComponent({
  clientProps,
  Component: customServerComponent,
  Fallback: DefaultClientComponent,
  importMap,
  serverProps,
})
```

### 2.5 Middleware Integration

Payload **does not use Next.js middleware** for the admin panel. All authentication and authorization happens at the component/route level:

1. **Route handlers**: Use `createPayloadRequest()` to initialize request with auth
2. **Page components**: Use `initReq()` to get authenticated request
3. **Access control**: Checked per operation (find, create, update, delete)

**Why no middleware?**
- Middleware runs on Edge Runtime (limited Node.js APIs)
- Payload needs full Node.js for database adapters, file uploads, etc.
- More flexible to check auth per-route rather than globally

### 2.6 Static Generation vs SSR

**All admin routes are dynamic (SSR)**:

```typescript
// No export const dynamic = 'force-static'
// No generateStaticParams()

// Admin routes are always dynamic
export default async function AdminPage({ params, searchParams }) {
  // Fetches user, permissions, preferences on each request
  const { req, permissions } = await initReq({ config })
  // ...
}
```

**Why?**
- Admin panel is authentication-gated
- Data changes frequently
- User-specific preferences and permissions

**Public-facing routes** (your app's frontend) can still use SSG:

```typescript
// app/posts/[slug]/page.tsx
export async function generateStaticParams() {
  const payload = await getPayload({ config })
  const posts = await payload.find({ collection: 'posts', limit: 1000 })
  return posts.docs.map(post => ({ slug: post.slug }))
}

export default async function PostPage({ params }) {
  const payload = await getPayload({ config })
  const post = await payload.findByID({
    collection: 'posts',
    id: params.slug,
  })
  return <PostContent post={post} />
}
```

---

## 3. Key Components

### 3.1 withPayload() - Next.js Config Wrapper

File: `src/withPayload.js`

```javascript
export const withPayload = (nextConfig = {}, options = {}) => {
  return {
    ...nextConfig,

    // Disable powered by header (add custom one later)
    poweredByHeader: false,

    // Add Client Hints headers for theme detection
    headers: async () => {
      return [
        ...await nextConfig.headers(),
        {
          source: '/:path*',
          headers: [
            { key: 'Accept-CH', value: 'Sec-CH-Prefers-Color-Scheme' },
            { key: 'Vary', value: 'Sec-CH-Prefers-Color-Scheme' },
            { key: 'Critical-CH', value: 'Sec-CH-Prefers-Color-Scheme' },
            { key: 'X-Powered-By', value: 'Next.js, Payload' },
          ],
        },
      ]
    },

    // Mark packages as external (don't bundle)
    serverExternalPackages: [
      ...(nextConfig?.serverExternalPackages || []),
      'drizzle-kit',
      'pino',
      'libsql',
      'graphql',
      // In dev mode, don't bundle Payload for faster builds
      ...(process.env.NODE_ENV === 'development' && options.devBundleServerPackages === false
        ? ['payload', '@payloadcms/db-*', '@payloadcms/graphql', /* etc */]
        : []
      ),
    ],

    // Webpack config adjustments
    webpack: (webpackConfig, webpackOptions) => {
      return {
        ...incomingWebpackConfig,

        // Externalize native modules
        externals: [
          ...(incomingWebpackConfig?.externals || []),
          'drizzle-kit',
          'sharp',
          'libsql',
        ],

        // Ignore MongoDB warnings
        ignoreWarnings: [
          { module: /node_modules\/mongodb\/lib\/utils\.js/ },
        ],

        // Ignore pg-native and cloudflare:sockets
        plugins: [
          new webpackOptions.webpack.IgnorePlugin({
            resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
          }),
        ],

        // Resolve fallbacks for browser polyfills
        resolve: {
          fallback: {
            '@aws-sdk/credential-providers': false,
            'kerberos': false,
            'mongodb-client-encryption': false,
            'snappy': false,
          },
        },
      }
    },

    // File tracing for standalone builds
    outputFileTracingExcludes: {
      '**/*': ['drizzle-kit', 'drizzle-kit/api'],
    },
    outputFileTracingIncludes: {
      '**/*': ['@libsql/client'],
    },
  }
}
```

**Usage**:

```javascript
// next.config.js
import { withPayload } from '@payloadcms/next'

export default withPayload({
  // Your Next.js config
  reactStrictMode: true,
  images: { domains: ['example.com'] },
})
```

**What it does**:
1. **Headers**: Adds Client Hints for automatic theme detection
2. **Externals**: Prevents bundling of heavy packages (MongoDB, PostgreSQL native bindings)
3. **Webpack**: Ignores false positive warnings, handles native modules
4. **Tracing**: Ensures necessary files are included in standalone builds
5. **Dev mode**: Optionally skips bundling Payload packages for faster HMR

### 3.2 getPayload() - Accessing Payload Instance

Payload provides a **singleton pattern** for accessing the Payload instance:

```typescript
import { getPayload } from 'payload'

// In any server component or route handler
const payload = await getPayload({
  config,           // Your Payload config
  cron: true,       // Enable cron jobs (optional)
  importMap,        // For custom components (optional)
})

// Use Payload API
const posts = await payload.find({ collection: 'posts' })
```

**Internal implementation** (from `payload` package):

```typescript
// Global cache for Payload instance
const cached = global._payload || { instance: null, promise: null }

export async function getPayload(options: InitOptions): Promise<Payload> {
  // In dev mode, always reinitialize (HMR support)
  if (process.env.NODE_ENV === 'development') {
    return initPayload(options)
  }

  // In production, use cached instance
  if (cached.instance) return cached.instance

  if (!cached.promise) {
    cached.promise = initPayload(options)
  }

  cached.instance = await cached.promise
  return cached.instance
}
```

**HMR handling**:
- In dev mode, Payload reinitializes on every request
- Config file changes are picked up automatically
- Database connections are reused (connection pooling)

**getPayloadHMR() deprecation**:

File: `src/utilities/getPayloadHMR.ts`

```typescript
/**
 * @deprecated
 * Use `import { getPayload } from 'payload'` in all contexts
 */
export const getPayloadHMR = async (options) => {
  const result = await getPayload(options)
  result.logger.warn("Deprecation warning: Use getPayload() directly")
  return result
}
```

**Takeaway**: Always use `getPayload()` from `payload`, never `getPayloadHMR()`.

### 3.3 initReq() - Request Initialization

File: `src/utilities/initReq.ts`

This is **the most critical function** for understanding request flow:

```typescript
/**
 * Initializes a full request object including:
 * - User authentication
 * - i18n setup
 * - Locale detection
 * - Access control
 * - Preferences loading
 */
export const initReq = async ({
  configPromise,
  importMap,
  key,              // Cache key (e.g., 'RootLayout', 'initPage')
  overrides,
  canSetHeaders,
}: {
  configPromise: Promise<SanitizedConfig> | SanitizedConfig
  importMap: ImportMap
  key: string
  overrides?: { req?: Partial<PayloadRequest> }
  canSetHeaders?: boolean
}): Promise<{
  cookies: Map<string, string>
  headers: Headers
  languageCode: AcceptedLanguages
  locale: Locale
  permissions: SanitizedPermissions
  req: PayloadRequest
}> => {
  const headers = await getHeaders()
  const cookies = parseCookies(headers)

  // Step 1: Partial request initialization (cached globally)
  const partialResult = await partialReqCache.get(async () => {
    const config = await configPromise
    const payload = await getPayload({ config, cron: true, importMap })

    // Get language from cookies/headers
    const languageCode = getRequestLanguage({ config, cookies, headers })

    // Initialize i18n client
    const i18n = await initI18n({
      config: config.i18n,
      context: 'client',
      language: languageCode,
    })

    // Execute auth strategies (JWT, session, etc.)
    const { responseHeaders, user } = await executeAuthStrategies({
      canSetHeaders,
      headers,
      payload,
    })

    return { i18n, languageCode, payload, responseHeaders, user }
  }, 'global')

  // Step 2: Full request initialization (cached per key)
  return reqCache.get(async () => {
    const { i18n, languageCode, payload, responseHeaders, user } = partialResult

    // Create local request object
    const req = await createLocalReq(
      {
        req: {
          headers,
          host: headers.get('host'),
          i18n,
          responseHeaders,
          user,
          ...(overrides?.req || {}),
        },
      },
      payload,
    )

    // Get user's locale preference
    const locale = await getRequestLocale({ req })
    req.locale = locale?.code

    // Get user's permissions
    const permissions = await getAccessResults({ req })

    return { cookies, headers, languageCode, locale, permissions, req }
  }, key)
}
```

**Caching strategy**:

1. **Partial cache** (global key):
   - Payload instance
   - User authentication
   - Language detection
   - Shared across all requests in same render

2. **Full cache** (per-key):
   - Request object
   - Locale preference
   - Permissions
   - Different for layout vs page (different keys)

**selectiveCache implementation**:

File: `src/utilities/selectiveCache.ts`

```typescript
import { cache } from 'react'

// Module-scoped cache container
const globalCacheContainer: Record<string, Function> = {}

export function selectiveCache<TValue>(namespace: string) {
  // Create stable cache function for namespace
  if (!globalCacheContainer[namespace]) {
    globalCacheContainer[namespace] = cache((...args) => ({ value: null }))
  }

  const getCached = async (factory: () => Promise<TValue>, ...cacheArgs) => {
    const stableObjectFn = globalCacheContainer[namespace]
    const stableObject = stableObjectFn<TValue>(...cacheArgs)

    // Check if promise is already in progress
    if (stableObject?.value && 'then' in stableObject.value) {
      return await stableObject.value
    }

    // Start new factory call
    stableObject.value = factory()
    return await stableObject.value
  }

  return { get: getCached }
}
```

**Why this pattern?**
- React's `cache()` only works with stable functions
- `selectiveCache` creates a stable cache function per namespace
- Allows controlling cache scope (global vs per-key)
- Prevents duplicate async operations during same render

### 3.4 RootLayout - Application Shell

File: `src/layouts/Root/index.tsx`

```typescript
export const RootLayout = async ({
  children,
  config: configPromise,
  htmlProps = {},
  importMap,
  serverFunction,
}: {
  readonly children: React.ReactNode
  readonly config: Promise<SanitizedConfig>
  readonly htmlProps?: React.HtmlHTMLAttributes<HTMLHtmlElement>
  readonly importMap: ImportMap
  readonly serverFunction: ServerFunctionClient
}) => {
  checkDependencies()  // Verify Next.js version compatibility

  // Initialize request with auth and permissions
  const {
    cookies,
    headers,
    languageCode,
    permissions,
    req,
    req: { payload: { config } },
  } = await initReq({ configPromise, importMap, key: 'RootLayout' })

  // Get theme preference (light/dark/auto)
  const theme = getRequestTheme({ config, cookies, headers })

  // Check text direction (RTL languages)
  const dir = rtlLanguages.includes(languageCode) ? 'RTL' : 'LTR'

  // Build language switcher options
  const languageOptions = Object.entries(config.i18n.supportedLanguages)
    .map(([lang, langConfig]) => ({
      label: langConfig.translations.general.thisLanguage,
      value: lang,
    }))

  // Server action for switching language
  async function switchLanguageServerAction(lang: string) {
    'use server'
    const cookies = await nextCookies()
    cookies.set({
      name: `${config.cookiePrefix || 'payload'}-lng`,
      value: lang,
      path: '/',
    })
  }

  // Get navigation preferences (open/closed)
  const navPrefs = await getNavPrefs(req)

  const clientConfig = getClientConfig({
    config,
    i18n: req.i18n,
    importMap,
    user: req.user,
  })

  return (
    <html
      data-theme={theme}
      dir={dir}
      lang={languageCode}
      suppressHydrationWarning={config?.admin?.suppressHydrationWarning}
      {...htmlProps}
    >
      <head>
        <style>{`@layer payload-default, payload;`}</style>
      </head>
      <body>
        <RootProvider
          config={clientConfig}
          dateFNSKey={req.i18n.dateFNSKey}
          fallbackLang={config.i18n.fallbackLanguage}
          isNavOpen={navPrefs?.open ?? true}
          languageCode={languageCode}
          languageOptions={languageOptions}
          locale={req.locale}
          permissions={req.user ? permissions : null}
          serverFunction={serverFunction}
          switchLanguageServerAction={switchLanguageServerAction}
          theme={theme}
          translations={req.i18n.translations}
          user={req.user}
        >
          <ProgressBar />
          {/* Custom providers (if configured) */}
          {config.admin?.components?.providers ? (
            <NestProviders providers={config.admin.components.providers}>
              {children}
            </NestProviders>
          ) : (
            children
          )}
        </RootProvider>
        <div id="portal" />  {/* For modals/drawers */}
      </body>
    </html>
  )
}
```

**Key responsibilities**:
1. Set HTML attributes (lang, dir, theme)
2. Initialize authenticated request
3. Load user preferences
4. Provide global context (auth, i18n, theme)
5. Render custom providers if configured
6. Create portal mount point for modals

**RootProvider** (from `@payloadcms/ui`):
- React Context provider for global state
- Makes `config`, `user`, `permissions`, `translations` available
- Handles theme switching
- Manages server function calls

### 3.5 RootPage - Routing Logic

File: `src/views/Root/index.tsx`

This component handles **all admin route resolution**:

```typescript
export const RootPage = async ({
  config: configPromise,
  importMap,
  params: paramsPromise,
  searchParams: searchParamsPromise,
}) => {
  const config = await configPromise
  const params = await paramsPromise
  const searchParams = await searchParamsPromise

  const segments = Array.isArray(params.segments) ? params.segments : []

  // Parse collection/global from segments
  const isCollectionRoute = segments[0] === 'collections'
  const isGlobalRoute = segments[0] === 'globals'

  let collectionConfig = undefined
  let globalConfig = undefined

  if (isCollectionRoute && segments[1]) {
    collectionConfig = config.collections.find(c => c.slug === segments[1])
  }

  if (isGlobalRoute && segments[1]) {
    globalConfig = config.globals.find(g => g.slug === segments[1])
  }

  // 404 if collection/global not found
  if ((isCollectionRoute && !collectionConfig) ||
      (isGlobalRoute && !globalConfig)) {
    return notFound()
  }

  // Initialize request
  const { req, permissions, locale } = await initReq({
    configPromise: config,
    importMap,
    key: 'initPage',
  })

  // Check authentication
  if (!permissions.canAccessAdmin && !isPublicAdminRoute(...)) {
    redirect(handleAuthRedirect({ config, route, user: req.user }))
  }

  // Load collection preferences (if applicable)
  let collectionPreferences = undefined
  if (collectionConfig && segments.length === 2) {
    collectionPreferences = await getPreferences(
      `collection-${collectionConfig.slug}`,
      req.payload,
      req.user.id,
      config.admin.user,
    )
  }

  // Get route data (which view to render, params, etc.)
  const {
    DefaultView,
    viewType,
    documentSubViewType,
    routeParams,
    templateType,
    templateClassName,
    viewActions,
  } = getRouteData({
    adminRoute: config.routes.admin,
    collectionConfig,
    collectionPreferences,
    currentRoute,
    globalConfig,
    payload: req.payload,
    segments,
    searchParams,
  })

  // Check if first user exists
  const dbHasUser = req.user || await req.payload.db.findOne({
    collection: config.admin.user,
    req,
  })

  // Redirect to create first user if no users exist
  if (!dbHasUser && currentRoute !== createFirstUserRoute) {
    redirect(createFirstUserRoute)
  }

  // Build client config (sanitized for browser)
  const clientConfig = getClientConfig({ config, i18n: req.i18n, importMap, user: req.user })

  // Get visible entities (based on permissions)
  const visibleEntities = getVisibleEntities({ req })

  // Render view with server component pattern
  const RenderedView = RenderServerComponent({
    clientProps: { viewType, documentSubViewType, clientConfig },
    Component: DefaultView.payloadComponent,
    Fallback: DefaultView.Component,
    importMap,
    serverProps: {
      collectionConfig,
      globalConfig,
      docID: routeParams.id,
      i18n: req.i18n,
      initPageResult: { /* full context */ },
      params,
      payload: req.payload,
      permissions,
      searchParams,
      viewActions,
    },
  })

  // Wrap in template (Default or Minimal)
  return (
    <PageConfigProvider config={clientConfig}>
      {templateType === 'minimal' && (
        <MinimalTemplate className={templateClassName}>
          {RenderedView}
        </MinimalTemplate>
      )}
      {templateType === 'default' && (
        <DefaultTemplate
          collectionSlug={collectionConfig?.slug}
          globalSlug={globalConfig?.slug}
          viewType={viewType}
          /* ... */
        >
          {RenderedView}
        </DefaultTemplate>
      )}
    </PageConfigProvider>
  )
}
```

**Route parsing examples**:

```typescript
// getRouteData() maps segments to views:

// /admin → Dashboard
segments = []
→ viewType = 'dashboard', DefaultView = DashboardView

// /admin/collections/posts → List view
segments = ['collections', 'posts']
→ viewType = 'list', DefaultView = ListView

// /admin/collections/posts/create → Document create
segments = ['collections', 'posts', 'create']
→ viewType = 'document', DefaultView = DocumentView, routeParams = { id: undefined }

// /admin/collections/posts/123 → Document edit
segments = ['collections', 'posts', '123']
→ viewType = 'document', DefaultView = DocumentView, routeParams = { id: '123' }

// /admin/collections/posts/123/versions → Versions list
segments = ['collections', 'posts', '123', 'versions']
→ viewType = 'versions', documentSubViewType = 'versions', DefaultView = VersionsView

// /admin/globals/site-settings → Global edit
segments = ['globals', 'site-settings']
→ viewType = 'document', DefaultView = DocumentView

// /admin/login → Login
segments = ['login']
→ viewType = 'login', DefaultView = LoginView, templateType = 'minimal'

// /admin/account → Account settings
segments = ['account']
→ viewType = 'account', DefaultView = AccountView
```

**getRouteData() implementation** (simplified):

File: `src/views/Root/getRouteData.ts`

```typescript
export const getRouteData = ({ segments, ... }): GetRouteDataResult => {
  let ViewToRender = null
  let templateType = undefined
  let viewType = undefined
  let documentSubViewType = undefined
  const routeParams = {}

  const [seg1, seg2, seg3, seg4, seg5, seg6] = segments

  switch (segments.length) {
    case 0:
      // /admin
      ViewToRender = { Component: DashboardView }
      templateType = 'default'
      viewType = 'dashboard'
      break

    case 1:
      // /admin/login, /admin/logout, /admin/account, etc.
      const viewKey = matchRouteToViewKey(seg1)
      ViewToRender = { Component: oneSegmentViews[viewKey] }
      templateType = viewKey === 'account' ? 'default' : 'minimal'
      viewType = viewKey
      break

    case 2:
      if (collectionConfig) {
        // /admin/collections/posts
        ViewToRender = { Component: ListView }
        templateType = 'default'
        viewType = 'list'
      } else if (globalConfig) {
        // /admin/globals/site-settings
        ViewToRender = { Component: DocumentView }
        templateType = 'default'
        viewType = 'document'
      }
      break

    default:
      if (collectionConfig) {
        if (seg3 === 'create') {
          // /admin/collections/posts/create
          ViewToRender = { Component: DocumentView }
          routeParams.id = undefined
          viewType = 'document'
        } else if (seg3 === 'trash') {
          // /admin/collections/posts/trash
          ViewToRender = { Component: TrashView }
          viewType = 'trash'
        } else {
          // /admin/collections/posts/123
          // /admin/collections/posts/123/versions
          // /admin/collections/posts/123/api
          ViewToRender = { Component: DocumentView }
          routeParams.id = seg3
          routeParams.versionID = seg5

          const viewInfo = getDocumentViewInfo([seg4, seg5])
          viewType = viewInfo.viewType
          documentSubViewType = viewInfo.documentSubViewType
        }
      } else if (globalConfig) {
        // /admin/globals/site-settings/versions
        ViewToRender = { Component: DocumentView }
        const viewInfo = getDocumentViewInfo([seg3, seg4])
        viewType = viewInfo.viewType
        documentSubViewType = viewInfo.documentSubViewType
      }
      break
  }

  // Check for custom views
  if (!ViewToRender) {
    ViewToRender = getCustomViewByRoute({ config, currentRoute })?.view
  }

  return {
    DefaultView: ViewToRender,
    viewType,
    documentSubViewType,
    routeParams,
    templateType,
    templateClassName,
    viewActions,
  }
}
```

### 3.6 DocumentView - Edit View

File: `src/views/Document/index.tsx`

The document edit view is the **most complex view** in Payload:

```typescript
export const renderDocument = async ({
  initPageResult,
  params,
  searchParams,
  documentSubViewType,
  viewType,
  ...
}) => {
  const {
    collectionConfig,
    globalConfig,
    docID,
    permissions,
    req,
    locale,
  } = initPageResult

  const collectionSlug = collectionConfig?.slug
  const globalSlug = globalConfig?.slug

  // Fetch document data
  let doc = await getDocumentData({
    id: docID,
    collectionSlug,
    globalSlug,
    locale,
    payload: req.payload,
    req,
  })

  // Redirect if document not found
  if (!doc && collectionSlug) {
    redirect(`/collections/${collectionSlug}?notFound=${docID}`)
  }

  const isTrashedDoc = typeof doc?.deletedAt === 'string'

  // Parallel data fetching
  const [
    docPreferences,
    { docPermissions, hasPublishPermission, hasSavePermission },
    { currentEditor, isLocked, lastUpdateTime },
    entityPreferences,
  ] = await Promise.all([
    getDocPreferences({ id: docID, collectionSlug, globalSlug, payload, user }),
    getDocumentPermissions({ id: docID, collectionConfig, data: doc, req }),
    getIsLocked({ id: docID, collectionConfig, globalConfig, req }),
    getPreferences(`collection-${collectionSlug}`, payload, user.id),
  ])

  const operation = docID || globalSlug ? 'update' : 'create'

  // Parallel data fetching (continued)
  const [
    { hasPublishedDoc, mostRecentVersionIsAutosaved, versionCount },
    { state: formState },
  ] = await Promise.all([
    getVersions({ id: docID, collectionConfig, doc, docPermissions, payload }),
    buildFormState({
      id: docID,
      collectionSlug,
      data: doc,
      docPermissions,
      docPreferences,
      globalSlug,
      locale: locale?.code,
      operation,
      readOnly: isTrashedDoc || isLocked,
      renderAllFields: true,
      req,
      schemaPath: collectionSlug || globalSlug,
      skipValidation: true,
    }),
  ])

  // Handle autosave for new documents
  if (shouldAutosave && !docID && collectionSlug) {
    doc = await payload.create({
      collection: collectionSlug,
      data: initialData || {},
      depth: 0,
      draft: true,
      locale: locale?.code,
      req,
    })

    if (doc?.id) {
      redirect(`/collections/${collectionSlug}/${doc.id}`)
    }
  }

  // Render document slots (actions, description, etc.)
  const documentSlots = renderDocumentSlots({
    id: docID,
    collectionConfig,
    globalConfig,
    hasSavePermission,
    permissions: docPermissions,
    req,
  })

  // Handle live preview
  const { isLivePreviewEnabled, livePreviewURL } = await handleLivePreview({
    collectionSlug,
    config,
    data: doc,
    globalSlug,
    operation,
    req,
  })

  // Determine which view to render
  let View = null
  let showHeader = true

  const RootViewOverride =
    collectionConfig?.admin?.components?.views?.edit?.root?.Component ||
    globalConfig?.admin?.components?.views?.edit?.root?.Component

  if (RootViewOverride) {
    View = RootViewOverride
    showHeader = false
  } else {
    ({ View } = getDocumentView({
      collectionConfig,
      config,
      docPermissions,
      globalConfig,
      routeSegments: segments,
    }))
  }

  return {
    data: doc,
    Document: (
      <DocumentInfoProvider
        apiURL={apiURL}
        collectionSlug={collectionSlug}
        currentEditor={currentEditor}
        docPermissions={docPermissions}
        hasPublishedDoc={hasPublishedDoc}
        hasSavePermission={hasSavePermission}
        id={docID}
        initialData={doc}
        initialState={formState}
        isEditing={!!docID}
        isLocked={isLocked}
        isTrashed={isTrashedDoc}
      >
        <LivePreviewProvider
          isLivePreviewEnabled={isLivePreviewEnabled}
          url={livePreviewURL}
        >
          {showHeader && (
            <DocumentHeader
              collectionConfig={collectionConfig}
              globalConfig={globalConfig}
              permissions={permissions}
              req={req}
            />
          )}
          <HydrateAuthProvider permissions={permissions} />
          <EditDepthProvider>
            {RenderServerComponent({
              clientProps: { formState, documentSlots, viewType },
              Component: View,
              importMap,
              serverProps: { doc, i18n, payload, permissions, req },
            })}
          </EditDepthProvider>
        </LivePreviewProvider>
      </DocumentInfoProvider>
    ),
  }
}
```

**Key features**:
1. **Parallel data fetching**: Uses `Promise.all()` to fetch multiple resources simultaneously
2. **Autosave**: Automatically creates draft for new documents
3. **Live preview**: Sets up live preview if enabled
4. **Lock state**: Checks if document is locked by another user
5. **Permissions**: Fine-grained field-level permissions
6. **Form state**: Pre-builds entire form state on server
7. **Document slots**: Renders action buttons, descriptions, etc.

**getDocumentView()** selects which component to render based on route:

```typescript
export const getDocumentView = ({ routeSegments, collectionConfig, ... }) => {
  const [seg4, seg5] = routeSegments

  // Default edit view
  if (!seg4 || seg4 === 'edit') {
    return {
      View: collectionConfig?.admin?.components?.views?.edit?.default?.Component ||
            globalConfig?.admin?.components?.views?.edit?.default?.Component ||
            DefaultEditView
    }
  }

  // API view (/collections/posts/123/api)
  if (seg4 === 'api') {
    return { View: APIView }
  }

  // Versions list (/collections/posts/123/versions)
  if (seg4 === 'versions' && !seg5) {
    return { View: VersionsView }
  }

  // Version detail (/collections/posts/123/versions/456)
  if (seg4 === 'versions' && seg5) {
    return { View: VersionView }
  }

  // Preview view (/collections/posts/123/preview)
  if (seg4 === 'preview') {
    return { View: PreviewView }
  }

  // Custom view
  const customView = getCustomViewByKey({ collectionConfig, viewKey: seg4 })
  if (customView) {
    return { View: customView.Component }
  }

  return { View: NotFoundView }
}
```

### 3.7 ListView - Collection List

File: `src/views/List/index.tsx`

```typescript
export const renderListView = async (args: RenderListViewArgs) => {
  const {
    initPageResult,
    query,
    enableRowSelections,
    disableBulkDelete,
    disableBulkEdit,
    trash,
  } = args

  const {
    collectionConfig,
    permissions,
    req,
  } = initPageResult

  // Check read permission
  if (!permissions?.collections?.[collectionSlug]?.read) {
    throw new Error('not-found')
  }

  // Load collection preferences
  const collectionPreferences = await upsertPreferences({
    key: `collection-${collectionSlug}`,
    req,
    value: {
      columns: transformColumnsToPreferences(query?.columns),
      groupBy: query?.groupBy,
      limit: Number(query.limit),
      sort: query?.sort,
    },
  })

  // Build where clause
  let whereWithMergedSearch = mergeListSearchAndWhere({
    collectionConfig,
    search: query?.search,
    where: combineWhereConstraints([query?.where, baseFilterConstraint]),
  })

  if (trash === true) {
    whereWithMergedSearch = {
      and: [whereWithMergedSearch, { deletedAt: { exists: true } }],
    }
  }

  // Get columns to display
  const columns = getColumns({
    collectionSlug,
    columns: collectionPreferences?.columns,
    i18n: req.i18n,
  })

  // Build select (for performance)
  const select = collectionConfig.admin.enableListViewSelectAPI
    ? transformColumnsToSelect(columns)
    : undefined

  // Fetch data
  let data = await req.payload.find({
    collection: collectionSlug,
    depth: 0,
    draft: true,
    limit: query?.limit,
    locale: req.locale,
    page: query?.page,
    select,
    sort: query?.sort,
    trash,
    where: whereWithMergedSearch,
  })

  // Render table
  const { columnState, Table } = renderTable({
    collectionConfig,
    columns,
    data,
    enableRowSelections,
    i18n: req.i18n,
    query,
    useAsTitle: collectionConfig.admin.useAsTitle,
  })

  // Render filters
  const renderedFilters = renderFilters(collectionConfig.fields, importMap)

  // Render view
  return {
    List: (
      <Fragment>
        <HydrateAuthProvider permissions={permissions} />
        <ListQueryProvider
          collectionSlug={collectionSlug}
          data={data}
          query={query}
        >
          {RenderServerComponent({
            clientProps: {
              collectionSlug,
              columnState,
              disableBulkDelete,
              disableBulkEdit,
              enableRowSelections,
              listPreferences: collectionPreferences,
              renderedFilters,
              Table,
            },
            Component: collectionConfig?.admin?.components?.views?.list?.Component,
            Fallback: DefaultListView,
            importMap,
            serverProps: {
              collectionConfig,
              data,
              i18n,
              permissions,
            },
          })}
        </ListQueryProvider>
      </Fragment>
    ),
  }
}
```

**Key features**:
1. **Preferences**: Saves user's column/sort/filter preferences
2. **Select API**: Only fetches displayed columns for performance
3. **Search merging**: Combines search query with where clause
4. **Trash filtering**: Optionally shows deleted documents
5. **Permissions**: Respects field-level read permissions
6. **Server-rendered table**: Table HTML is generated on server

**Column system**:

```typescript
// User preferences stored in database
type CollectionPreferences = {
  columns: ColumnPreference[]  // [{ accessor: 'title', active: true }, ...]
  limit: number
  sort: string
  groupBy?: string
  preset?: string  // Query preset ID
}

// Columns are transformed through pipeline:
query.columns (string[])
  → transformColumnsToPreferences()
  → CollectionPreferences.columns
  → getColumns()
  → Column[] (with labels, accessors, components)
  → renderTable()
  → Table (React element)
```

---

## 4. Initialization Flow

### 4.1 Development Mode

**Request flow in dev**:

```
1. User visits /admin/collections/posts

2. Next.js matches [...slug]/page.tsx
   → Calls RootPage({ params, searchParams })

3. RootPage calls initReq()
   ↓
4. initReq() calls getPayload()
   ↓
5. getPayload() checks process.env.NODE_ENV === 'development'
   → Reinitializes Payload (no caching)
   ↓
6. initPayload() is called:
   - Loads config from payload.config.ts
   - Connects to database (uses connection pool)
   - Initializes collections/globals
   - Registers hooks
   - Starts cron jobs
   ↓
7. Returns Payload instance
   ↓
8. initReq() continues:
   - Executes auth strategies (JWT, session)
   - Loads i18n translations
   - Gets user permissions
   - Returns PayloadRequest
   ↓
9. RootPage determines route and view
   ↓
10. View component (DocumentView, ListView, etc.) is rendered
    ↓
11. View fetches data using payload.find(), payload.findByID(), etc.
    ↓
12. Server component tree is serialized to RSC payload
    ↓
13. Response sent to client
```

**HMR behavior**:
- Config changes: Payload reinitializes on next request
- React components: Fast Refresh (no Payload reinitialization)
- Database changes: No auto-reload (manual restart required)

### 4.2 Production Mode

**Initialization on startup**:

```
1. Next.js server starts
   ↓
2. First request arrives
   ↓
3. getPayload() is called
   → Checks global cache (empty)
   → Starts initPayload() and caches promise
   ↓
4. initPayload() runs:
   - Loads config (pre-bundled)
   - Connects to database
   - Initializes collections/globals
   - Warms up schema
   - Starts cron jobs
   ↓
5. Payload instance cached globally
   ↓
6. Subsequent requests reuse cached instance
```

**Caching differences**:

| Aspect | Development | Production |
|--------|-------------|------------|
| Payload instance | Reinitialized every request | Cached globally |
| GraphQL schema | Regenerated every request | Cached globally |
| Config file | Re-imported (HMR) | Bundled at build time |
| Database connection | Pooled (reused) | Pooled (reused) |
| React components | Fast Refresh | Static bundle |

### 4.3 Cold Start Performance

**Production cold start**:
1. Load config: ~50ms
2. Database connection: ~100-500ms (depends on DB)
3. Initialize collections: ~50ms
4. Total: ~200-600ms

**Optimization strategies**:
- Keep Payload instance alive between requests (done automatically)
- Use connection pooling for database
- Preload GraphQL schema on startup
- Bundle config at build time (no dynamic imports)

### 4.4 Request Caching Strategy

Payload uses **React's `cache()` API** for request-level caching:

```typescript
// Partial request (cached globally for request)
const partialReqCache = selectiveCache<PartialResult>('partialReq')

// Full request (cached per key)
const reqCache = selectiveCache<Result>('req')

// Example usage
const result = await partialReqCache.get(async () => {
  // Expensive operation (auth, i18n setup)
  return await initializeRequest()
}, 'global')
```

**Cache boundaries**:

```
Request starts
  ↓
Layout.tsx calls initReq({ key: 'RootLayout' })
  → partialReqCache.get('global') → Execute auth (CACHED)
  → reqCache.get('RootLayout') → Execute permissions (NOT CACHED)
  ↓
Page.tsx calls initReq({ key: 'initPage' })
  → partialReqCache.get('global') → Reuse auth (CACHED)
  → reqCache.get('initPage') → Execute permissions (NOT CACHED)
  ↓
Request ends (cache cleared)
```

**Why separate caches?**
- Auth and i18n are expensive but identical across layout and page
- Permissions depend on URL and may differ between layout and page
- Layout and page render in parallel (React 18 feature)

---

## 5. Request Handling

### 5.1 Request Flow Diagram

```
HTTP Request
  ↓
Next.js Route Handler
  ↓
createPayloadRequest()
  ├─ Parse headers
  ├─ Parse cookies
  ├─ Initialize Payload
  └─ Create PayloadRequest object
  ↓
addDataAndFileToRequest()
  ├─ Parse JSON body
  ├─ Parse multipart/form-data
  └─ Attach to req.data
  ↓
addLocalesToRequestFromData()
  ├─ Check req.data.locale
  └─ Set req.locale
  ↓
Payload Operation (find, create, update, delete)
  ↓
Access Control
  ├─ Check collection.access[operation]
  ├─ Check field.access.read/create/update
  └─ Filter results based on permissions
  ↓
Hooks Execution
  ├─ beforeOperation hooks
  ├─ beforeValidate hooks
  ├─ validate hooks
  ├─ beforeChange hooks
  ├─ afterChange hooks
  └─ afterOperation hooks
  ↓
Database Operation
  ↓
Transform Response
  ├─ Remove forbidden fields
  ├─ Populate relationships
  ├─ Apply depth
  └─ Format dates/numbers
  ↓
Response Headers
  ├─ CORS headers (if enabled)
  ├─ Set-Cookie (if auth operation)
  └─ Content-Type
  ↓
HTTP Response
```

### 5.2 createPayloadRequest()

File: `payload/src/utilities/createPayloadRequest.ts` (in main Payload package)

```typescript
export async function createPayloadRequest({
  config,
  request,
  canSetHeaders = false,
}: {
  config: SanitizedConfig
  request: Request
  canSetHeaders?: boolean
}): Promise<PayloadRequest> {
  const url = new URL(request.url)
  const headers = request.headers

  // Get Payload instance
  const payload = await getPayload({ config })

  // Parse cookies
  const cookies = parseCookies(headers)

  // Initialize i18n
  const languageCode = getRequestLanguage({ config, cookies, headers })
  const i18n = await initI18n({
    config: config.i18n,
    context: 'server',
    language: languageCode,
  })

  // Create base request object
  const req: PayloadRequest = {
    payload,
    context: {},
    fallbackLocale: null,
    headers,
    host: headers.get('host'),
    i18n,
    locale: null,
    payloadAPI: 'REST',
    query: {},
    responseHeaders: canSetHeaders ? new Headers() : null,
    routeParams: {},
    t: i18n.t,
    transactionID: null,
    url: request.url,
    urlPath: url.pathname,
    user: null,
  }

  // Execute auth strategies
  const { responseHeaders, user } = await executeAuthStrategies({
    canSetHeaders,
    headers,
    payload,
  })

  req.user = user
  if (responseHeaders) {
    req.responseHeaders = responseHeaders
  }

  return req
}
```

**executeAuthStrategies()** implementation:

```typescript
export async function executeAuthStrategies({
  headers,
  payload,
  canSetHeaders,
}: {
  headers: Headers
  payload: Payload
  canSetHeaders?: boolean
}): Promise<{
  responseHeaders: Headers | null
  user: TypedUser | null
}> {
  const responseHeaders = canSetHeaders ? new Headers() : null
  let user = null

  // Try each auth strategy in order
  for (const strategy of payload.config.admin.authStrategies || []) {
    const result = await strategy.authenticate({
      headers,
      payload,
    })

    if (result.user) {
      user = result.user

      // Refresh token if needed
      if (result.shouldRefreshToken && canSetHeaders) {
        const newToken = await payload.auth.refreshToken({
          collection: user.collection,
          token: result.token,
        })

        // Set cookie
        const cookie = generatePayloadCookie({
          collectionAuthConfig: payload.collections[user.collection].config.auth,
          cookiePrefix: payload.config.cookiePrefix,
          token: newToken,
        })

        responseHeaders.set('Set-Cookie', cookie)
      }

      break  // First successful strategy wins
    }
  }

  return { responseHeaders, user }
}
```

**Default auth strategies**:
1. **JWT strategy**: Reads token from `Authorization: Bearer <token>` header
2. **Cookie strategy**: Reads token from `payload-token` cookie
3. **API key strategy**: Reads from `Authorization: <collection> API-Key <key>` header

### 5.3 Context Propagation

Payload uses **request context** to pass data through the system:

```typescript
// In a hook or access control function
export const myHook: CollectionBeforeChangeHook = async ({ req, context }) => {
  // Add data to context
  req.context.myCustomData = 'some value'

  // Context is available in subsequent hooks/access functions
  return data
}

// Later in another hook
export const anotherHook: CollectionAfterChangeHook = async ({ req, context }) => {
  // Access data from context
  console.log(req.context.myCustomData)  // 'some value'
}
```

**Context use cases**:
- Pass IP address through to audit logs
- Store temporary computation results
- Flag special operations (e.g., seed data)
- Pass transaction objects (for database transactions)

**Context is NOT**:
- Persisted to database
- Sent to client
- Available across requests
- Available in server components (unless explicitly passed)

### 5.4 Error Handling

**Error handling strategy**:

```typescript
// In route handler
export const POST = (config) => async (request) => {
  try {
    const response = await handleEndpoints({ config, request })
    return response
  } catch (err) {
    return handleError(err, config)
  }
}

// handleError implementation
function handleError(err: Error, config: SanitizedConfig): Response {
  // Log error
  logError({ err, payload })

  // Determine status code
  let status = err.status || 500
  let message = err.message

  // Hide internal errors in production
  if (!config.debug && status === 500) {
    message = 'Something went wrong.'
  }

  // Format error response
  const body = {
    errors: [{
      message,
      name: err.name,
      data: err.data,
      stack: config.debug ? err.stack : undefined,
    }]
  }

  return Response.json(body, { status })
}
```

**Error types**:

```typescript
// Validation errors
class ValidationError extends APIError {
  status = 400
  data = [
    { field: 'email', message: 'Email is required' },
    { field: 'password', message: 'Password must be at least 8 characters' },
  ]
}

// Authentication errors
class Unauthorized extends APIError {
  status = 401
  message = 'You must be logged in.'
}

// Authorization errors
class Forbidden extends APIError {
  status = 403
  message = 'You are not allowed to perform this action.'
}

// Not found errors
class NotFound extends APIError {
  status = 404
  message = 'The requested resource was not found.'
}

// Query errors (invalid where clause)
class QueryError extends APIError {
  status = 400
  message = 'Invalid query parameters.'
}
```

**afterError hook**:

```typescript
// Global error handling
config.hooks.afterError = async ({ error, context, req }) => {
  // Log to external service
  await logToSentry({ error, user: req.user })

  // Modify error response
  if (error.status === 500) {
    return {
      response: {
        status: 500,
        body: { errors: [{ message: 'Internal server error. Please try again.' }] }
      }
    }
  }
}
```

### 5.5 Response Formatting

**Response structure**:

```typescript
// Single document
{
  "doc": {
    "id": "123",
    "title": "Hello World",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}

// Paginated list
{
  "docs": [...],
  "totalDocs": 100,
  "limit": 10,
  "page": 1,
  "totalPages": 10,
  "hasNextPage": true,
  "hasPrevPage": false,
  "nextPage": 2,
  "prevPage": null,
  "pagingCounter": 1
}

// Error
{
  "errors": [
    {
      "message": "Validation failed",
      "name": "ValidationError",
      "data": [
        { "field": "email", "message": "Email is required" }
      ]
    }
  ]
}

// Auth operations
{
  "message": "Login successful",
  "user": { "id": "123", "email": "user@example.com" },
  "token": "eyJhbGc...",  // Only if removeTokenFromResponses is false
  "exp": 1234567890
}
```

**CORS handling**:

```typescript
// In withPayload config
config.cors = [
  'https://example.com',
  'https://*.example.com',
]

// Response headers
function headersWithCors({ headers, req }: { headers: Headers, req: PayloadRequest }) {
  const origin = req.headers.get('origin')

  if (shouldAllowCors(origin, req.payload.config.cors)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  }

  return headers
}
```

---

## 6. Key Patterns for tiny-cms

### 6.1 What to Adopt

#### 6.1.1 Single Catch-All Route Pattern

**Adopt**: Use `[...slug]` route for entire admin panel

```typescript
// app/admin/[...slug]/page.tsx
export default async function AdminPage({ params, searchParams }) {
  const segments = params.slug || []

  // Parse segments to determine view
  const { view, viewParams } = parseRoute(segments)

  // Render appropriate view
  return <ViewComponent {...viewParams} />
}
```

**Benefits**:
- Single entry point for admin
- Easy to add new routes without file system changes
- Consistent routing logic
- Simplified state management (no client-side router needed)

#### 6.1.2 Server-First Architecture

**Adopt**: Render everything on server, selectively add client interactivity

```typescript
// Server component (default)
async function DocumentEdit({ docId }) {
  const doc = await db.findById(docId)
  const permissions = await getPermissions()

  return (
    <div>
      <DocumentHeader doc={doc} />
      <DocumentForm
        initialData={doc}
        permissions={permissions}
      />
    </div>
  )
}

// Client component (only for interactivity)
'use client'
function DocumentForm({ initialData, permissions }) {
  const [data, setData] = useState(initialData)
  const [errors, setErrors] = useState({})

  // Form logic...
}
```

**Benefits**:
- Faster initial page loads (no JS needed for static content)
- Better SEO (if you expose admin to search engines)
- Simpler data fetching (no client-side cache needed)
- Easier to secure (data never leaves server unless explicitly sent)

#### 6.1.3 Request Initialization Pattern

**Adopt**: Single `initReq()` function that handles auth, i18n, permissions

```typescript
export async function initReq({
  config,
  key,
}: {
  config: Config
  key: string
}) {
  const headers = await headers()
  const cookies = parseCookies(headers)

  // Cached per request
  return await cache.get(async () => {
    // Initialize database
    const db = await getDatabase({ config })

    // Authenticate user
    const user = await authenticateUser({ headers, cookies, db })

    // Load permissions
    const permissions = user ? await getPermissions({ user, db }) : null

    // Initialize i18n
    const i18n = await initI18n({ config, cookies })

    return { db, user, permissions, i18n }
  }, key)
}
```

**Benefits**:
- Consistent auth across all pages
- Easy to add new initialization logic
- Cached per request (via React's `cache()`)
- Type-safe (TypeScript infers return type)

#### 6.1.4 Route Handler Builder Pattern

**Adopt**: Single function that creates all HTTP method handlers

```typescript
// api/[...slug]/route.ts
const handlerBuilder = (config: Config) => async (
  request: Request,
  { params }: { params: { slug: string[] } }
) => {
  const path = params.slug.join('/')

  // Route to appropriate handler
  return await routeRequest({
    config,
    method: request.method,
    path,
    request,
  })
}

export const GET = handlerBuilder(config)
export const POST = handlerBuilder(config)
export const PUT = handlerBuilder(config)
export const PATCH = handlerBuilder(config)
export const DELETE = handlerBuilder(config)
```

**Benefits**:
- DRY (don't repeat yourself)
- Easy to add middleware (auth, logging, etc.)
- Consistent error handling
- Single place to update API logic

#### 6.1.5 Parallel Data Fetching

**Adopt**: Use `Promise.all()` to fetch multiple resources simultaneously

```typescript
async function DocumentView({ docId }) {
  const [
    doc,
    permissions,
    versions,
    preferences,
  ] = await Promise.all([
    db.findById(docId),
    getDocumentPermissions({ docId }),
    getVersions({ docId }),
    getPreferences({ docId }),
  ])

  return <Document {...{ doc, permissions, versions, preferences }} />
}
```

**Benefits**:
- Faster page loads (requests happen concurrently)
- Simpler than waterfall fetching
- Works with React Server Components

#### 6.1.6 Selective Caching

**Adopt**: Use React's `cache()` with namespaced keys for fine-grained control

```typescript
import { cache } from 'react'

// Create cache namespace
const authCache = cache((...args) => ({ value: null }))

export async function getAuthenticatedUser(token: string) {
  const stableObject = authCache(token)

  if (stableObject.value) {
    return stableObject.value
  }

  stableObject.value = authenticateToken(token)
  return stableObject.value
}
```

**Benefits**:
- Prevents duplicate auth checks in same request
- More control than automatic fetch deduplication
- Works with any async function (not just fetch)

### 6.2 What to Simplify

#### 6.2.1 Simplify Route Parsing

**Payload's implementation** is complex (switch statement with many cases, custom view system):

```typescript
// 480 lines of route parsing logic
export const getRouteData = ({ segments, ... }) => {
  switch (segments.length) {
    case 0: return Dashboard
    case 1: return oneSegmentViews[segments[0]]
    case 2: /* complex logic */
    default: /* very complex logic */
  }
}
```

**Tiny-CMS simplification**:

```typescript
// Simple route patterns with early returns
export function parseRoute(segments: string[]) {
  // Dashboard
  if (segments.length === 0) {
    return { view: 'dashboard' }
  }

  // Collection list
  if (segments.length === 1) {
    return { view: 'list', collection: segments[0] }
  }

  // Collection create
  if (segments.length === 2 && segments[1] === 'create') {
    return { view: 'create', collection: segments[0] }
  }

  // Collection edit
  if (segments.length === 2) {
    return { view: 'edit', collection: segments[0], id: segments[1] }
  }

  // 404
  return { view: 'notFound' }
}
```

**Why simpler?**
- Tiny-CMS doesn't need:
  - Global singletons
  - Trash bin
  - Folders
  - Multiple auth routes
  - Version history
  - Custom views
- Linear flow is easier to understand and modify

#### 6.2.2 Simplify Templates

**Payload has two templates** (Default, Minimal) with complex slot system:

```typescript
// DefaultTemplate with slots
<DefaultTemplate>
  <Slot name="header" />
  <Slot name="nav" />
  <Slot name="breadcrumbs" />
  {children}
  <Slot name="footer" />
</DefaultTemplate>
```

**Tiny-CMS simplification**:

```typescript
// Single layout with React composition
export function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <Header />
      <div className="admin-content">
        <Sidebar />
        <main>{children}</main>
      </div>
    </div>
  )
}

// Pages just render their content
export default async function CollectionListPage({ params }) {
  return <CollectionList collection={params.collection} />
}
```

**Why simpler?**
- No slot system needed (React composition is enough)
- No minimal/default templates (one layout fits all)
- Easier to customize (just edit layout component)

#### 6.2.3 Simplify Config Wrapper

**Payload's withPayload()** does a lot:

```typescript
export const withPayload = (nextConfig) => ({
  ...nextConfig,
  headers: async () => { /* 20 lines */ },
  serverExternalPackages: [ /* 20+ packages */ ],
  webpack: (config) => { /* 50 lines */ },
  outputFileTracingExcludes: { /* ... */ },
  // etc...
})
```

**Tiny-CMS simplification**:

```typescript
// next.config.js
export default {
  // No wrapper needed
  // Tiny-CMS doesn't use native dependencies (MongoDB, etc.)
  // No need for webpack customization
}
```

**Or minimal wrapper if needed**:

```typescript
export function withTinyCMS(nextConfig) {
  return {
    ...nextConfig,
    // Only what's actually needed
    serverExternalPackages: ['better-sqlite3'],
  }
}
```

**Why simpler?**
- SQLite has a single native dependency (better-sqlite3)
- No need to support multiple database adapters
- No MongoDB, PostgreSQL, Drizzle Kit complications
- Next.js defaults work for most cases

#### 6.2.4 Simplify Auth

**Payload supports** multiple strategies, API keys, OAuth, MFA, etc.

**Tiny-CMS simplification**:

```typescript
// Single JWT-based auth
export async function authenticate(token: string) {
  try {
    const payload = jwt.verify(token, SECRET)
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId)
    })
    return user
  } catch {
    return null
  }
}

// Single login route
export async function POST(request: Request) {
  const { email, password } = await request.json()

  const user = await db.query.users.findFirst({
    where: eq(users.email, email)
  })

  if (!user || !await bcrypt.compare(password, user.password)) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '7d' })

  return Response.json({ user, token })
}
```

**Why simpler?**
- No need for multiple auth strategies
- No API keys (JWT is enough for most cases)
- No OAuth (can add later if needed)
- No session store (JWT is stateless)

#### 6.2.5 Simplify Error Handling

**Payload has** complex error classes, afterError hooks, debug mode, etc.

**Tiny-CMS simplification**:

```typescript
// Single error handler
export async function handleRequest(fn: () => Promise<Response>) {
  try {
    return await fn()
  } catch (error) {
    console.error(error)

    if (error instanceof ValidationError) {
      return Response.json({ errors: error.errors }, { status: 400 })
    }

    if (error instanceof NotFoundError) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return Response.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// Usage
export const POST = (request: Request) =>
  handleRequest(async () => {
    // Your route logic
  })
```

**Why simpler?**
- No complex error hierarchy
- No afterError hooks (console.error is enough for now)
- No debug mode (use NODE_ENV instead)
- Standard HTTP status codes

### 6.3 Best Practices

#### 6.3.1 Use TypeScript Strictly

```typescript
// Define strict types for everything
type CollectionConfig<TSlug extends string = string> = {
  slug: TSlug
  fields: Field[]
  access: AccessControl
}

type PayloadRequest<TUser = any> = {
  user: TUser | null
  db: Database
  i18n: I18n
  permissions: Permissions
}

// Use generics for type safety
async function findById<TCollection extends Collection>(
  collection: TCollection,
  id: string
): Promise<InferDocType<TCollection>> {
  // Implementation
}

// Result is fully typed
const post = await findById(collections.posts, '123')
//    ^? { id: string, title: string, content: string, ... }
```

#### 6.3.2 Colocate Related Code

```typescript
// Payload spreads code across many files:
// - src/views/Document/index.tsx
// - src/views/Document/getDocumentData.ts
// - src/views/Document/getDocumentPermissions.ts
// - src/views/Document/getDocumentView.tsx
// - src/views/Document/getIsLocked.ts
// - src/views/Document/getVersions.ts
// - src/views/Document/renderDocumentSlots.tsx
// (and 8 more files)

// Tiny-CMS: Colocate in single file (or few files)
// src/views/document-edit.tsx
export async function DocumentEdit({ collection, id }) {
  // All logic in one place (or split into local functions)
  const doc = await getDocument({ collection, id })
  const permissions = await getPermissions({ collection, id })
  const formState = await buildFormState({ doc, permissions })

  return <EditForm {...{ doc, permissions, formState }} />
}

// Helper functions in same file (not exported)
async function getDocument({ collection, id }) { /* ... */ }
async function getPermissions({ collection, id }) { /* ... */ }
```

#### 6.3.3 Avoid Premature Abstraction

```typescript
// Payload abstracts everything
// - Views are customizable (Component, payloadComponent)
// - Templates are swappable (Default, Minimal)
// - Slots everywhere
// - Plugin system for everything

// Tiny-CMS: Start concrete, abstract later
// First version: Just write the UI directly
export function CollectionList({ collection }) {
  return (
    <div>
      <h1>{collection.label}</h1>
      <DataTable data={data} columns={columns} />
    </div>
  )
}

// When you need variation, use props (not complex systems)
export function CollectionList({ collection, renderHeader, renderFilters }) {
  return (
    <div>
      {renderHeader ? renderHeader() : <h1>{collection.label}</h1>}
      {renderFilters && <Filters />}
      <DataTable data={data} columns={columns} />
    </div>
  )
}
```

#### 6.3.4 Use Server Actions for Mutations

```typescript
// Instead of API routes for simple mutations
// src/actions/save-preferences.ts
'use server'

export async function savePreferences(prefs: Preferences) {
  const { user } = await initReq({ key: 'savePrefs' })

  if (!user) {
    throw new Error('Unauthorized')
  }

  await db.update(preferences)
    .set(prefs)
    .where(eq(preferences.userId, user.id))

  revalidatePath('/admin')
}

// Usage in client component
'use client'
export function PreferencesForm() {
  return (
    <form action={savePreferences}>
      <input name="theme" />
      <button type="submit">Save</button>
    </form>
  )
}
```

**Benefits**:
- No API route needed
- Automatic CSRF protection
- Progressive enhancement (works without JS)
- Type-safe (TypeScript checks action signature)

#### 6.3.5 Progressive Enhancement

```typescript
// Make forms work without JavaScript
export function LoginForm() {
  return (
    <form action="/api/auth/login" method="POST">
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Login</button>
    </form>
  )
}

// Then enhance with client-side JavaScript
'use client'
export function LoginFormEnhanced() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.target)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: formData,
    })

    // Handle response...
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Same markup */}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
```

#### 6.3.6 Optimize Database Queries

```typescript
// Payload's select API pattern is good - adopt it

// Bad: Fetch all fields
const posts = await db.query.posts.findMany()

// Good: Only fetch displayed columns
const posts = await db.query.posts.findMany({
  columns: {
    id: true,
    title: true,
    status: true,
    createdAt: true,
  },
  with: {
    author: {
      columns: {
        name: true,
        avatar: true,
      },
    },
  },
  limit: 25,
})

// Even better: Let user customize columns
const columns = getColumnsFromPreferences(user)
const posts = await db.query.posts.findMany({
  columns: columnsToSelect(columns),
  limit: 25,
})
```

#### 6.3.7 Cache Aggressively

```typescript
// Cache database connection
let cachedDb: Database | null = null

export async function getDatabase() {
  if (cachedDb) return cachedDb

  cachedDb = drizzle(/* ... */)
  return cachedDb
}

// Cache config
let cachedConfig: Config | null = null

export async function getConfig() {
  if (cachedConfig) return cachedConfig

  cachedConfig = await loadConfig()
  return cachedConfig
}

// Cache per-request (use React's cache())
import { cache } from 'react'

export const getUser = cache(async (userId: string) => {
  return await db.query.users.findFirst({
    where: eq(users.id, userId)
  })
})
```

---

## 7. Comparison with tiny-cms Needs

### 7.1 Feature Mapping

| Payload Feature | Tiny-CMS Need | Implementation Strategy |
|----------------|---------------|------------------------|
| **Catch-all routing** | ✅ Need | Adopt exactly as-is |
| **Server components** | ✅ Need | Adopt exactly as-is |
| **Request initialization** | ✅ Need | Simplify (no HMR complexity) |
| **Route handlers** | ✅ Need | Simplify (single builder pattern) |
| **GraphQL** | ❌ Don't need | Skip entirely |
| **Multiple DB adapters** | ❌ Don't need | SQLite only |
| **Plugin system** | ❌ Don't need | Direct code instead |
| **Custom components** | ⚠️ Maybe later | Start without, add if needed |
| **i18n** | ⚠️ Maybe later | English only initially |
| **Access control** | ✅ Need | Simplified (collection-level only) |
| **Hooks** | ✅ Need | Simplified (fewer hook points) |
| **File uploads** | ✅ Need | Simplified (local only initially) |
| **Rich text** | ⚠️ Maybe later | Simple textarea initially |
| **Relationships** | ✅ Need | Adopt pattern |
| **Versions** | ❌ Don't need | Skip entirely |
| **Drafts** | ⚠️ Maybe later | Skip initially |
| **Localization** | ❌ Don't need | Skip entirely |
| **Live preview** | ❌ Don't need | Skip entirely |

### 7.2 Tiny-CMS Specific Requirements

#### 7.2.1 SQLite-First Architecture

**Implication**: No need for database adapter abstraction

```typescript
// Payload abstracts database with adapters:
export type DatabaseAdapter = {
  connect: () => Promise<void>
  find: (args) => Promise<Result>
  findOne: (args) => Promise<Doc>
  // ... 20+ methods
}

// Tiny-CMS: Direct Drizzle usage
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'

const sqlite = new Database('cms.db')
const db = drizzle(sqlite)

// Use Drizzle directly everywhere
const posts = await db.query.posts.findMany()
```

#### 7.2.2 Zero Configuration

**Goal**: No config file needed for basic usage

```typescript
// Tiny-CMS approach
export function createCMS(options?: CMSOptions) {
  // Sensible defaults
  return {
    db: options?.db ?? createDatabase('cms.db'),
    collections: options?.collections ?? [],
    auth: options?.auth ?? { enabled: true },
  }
}

// Usage
const cms = createCMS()  // Works out of the box

// Or customize
const cms = createCMS({
  collections: [
    { name: 'posts', fields: [...] },
  ],
})
```

#### 7.2.3 Local File Uploads Only

**No need for**:
- S3 adapter
- GCS adapter
- Azure adapter
- Upload plugins

**Simple implementation**:

```typescript
// Save to /public/uploads
export async function uploadFile(file: File) {
  const filename = `${Date.now()}-${file.name}`
  const filepath = path.join(process.cwd(), 'public', 'uploads', filename)

  await fs.writeFile(filepath, Buffer.from(await file.arrayBuffer()))

  return `/uploads/${filename}`
}
```

#### 7.2.4 No Plugin System

**Instead of plugins**:
- Provide composable functions
- Encourage direct code modification
- Supply code recipes in docs

```typescript
// Not this (plugin API)
cms.use(pluginSearch({ collections: ['posts'] }))

// This (direct implementation)
import { setupSearch } from 'tiny-cms/search'

setupSearch(cms, {
  collections: ['posts'],
})

// Or even simpler (just use the search function)
import { searchDocuments } from 'tiny-cms/search'

const results = await searchDocuments('query', { collections: ['posts'] })
```

### 7.3 Architectural Decisions

#### 7.3.1 Single-Tenant Only

**Payload**: Designed for multi-tenant (via custom code)
**Tiny-CMS**: Single-tenant by design

**Implications**:
- No need to filter queries by `organizationId`
- No need to isolate file uploads per tenant
- Simpler database schema
- Can use global caches more aggressively

#### 7.3.2 Admin Panel Only (No Public API Initially)

**Payload**: Admin panel + public API
**Tiny-CMS**: Admin panel only (build your own public API)

**Rationale**:
- Most apps need custom API logic anyway
- Easier to secure (no public endpoints to protect)
- Smaller surface area for bugs
- Users build exactly what they need

**Recommendation**: Provide utilities for building APIs

```typescript
// Provide this
export function createCollectionAPI(collection: Collection) {
  return {
    async find(where, options) { /* ... */ },
    async findById(id) { /* ... */ },
    async create(data) { /* ... */ },
    async update(id, data) { /* ... */ },
    async delete(id) { /* ... */ },
  }
}

// User builds their own API
// app/api/posts/route.ts
const postsAPI = createCollectionAPI(collections.posts)

export async function GET() {
  const posts = await postsAPI.find({}, { published: true })
  return Response.json({ posts })
}
```

#### 7.3.3 Convention Over Configuration

**Payload**: Highly configurable (every aspect can be customized)
**Tiny-CMS**: Opinionated defaults (configuration only when needed)

**Examples**:

```typescript
// Payload requires extensive configuration
export default buildConfig({
  admin: {
    user: 'users',
    meta: {
      titleSuffix: ' - My CMS',
      favicon: '/favicon.ico',
      ogImage: '/og-image.png',
    },
    components: {
      graphics: { Icon, Logo },
      providers: [ThemeProvider],
    },
    css: path.resolve(__dirname, 'styles.css'),
    // ... 20+ more options
  },
  collections: [ /* ... */ ],
  globals: [ /* ... */ ],
  // ... 30+ more top-level options
})

// Tiny-CMS: Minimal configuration
export const cms = createCMS({
  collections: [
    { name: 'posts', fields: [ /* ... */ ] },
  ],
})

// Customization via component composition (not config)
// app/admin/layout.tsx
export default function AdminLayout({ children }) {
  return (
    <CMSProvider cms={cms}>
      <CustomThemeProvider>  {/* Your own provider */}
        {children}
      </CustomThemeProvider>
    </CMSProvider>
  )
}
```

---

## 8. Implementation Roadmap for tiny-cms

Based on this analysis, here's a suggested implementation order:

### Phase 1: Foundation (Weeks 1-2)
1. ✅ Set up monorepo structure
2. ✅ Implement `withTinyCMS()` Next.js wrapper
3. ✅ Create `getDatabase()` singleton for SQLite
4. ✅ Build `initReq()` for request initialization
5. ✅ Implement JWT auth (login, logout, refresh)

### Phase 2: Admin Routing (Weeks 3-4)
1. ✅ Create `[...slug]` catch-all route
2. ✅ Build `parseRoute()` for route parsing
3. ✅ Implement `RootLayout` with providers
4. ✅ Create `RootPage` with route resolution
5. ✅ Add dashboard view

### Phase 3: Collection Views (Weeks 5-7)
1. ✅ Build collection list view with pagination
2. ✅ Implement document create view
3. ✅ Build document edit view with form state
4. ✅ Add field components (text, number, select, etc.)
5. ✅ Implement form validation

### Phase 4: REST API (Weeks 8-9)
1. ✅ Create route handler builder
2. ✅ Implement REST endpoints (find, findById, create, update, delete)
3. ✅ Add access control checks
4. ✅ Implement error handling
5. ✅ Add request logging

### Phase 5: Advanced Features (Weeks 10-12)
1. ⏳ File uploads (local only)
2. ⏳ Relationships (populate)
3. ⏳ User preferences
4. ⏳ Search functionality
5. ⏳ Bulk operations

### Phase 6: Polish (Weeks 13-14)
1. ⏳ Add loading states
2. ⏳ Improve error messages
3. ⏳ Optimize performance
4. ⏳ Write documentation
5. ⏳ Create examples

---

## 9. Code Examples for tiny-cms

### 9.1 Minimal Next.js Config

```javascript
// next.config.js
import { withTinyCMS } from 'tiny-cms/next'

export default withTinyCMS({
  // Your Next.js config
})

// withTinyCMS implementation
export function withTinyCMS(nextConfig = {}) {
  return {
    ...nextConfig,
    serverExternalPackages: [
      ...(nextConfig.serverExternalPackages || []),
      'better-sqlite3',
    ],
  }
}
```

### 9.2 Admin Panel Setup

```typescript
// app/admin/[...slug]/layout.tsx
import { RootLayout } from 'tiny-cms/layouts'
import { cms } from '@/cms.config'

export default RootLayout({ cms })

// app/admin/[...slug]/page.tsx
import { RootPage } from 'tiny-cms/views'
import { cms } from '@/cms.config'

export default RootPage({ cms })

// cms.config.ts
import { createCMS } from 'tiny-cms'

export const cms = createCMS({
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'textarea' },
        { name: 'status', type: 'select', options: ['draft', 'published'] },
      ],
    },
  ],
})
```

### 9.3 REST API Setup

```typescript
// app/api/[...slug]/route.ts
import { createRouteHandler } from 'tiny-cms/routes'
import { cms } from '@/cms.config'

const handler = createRouteHandler(cms)

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler

// Implementation
export function createRouteHandler(cms: CMS) {
  return async (
    request: Request,
    { params }: { params: { slug: string[] } }
  ) => {
    const path = params.slug.join('/')

    try {
      // Initialize request with auth
      const req = await initReq({ cms })

      // Route to appropriate handler
      const response = await routeRequest({
        cms,
        method: request.method,
        path,
        req,
        request,
      })

      return response
    } catch (error) {
      return handleError(error)
    }
  }
}
```

### 9.4 Custom Public API

```typescript
// app/api/posts/route.ts
import { getDatabase } from 'tiny-cms/database'
import { posts } from '@/db/schema'

export async function GET(request: Request) {
  const db = await getDatabase()

  const allPosts = await db.query.posts.findMany({
    where: eq(posts.status, 'published'),
    orderBy: [desc(posts.createdAt)],
    limit: 10,
  })

  return Response.json({ posts: allPosts })
}

// app/api/posts/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = await getDatabase()

  const post = await db.query.posts.findFirst({
    where: and(
      eq(posts.id, params.id),
      eq(posts.status, 'published')
    ),
  })

  if (!post) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json({ post })
}
```

---

## 10. Conclusion

The `@payloadcms/next` package provides a **comprehensive blueprint** for building a Next.js-only CMS. Key takeaways for tiny-cms:

**Adopt wholesale**:
1. Catch-all route pattern for admin panel
2. Server-first architecture with strategic client components
3. Request initialization pattern with caching
4. Route handler builder for API endpoints
5. Parallel data fetching with Promise.all()

**Simplify aggressively**:
1. Route parsing (fewer edge cases)
2. Templates (single layout instead of two)
3. Config wrapper (minimal webpack config)
4. Auth (JWT only, no multiple strategies)
5. Error handling (simpler error classes)

**Skip entirely**:
1. GraphQL support
2. Multiple database adapters
3. Plugin system
4. Version history
5. Localization (i18n/l10n)
6. Live preview

**Key architectural principles**:
1. **Convention over configuration**: Sensible defaults, minimal config
2. **Direct over abstracted**: Use libraries directly, avoid unnecessary abstractions
3. **Explicit over magic**: Clear data flow, no hidden behavior
4. **Simple over complex**: Start simple, add complexity only when needed
5. **Server-first**: Render on server, hydrate selectively

The analysis shows that a **production-ready CMS can be built in ~2,000-3,000 lines** of TypeScript (compared to Payload's ~16,000+ lines in just the Next.js package), by ruthlessly cutting features not needed for the initial version and adopting simpler patterns.

Next steps:
1. Implement Phase 1 (Foundation) with simplified patterns
2. Build Phase 2 (Admin Routing) following catch-all route pattern
3. Create Phase 3 (Collection Views) with server components
4. Add Phase 4 (REST API) using route handler builder
5. Iterate based on real usage feedback
