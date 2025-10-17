STAGE 2 Task:

Fix code snippets for all of your stage 1 reports. (start from report 12, previous ones are fixed)
You should run command `git diff 5323fdcc5e863b88129dc8 5c051792d279fcb610b5f37 | cat` and read the changes you made for reference.

- In stage 1, you simply copy-pasted the full code snippets from codebase into reports and some of them are too long that needs to be simplified. For example, if it's a long precedure with many steps, for each step try to omit most of the code with ellipsis and comments, so it looks more like "pseudo-code".
- Also read the sourcecode to understand the snippet context. You MUST write down which file and which lines are involved at the **first line of each snippet as comments**, so readers can find the full code. The file path should be relative to `payload-main/packages/`.

Rules:

- DO NOT write any script to "auto-fix" reports, you have to actually read, understand and fix.
- DO NOT read all reports at once, make a plan, fix them one by one, ALL reports should be fixed.
- ONLY edit code snippets, add file path and line numbers if missing, DO NOT touch other contents.
- DO NOT remove existing comments if lines are not removed.
- You must ACTUALLY REMOVE few lines of code not just add a new line of ellipsis.

What are considered too long and how to fix:

- the array of collection fields usually take dozens of lines, just leave a comment listing name of the fields.
- callbacks of hooks
- verbose config, plugin, options, etc.
- Any kind of long procedure or functions (like `syncDocAsSearchIndex` in `04-plugin-search.md`), make them much shorter and look more like "pseudo-code".

What should be kept: Important typings (think to decide by yourself)

You MUST follow these examples to fix others:

Original:

```typescript
const defaultFields: Field[] = [
  {
    name: 'title',
    type: 'text',
    admin: { readOnly: true },
    localized: pluginConfig.localize,
  },
  {
    name: 'priority',
    type: 'number',
    admin: { position: 'sidebar' },
  },
  {
    name: 'doc',
    type: 'relationship',
    admin: { position: 'sidebar', readOnly: true },
    index: true,
    maxDepth: 0,
    relationTo: searchCollections, // polymorphic relationship
    required: true,
  },
  {
    name: 'docUrl',
    type: 'ui',
    admin: {
      components: {
        Field: { path: '@payloadcms/plugin-search/client#LinkToDoc' },
      },
      position: 'sidebar',
    },
  },
]
```

Simplified:

```typescript
const defaultFields: Field[] = [
  { name: 'title' /** ... text type */ }
  { name: 'priority' /** ... number type */ }
  { name: 'doc' /** ... relationship type */ }
  { name: 'docUrl' /** ... ui type */ }
]
```

Original:

```typescript
// Simple upload collection
{
  slug: 'media',
  upload: true,
  fields: [
    {
      name: 'file',
      type: 'upload',
      // Custom field hooks for Supabase operations
      hooks: {
        beforeChange: async ({ value, req }) => {
          // Upload to Supabase
          const { data } = await supabaseStorage.upload(...)
          return data.path
        },
        afterRead: async ({ value }) => {
          // Generate public URL
          return supabaseStorage.getPublicUrl(value).data.publicUrl
        }
      }
    }
  ],
  hooks: {
    afterDelete: async ({ doc }) => {
      // Delete from Supabase
      await supabaseStorage.remove([doc.file])
    }
  }
}
```

Simplified:

```typescript
{
  slug: 'media',
  upload: true,
  fields: [
    {
      name: 'file',
      type: 'upload',
      // Custom field hooks for Supabase operations
      hooks: {
        beforeChange: /** ... Upload to Supabase */,
        afterRead: /** ... Generate public URL */,
      }
    }
  ],
  hooks: {
    afterDelete: /** ... Delete from Supabase */,
  }
}
```

Original:

```typescript
const {
  hasLocalizedField,
  hasLocalizedManyNumberField,
  hasLocalizedManyTextField,
  hasLocalizedRelationshipField,
  hasManyNumberField,
  hasManyTextField,
} = traverseFields({
  adapter,
  columns,
  fields,
  indexes,
  localesColumns,
  localesIndexes,
  relationships,
  relationsToBuild,
  // ... many more args
})
```

Simplified:

```typescript
const {
  hasLocalizedField,
  hasManyNumberField,
  hasManyTextField,
  // ... many more returns
} = traverseFields({
  adapter,
  columns,
  fields,
  // ... many more args
})
```
