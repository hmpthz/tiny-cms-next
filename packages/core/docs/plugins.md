# Plugin System

Tiny CMS provides a powerful plugin system that allows you to extend the core functionality.

## Creating a Plugin

A plugin is a function that transforms the CMS configuration and optionally registers routes:

```typescript
import type { Plugin, Config } from '@tiny-cms/core'

const myPlugin: Plugin = (config: Config) => {
  // Transform the configuration
  return {
    ...config,
    // Add or modify config properties
  }
}

// Optional: Register routes
myPlugin.registerRoutes = (app) => {
  app.get('/my-route', (c) => {
    const cms = c.get('cms')
    return c.json({ message: 'Hello from plugin' })
  })
}

export { myPlugin }
```

## Plugin Interface

```typescript
interface Plugin {
  /** Transform the configuration */
  (config: Config): Config

  /** Optional: Register routes with the Hono app */
  registerRoutes?: (app: Hono<TinyCmsHonoEnv>) => void
}
```

## Using Plugins

Add plugins to your CMS configuration:

```typescript
import { createCMS } from '@tiny-cms/core'
import { storagePlugin } from '@tiny-cms/plugin-storage'
import { searchPlugin } from '@tiny-cms/plugin-search'

const cms = createCMS({
  // ... config
  plugins: [
    storagePlugin({ adapter: storageAdapter }),
    searchPlugin({ engine: 'postgres' }),
  ],
})
```

## Plugin Examples

### Adding Collections

```typescript
const blogPlugin: Plugin = (config) => {
  return {
    ...config,
    collections: [
      ...config.collections,
      {
        name: 'posts',
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'content', type: 'richtext' },
          { name: 'tags', type: 'array', of: { type: 'text' } },
        ],
      },
      {
        name: 'categories',
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'slug', type: 'text', required: true },
        ],
      },
    ],
  }
}
```

### Adding Hooks

```typescript
const auditPlugin: Plugin = (config) => {
  // Add audit logging to all collections
  const collectionsWithAudit = config.collections.map(collection => ({
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: async ({ doc, context, previousDoc }) => {
        // Call existing hook if present
        if (collection.hooks?.afterChange) {
          await collection.hooks.afterChange({ doc, context, previousDoc })
        }

        // Add audit log
        console.log(`Document ${doc.id} in ${collection.name} was changed by ${context.user?.email}`)
      },
    },
  }))

  return {
    ...config,
    collections: collectionsWithAudit,
  }
}
```

### Adding API Routes

```typescript
const analyticsPlugin: Plugin = (config) => config

analyticsPlugin.registerRoutes = (app) => {
  // Add analytics endpoints
  app.get('/analytics/views', async (c) => {
    const cms = c.get('cms')
    const views = await cms.count('page_views')
    return c.json({ views })
  })

  app.post('/analytics/track', async (c) => {
    const cms = c.get('cms')
    const data = await c.req.json()

    await cms.create('events', {
      type: data.type,
      payload: data.payload,
      timestamp: new Date(),
    })

    return c.json({ tracked: true })
  })
}
```

### Extending SDK

Plugins can also extend the client SDK:

```typescript
// In your plugin package
declare module '@tiny-cms/core' {
  interface TinyCmsSDK {
    analytics: {
      track(event: string, data?: any): Promise<void>
      getViews(): Promise<number>
    }
  }
}

export function extendSDK(SDK: typeof TinyCmsSDK) {
  SDK.prototype.analytics = {
    track: async function(event: string, data?: any) {
      return this.request('/analytics/track', {
        method: 'POST',
        body: JSON.stringify({ type: event, payload: data })
      })
    },
    getViews: async function() {
      const result = await this.request('/analytics/views')
      return result.views
    }
  }
}
```

## Built-in Plugins

### Storage Plugin

Provides file upload capabilities:

```typescript
import { storagePlugin, createSupabaseAdapter } from '@tiny-cms/plugin-storage'

const adapter = createSupabaseAdapter({
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_KEY,
  bucket: 'uploads',
})

plugins: [
  storagePlugin({ adapter })
]
```

### Search Plugin

Adds full-text search capabilities:

```typescript
import { searchPlugin } from '@tiny-cms/plugin-search'

plugins: [
  searchPlugin({
    engine: 'postgres',
    collections: ['posts', 'pages'],
  })
]
```

## Plugin Best Practices

1. **Non-destructive**: Plugins should extend, not replace configuration
2. **Composable**: Design plugins to work well with others
3. **Type-safe**: Provide TypeScript definitions for all extensions
4. **Documented**: Include clear documentation and examples
5. **Tested**: Write tests for plugin functionality

## Plugin Execution Order

Plugins are executed in the order they're provided:

```typescript
plugins: [
  plugin1, // Executes first
  plugin2, // Can see changes from plugin1
  plugin3, // Can see changes from plugin1 and plugin2
]
```

Route registration happens after all config transformations are complete.