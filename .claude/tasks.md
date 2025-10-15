At @payload-main/ this is Payload CMS monorepo, an industry-level, production-ready headless CMS built with Next.js. It's powerful, flexible, fully customizable, and supports many plugins.
Imagine you're a senior dev who's going to mentor me on how to design and write a CMS from scratch. Payload CMS is way too complex for single devs to understand. Because it's designed for plugins and customizations, there are many bloated design decisions that is not necessary for a simple CMS.
Your main job is to read and understand the entire monorepo codebase, then write a much simplified version of it at the root directory, following similar design patterns and architecture, but strip of those bloated designs for customizations. The new CMS design should be somewhere between Payload CMS and a toy project that you would typically see in a video tutorial.

Requirements:

- New CMS is named "tiny-cms", do not leave the name "payload"
- This CMS is for nextjs ONLY, you don't need to think of any other frameworks.
- Manage monorepo with pnpm workpace, no turborepo.
- No multiple database implementations, only use postgreSQL. Use `kysely` as the ORM instead of `drizzle`.
- No multiple storage implementations, only use s3-compatible `@supabase/storage-js`. Keep the adapter interface for both database and storage, but make them much simpler, we don't need many advanced features.
- No payload-cloud service.
- Only keep "plugin-search", no other plugins like ecommerce, etc.
- No rich text editor and its complex live preview. Try pick a simple and easy to use react markdown editor and renderer instead.
- Use `next-intl` for translations, but for now only write english.
- **Important**: Rewrite auth system using `better-auth`. Be extra careful since it'll be interacted with many other modules.
- No email packages (better-auth already has it)
- No multiple tempaltes, only write a blog template, styles and layouts are minimal.
- There are lots of config files for various tools at root directory and package directories. Keep most of them, but anything about path should be changed since we'll remove, rename or simplify them.

STAGE 1 Task:

You read and analyze the entire monorepo, package by package. For each one, write a detailed report markdown under @reports/ . It includes a summary of the package, some important design architecture and implementation details, its dependencies, etc. As you read through them, you should also write down how one is interacted / integrated with others.

- Reports should list important files and directories (relative path only, NO absolute paths), basically, they're like a reference that agents can easily navigate. Name the files with number prefix.
- Some packages like core `packages/payload` are huge so you might split them into multiple report files, ESPECIALLY the auth system. For others, each report file must only cover one type of packages (like database, storage, plugin, etc.). DO NOT combine them into a "other packages".
- Most packages themselves have unit and e2e tests, write a short test overview into corresponding reports (a few lines are fine). Other tests under `test/` might involve multiple pakcages, you may write a separate test report for them. We won't rely on thest test reports so you can make it short.
- After you finish individual packages, write a report for the big picture of entire monorepo, explain the overall architecture and how packages are integrated with each other. This number prefix of this report is 1.

Note: 1. According to requirements, some packages are not needed, but you STILL HAVE TO write reports for them, you can just write brielfy. For others, please **ultrathink** to understand their design and implementations, write detailed reports. 2. Remember you have the entire monorepo, including both sourcecode and docs, utilize these informations. 3. If you need extra help online, use exa-code

STAGE 2 Task:

Fix code snippets for all of your stage 1 reports. (start from report 10, previous ones are fixed)
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
