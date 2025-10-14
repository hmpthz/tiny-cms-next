# Remaining Payload Packages Analysis

**Analysis Date:** 2025-10-14
**Payload Version:** 3.59.1

This report covers Payload packages we won't need for tiny-cms MVP. Each section is brief with a focus on why we don't need them for a simple CMS.

---

## Table of Contents

1. [Email Packages](#1-email-packages)
2. [Rich Text Packages](#2-rich-text-packages)
3. [GraphQL Package](#3-graphql-package)
4. [Translations Package](#4-translations-package)
5. [Live Preview Packages](#5-live-preview-packages)
6. [Payload Cloud Package](#6-payload-cloud-package)
7. [Tooling Packages](#7-tooling-packages)
8. [Summary](#8-summary)

---

## 1. Email Packages

### Overview

Payload provides two email adapters: **nodemailer** and **resend**. The core email system defines an adapter interface with a console-based fallback for development.

**Location:** `packages/email-nodemailer`, `packages/email-resend`, `packages/payload/src/email`

### Email Adapter Interface

```typescript
// packages/payload/src/email/types.ts
export type EmailAdapter<TSendEmailResponse = unknown> = ({ payload }: { payload: Payload }) => {
  defaultFromAddress: string
  defaultFromName: string
  name: string
  sendEmail: (message: SendEmailOptions) => Promise<TSendEmailResponse>
}
```

**Console Adapter (Development):**

```typescript
// packages/payload/src/email/consoleEmailAdapter.ts
export const consoleEmailAdapter: EmailAdapter<void> = ({ payload }) => ({
  name: 'console',
  sendEmail: async (message) => {
    payload.logger.info(
      `Email attempted without being configured. To: '${message.to}', Subject: '${message.subject}'`,
    )
  },
})
```

### Email Nodemailer

**Package:** `@payloadcms/email-nodemailer`
**Dependencies:** `nodemailer@7.0.9`

```typescript
// packages/email-nodemailer/src/index.ts
export const nodemailerAdapter = async (
  args?: NodemailerAdapterArgs,
): Promise<NodemailerAdapter> => {
  const { defaultFromAddress, defaultFromName, transport } = await buildEmail(args)

  return () => ({
    name: 'nodemailer',
    defaultFromAddress,
    defaultFromName,
    sendEmail: async (message) => {
      return await transport.sendMail({
        from: `${defaultFromName} <${defaultFromAddress}>`,
        ...message,
      })
    },
  })
}
```

**Key features:**

- Async factory (builds SMTP transport)
- Auto-creates Ethereal test account if no config provided
- Optional transport verification (can skip with `skipVerify: true`)
- Returns full Nodemailer response

### Email Resend

**Package:** `@payloadcms/email-resend`
**Dependencies:** None (uses native `fetch`)

```typescript
// packages/email-resend/src/index.ts
export const resendAdapter = (args: ResendAdapterArgs): ResendAdapter => {
  const { apiKey, defaultFromAddress, defaultFromName } = args

  return () => ({
    name: 'resend-rest',
    sendEmail: async (message) => {
      const res = await fetch('https://api.resend.com/emails', {
        body: JSON.stringify(mapPayloadEmailToResendEmail(message)),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const data = await res.json()
      if ('id' in data) return data
      else throw new APIError(`Error sending email: ${res.statusCode}`)
    },
  })
}
```

**Key features:**

- Synchronous factory (no async initialization)
- Uses native `fetch` API
- Maps Payload email format to Resend API format
- Returns `{ id: string }` on success

### Integration with Payload Auth

Payload uses the email adapter for verification and password reset flows:

```typescript
// packages/payload/src/auth/sendVerificationEmail.ts
export async function sendVerificationEmail(args: Args): Promise<void> {
  const verificationURL = `${serverURL}${config.routes.admin}/${collectionConfig.slug}/verify/${token}`

  await email.sendEmail({
    from: `"${email.defaultFromName}" <${email.defaultFromAddress}>`,
    html: generateVerificationHTML({ verificationURL }),
    subject: req.t('authentication:verifyYourEmail'),
    to: user.email,
  })
}
```

### Comparison

| Feature            | Nodemailer       | Resend   |
| ------------------ | ---------------- | -------- |
| **Initialization** | Async            | Sync     |
| **Dependencies**   | nodemailer@7.0.9 | None     |
| **Protocol**       | SMTP             | REST API |
| **Test mode**      | Ethereal.email   | N/A      |
| **Bundle size**    | ~500KB           | ~50KB    |

### Why We Don't Need Them

**Better-auth already provides email functionality** for:

- Email verification with customizable templates
- Password reset with token generation
- Built-in rate limiting and security

For tiny-cms MVP:

- ✗ Don't need Payload's email adapters (better-auth has its own)
- ✗ Don't need verification email system (better-auth handles this)
- ✗ Don't need forgot password emails (better-auth handles this)
- ✓ Do need direct email provider setup for better-auth
- ✓ May need email for non-auth CMS notifications later

---

## 2. Rich Text Packages

### Overview

Payload provides two rich text editor adapters: **Lexical** (modern, complex) and **Slate** (simpler, older). Both are significantly more complex than needed for a simple CMS.

**Locations:** `packages/richtext-lexical`, `packages/richtext-slate`

### Complexity Comparison

| Metric            | Lexical      | Slate          | Simple Markdown  |
| ----------------- | ------------ | -------------- | ---------------- |
| **Files**         | ~490         | ~142           | ~5-10            |
| **Lines of Code** | ~23,785      | ~5,483         | ~500-1000        |
| **Dependencies**  | 19+ packages | 4 packages     | 1-2              |
| **Features**      | 22+ features | Basic elements | Basic formatting |
| **Bundle Size**   | 2.7 MB       | 712 KB         | ~100KB           |

### Lexical Package

**Package:** `@payloadcms/richtext-lexical`

```typescript
// packages/richtext-lexical/src/index.ts
export function lexicalEditor(args?: LexicalEditorProps): LexicalRichTextAdapterProvider {
  return async ({ config, isRoot, parentIsLocalized }) => {
    return {
      CellComponent: '@payloadcms/richtext-lexical/rsc#RscEntryLexicalCell',
      FieldComponent: '@payloadcms/richtext-lexical/rsc#RscEntryLexicalField',
      features: features, // 22+ features
      hooks: {
        afterChange: [
          /* hook */
        ],
        afterRead: [
          /* hook */
        ],
        beforeChange: [
          /* hook */
        ],
        beforeValidate: [
          /* hook */
        ],
      },
      validate: richTextValidateHOC({ editorConfig }),
    }
  }
}
```

**Default Features:**

- Text formatting: Bold, Italic, Underline, Strikethrough, Subscript, Superscript, InlineCode
- Structure: Paragraph, Heading (H1-H6), Lists (ordered/unordered/checklist), Blockquote
- Layout: Alignment, Indentation, HorizontalRule
- Advanced: Links, Relationships, Uploads, Tables

**Data Storage:**

```typescript
// Complex nested JSON structure
{
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Hello',
            format: 0,
            mode: 'normal',
            version: 1
          }
        ],
        version: 1
      }
    ],
    version: 1
  }
}
```

### Slate Package

**Package:** `@payloadcms/richtext-slate`

```typescript
// packages/richtext-slate/src/index.tsx
export function slateEditor(args: AdapterArguments): RichTextAdapterProvider {
  return async ({ config }) => {
    return {
      CellComponent: '@payloadcms/richtext-slate/rsc#RscEntrySlateCell',
      FieldComponent: {
        path: '@payloadcms/richtext-slate/rsc#RscEntrySlateField',
        serverProps: { args },
      },
      validate: richTextValidate,
    }
  }
}
```

**Features:**

- Basic formatting: Bold, italic, underline, strikethrough, code
- Elements: Headings (H1-H6), lists, blockquote, links
- Advanced: Relationships, uploads, text alignment, indentation

**Data Storage:**

```typescript
// Array of element/text nodes
;[
  {
    type: 'h1',
    children: [{ text: 'Heading' }],
  },
  {
    children: [{ text: 'Normal text ' }, { text: 'bold text', bold: true }],
  },
]
```

### Why Both Are Too Complex

**Problems they solve that we don't have:**

1. Complex block types (nested relationships, custom blocks)
2. Collaborative editing features
3. Advanced formatting (tables, alignment, text states)
4. Deep integration (GraphQL population, hooks, validation)
5. Format conversion (6+ formats for Lexical)
6. Live preview integration
7. Custom nodes with lifecycle hooks
8. Accessibility features
9. Internationalization
10. Version control with diff views

**What we actually need:**

1. Basic formatting (bold, italic, headings, lists)
2. Simple data (store markdown as string)
3. Easy rendering (markdown to HTML)
4. Validation (check if required field is not empty)
5. User-friendly toolbar

### Recommended Alternative: Simple Markdown

**Option 1: @uiw/react-md-editor** (RECOMMENDED)

```tsx
import MDEditor from '@uiw/react-md-editor'

function BlogPostEditor({ value, onChange }) {
  return <MDEditor value={value} onChange={onChange} preview="edit" height={400} />
}
```

**Data Storage:**

```typescript
// Just a string!
const content = '# Hello\n\nThis is **markdown**'
```

**Benefits:**

- Bundle size: ~100KB vs 2.7MB
- Simple debugging: console.log the string
- Git-friendly: plain text diffs
- Portable: works anywhere
- No complex JSON: just markdown text

**Implementation:**

```typescript
// In collection config
{
  name: 'content',
  type: 'textarea', // Store as plain text
  required: true,
  admin: {
    components: {
      Field: 'src/fields/markdown-field#MarkdownField',
    },
  },
}
```

**Rendering:**

```tsx
import ReactMarkdown from 'react-markdown'

export function BlogPost({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <ReactMarkdown>{post.content}</ReactMarkdown>
    </article>
  )
}
```

### Why We Don't Need Them

For tiny-cms MVP:

- ✗ Don't need Payload's richText field
- ✗ Don't import Lexical or Slate packages
- ✗ Don't need complex JSON storage
- ✓ Do use simple markdown editor like @uiw/react-md-editor
- ✓ Do store content as plain text in textarea field
- ✓ Do render with react-markdown on frontend

**Time savings:** ~10-15 hours initial setup + ongoing maintenance time

---

## 3. GraphQL Package

**Location:** `packages/graphql`

### What It Does

Automatically generates a complete GraphQL API from Payload collections and globals. It provides an alternative to the REST API with query complexity analysis, authentication, relationships, and localization support.

```typescript
// packages/graphql/src/index.ts
export function configToSchema(config: SanitizedConfig): {
  schema: GraphQLSchema
  validationRules: (args: OperationArgs) => ValidationRule[]
}
```

### Auto-Generated Operations

For each collection, GraphQL package creates:

**Queries:**

- `findPosts`: Paginated list with filtering
- `findPostByID`: Single document by ID
- `countPosts`: Count documents
- `docAccessPost`: Check document permissions
- `findPostVersions`: List versions (if versioning enabled)
- `findPostVersionByID`: Get specific version

**Mutations:**

- `createPost`: Create new document
- `updatePost`: Update existing document
- `deletePost`: Delete document
- `restorePostVersion`: Restore a version

**Auth Operations (for auth collections):**

- `loginUser`: Login mutation
- `logoutUser`: Logout mutation
- `meUser`: Current user query
- `refreshTokenUser`: Token refresh
- `forgotPasswordUser`: Password reset request
- `resetPasswordUser`: Password reset

### Schema Generation

```typescript
// Field types mapped to GraphQL types
- Text fields → GraphQLString
- Number fields → GraphQLInt/GraphQLFloat
- Relationship fields → Object references with resolvers
- Array/Block fields → Custom list types
```

### Query Complexity Control

```typescript
const validationRules = [
  createComplexityRule({
    estimators: [fieldExtensionsEstimator(), simpleEstimator()],
    maximumComplexity: config.graphQL.maxComplexity,
  }),
]
```

Prevents malicious queries like deeply nested relationship requests that could overload the server.

### Why We Don't Need It

**For tiny-cms MVP, we're building REST-only API:**

1. **Simplicity**: REST is more straightforward
2. **Smaller Bundle**: GraphQL adds significant dependencies (graphql, graphql-scalars, pluralize)
3. **Easier Debugging**: REST endpoints easier to test with standard tools
4. **Sufficient for CRUD**: REST handles basic CRUD operations perfectly

**GraphQL would be valuable for:**

- Complex frontend requirements with varied data needs
- Mobile apps needing optimized data fetching
- Third-party integrations requiring flexible queries
- Applications with many relationships and deep nesting

---

## 4. Translations Package

**Location:** `packages/translations`

### What It Does

Provides internationalization (i18n) for Payload's admin UI with translations for **45+ languages** and utilities for managing translations at runtime.

### Supported Languages

Arabic, Azerbaijani, Bengali, Bulgarian, Catalan, Czech, Danish, German, English, Spanish, Estonian, Persian, French, Hebrew, Croatian, Hungarian, Armenian, Indonesian, Icelandic, Italian, Japanese, Korean, Norwegian, Dutch, Polish, Portuguese (Brazil & Portugal), Romanian, Russian, Swedish, Thai, Turkish, Ukrainian, Chinese (Simplified & Traditional), and more.

### Translation Categories

Each language file includes:

**Authentication** (~50 keys):

```typescript
{
  account: 'Account',
  authenticated: 'Authenticated',
  changePassword: 'Change Password',
  confirmPassword: 'Confirm Password',
  emailNotValid: 'The email provided is not valid',
  forgotPassword: 'Forgot Password',
  login: 'Login',
  logout: 'Log out',
  // ... more
}
```

**General UI** (~200 keys):

```typescript
{
  add: 'Add',
  addNew: 'Add New',
  cancel: 'Cancel',
  clear: 'Clear',
  close: 'Close',
  save: 'Save',
  // ... more
}
```

**Validation** (~30 keys):

```typescript
{
  emailAddress: 'Please enter a valid email address',
  required: 'This field is required',
  notValidDate: 'Value is not a valid date',
  // ... more
}
```

**Other categories:** Fields, Error messages, Upload UI, Version history, Filter operators, Navigation

### Usage

```typescript
// In React component
import { useTranslation } from '@payloadcms/ui'

const MyComponent = () => {
  const { t } = useTranslation()
  return <button>{t('general:save')}</button>
}
```

### Config Integration

```typescript
export default buildConfig({
  admin: {
    language: 'en', // Default language
    // Or dynamic:
    language: (req) => req.user?.language || 'en',
  },
})
```

### Why We Don't Need It

**For tiny-cms MVP, we'll only support English:**

1. **Single Language**: Reduces complexity significantly
2. **Hardcoded Strings**: Use English strings directly in UI
3. **Smaller Bundle**: Avoid 45+ language files and date-fns locales
4. **Faster Load**: No runtime language detection or switching
5. **Simpler Code**: No need to wrap every string in `t()`

```typescript
// Instead of: <button>{t('general:save')}</button>
// We'll use: <button>Save</button>
```

We can add internationalization later when:

- Users request specific languages
- Core functionality is validated
- We have resources to maintain translations
- We want to expand to international markets

---

## 5. Live Preview Packages

**Locations:** `packages/live-preview`, `packages/live-preview-react`, `packages/live-preview-vue`

### What It Does

Live preview allows content editors to see changes in real-time as they edit in the Payload admin panel. Changes appear instantly in a preview pane using window messaging.

### Architecture

```
┌─────────────────────────────────────────┐
│   Payload Admin Panel (iframe parent)   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Edit Form (Left Side)           │ │
│  │   - User types in fields          │ │
│  │   - Changes trigger postMessage   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Preview Iframe (Right Side)     │ │
│  │   - Listens for messages          │ │
│  │   - Merges data with initial doc  │ │
│  │   - Re-renders with new data      │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Core Package (@payloadcms/live-preview)

**Key Functions:**

```typescript
// packages/live-preview/src/subscribe.ts
export const subscribe = <T>(args: {
  callback: (data: T) => void
  initialData: T
  serverURL: string
}): MessageHandler => {
  const onMessage = async (event: MessageEvent) => {
    const mergedData = await handleMessage({ event, initialData })
    callback(mergedData)
  }
  window.addEventListener('message', onMessage)
  return onMessage
}

// packages/live-preview/src/ready.ts
export const ready = (args: { serverURL: string }): void => {
  window.parent.postMessage({ type: 'payload-live-preview', ready: true }, serverURL)
}
```

### React Package (@payloadcms/live-preview-react)

```typescript
// packages/live-preview-react/src/useLivePreview.ts
export const useLivePreview = <T>(props: {
  initialData: T
  serverURL: string
  depth?: number
}): { data: T; isLoading: boolean } => {
  const [data, setData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const subscription = subscribe({
      ...props,
      callback: (mergedData) => {
        setData(mergedData)
        setIsLoading(false)
      },
    })

    ready({ serverURL: props.serverURL })

    return () => unsubscribe(subscription)
  }, [])

  return { data, isLoading }
}
```

### Usage Example

```typescript
// app/posts/[slug]/page.tsx
'use client'
import { useLivePreview } from '@payloadcms/live-preview-react'

export default function PostPreview({ post }) {
  const { data, isLoading } = useLivePreview({
    initialData: post,
    serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
    depth: 2,
  })

  if (isLoading) return <div>Loading preview...</div>

  return (
    <article>
      <h1>{data.title}</h1>
      <div>{data.content}</div>
    </article>
  )
}
```

### Admin Configuration

```typescript
export default buildConfig({
  collections: [
    {
      slug: 'posts',
      admin: {
        livePreview: {
          url: ({ data }) => `${process.env.NEXT_PUBLIC_URL}/posts/${data.slug}/preview`,
        },
      },
    },
  ],
})
```

### Why We Don't Need It

**For tiny-cms MVP, live preview is not essential:**

1. **MVP Scope**: Basic CRUD is sufficient initially
2. **Complexity**: Requires iframe messaging, relationship handling, auth tokens
3. **Frontend Dependency**: Needs frontend framework integration
4. **Performance**: Adds overhead for real-time updates
5. **Use Case**: Most valuable for marketing/content teams

For MVP, editors can:

1. Save draft
2. Click "View" button
3. See changes in new tab

This is simpler and sufficient for initial validation.

**Live preview would be valuable later for:**

- Teams doing heavy content editing
- Marketing landing pages
- Visual content verification
- Client demos
- Complex layouts with many relationships

---

## 6. Payload Cloud Package

**Location:** `packages/payload-cloud`

### What It Does

A plugin that automatically configures Payload applications for Payload Cloud's hosting infrastructure. Provides:

- Automatic file storage to AWS S3 (via Payload Cloud's CDN)
- Integrated email service through AWS SES
- Background job coordination across multiple instances
- Upload caching for better performance

**This package is specifically designed for Payload Cloud hosting and has no value outside that environment.**

### Core Plugin

```typescript
// packages/payload-cloud/src/plugin.ts
export const payloadCloudPlugin =
  (pluginOptions?: PluginOptions) =>
  async (incomingConfig: Config): Promise<Config> => {
    // Only activate on Payload Cloud
    if (process.env.PAYLOAD_CLOUD !== 'true') {
      return incomingConfig
    }

    // Configure cloud storage, email, and job coordination
    return configureCloudServices(incomingConfig, pluginOptions)
  }
```

### Features

**1. Cloud Storage:**

- Automatically uploads files to S3
- Uses Payload Cloud's CDN
- Disables local storage
- Handles delete operations

**2. Cloud Email:**

- Configures AWS SES
- Automatic domain verification
- Managed credentials

**3. Job Coordination:**

- Ensures background jobs run on only one instance
- Instance election system
- Prevents duplicate job execution

**4. Upload Caching:**

- Caches frequently accessed files
- Edge location serving
- Cache invalidation on delete

### Why We Don't Need It

**For tiny-cms, we don't need this package:**

1. **Not Using Payload Cloud**: We're self-hosting
2. **Local File Storage**: We'll use local storage or our own S3 adapter
3. **Standard Email**: We can configure email directly with nodemailer
4. **Single Instance**: MVP will run on single instance, no coordination needed
5. **No Cloud Features**: Cache coordination, CDN, etc. are Payload Cloud-specific

This package is purely for Payload Cloud customers. If we ever migrate to Payload Cloud hosting, we'd simply add the plugin.

For self-hosting, we handle:

- File storage: Direct S3 integration or local storage
- Email: Direct SMTP/SendGrid/etc configuration
- Jobs: Single instance or manual coordination
- Caching: Our own CDN/caching strategy

---

## 7. Tooling Packages

### A. eslint-config

**Location:** `packages/eslint-config`
**Package:** `@payloadcms/eslint-config`

#### What It Does

Shareable ESLint configuration that enforces code style and best practices across the Payload monorepo.

#### Configuration Stack

```javascript
// packages/eslint-config/index.mjs
export default [
  // Base rules
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React
  reactPlugin.configs.recommended,
  reactHooksPlugin.configs.recommended,

  // Accessibility
  jsxA11y.configs.recommended,

  // Import organization
  importPlugin.configs.recommended,

  // Code sorting
  perfectionistPlugin.configs.recommended,

  // Custom Payload rules
  payloadPlugin,
]
```

#### Notable Rules

```javascript
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'import-x/order': ['error', { alphabetize: { order: 'asc' } }],
    'perfectionist/sort-imports': 'error',
  }
}
```

#### Why We Don't Need It

**For tiny-cms:**

1. **Custom Preferences**: We may have our own style
2. **Simpler Setup**: Fewer rules = faster linting
3. **Learning Overhead**: Understanding all rules takes time
4. **Opinionated**: Some rules may not fit our needs

We can use it as a reference for good practices and cherry-pick specific rules we like.

---

### B. eslint-plugin

**Location:** `packages/eslint-plugin`
**Package:** `@payloadcms/eslint-plugin`

#### What It Does

Contains custom ESLint rules specific to Payload development that enforce Payload-specific patterns.

```javascript
// Example custom rules (hypothetical):
{
  rules: {
    'payload/no-async-access': {
      // Enforce access control functions are sync
    },
    'payload/proper-hook-types': {
      // Ensure hooks have correct type signatures
    }
  }
}
```

#### Why We Don't Need It

**For tiny-cms:**

1. **Not Building Payload**: We're building our own CMS
2. **Different Patterns**: Our architecture may differ
3. **Unnecessary**: Custom rules are for maintaining large codebases

If we were contributing to Payload, this would be essential. For tiny-cms, it's irrelevant.

---

## 8. Summary

### Package Overview

| Package                | Purpose                       | Complexity | Need for tiny-cms          |
| ---------------------- | ----------------------------- | ---------- | -------------------------- |
| **email-nodemailer**   | SMTP email adapter            | Low        | No - better-auth has email |
| **email-resend**       | Resend API adapter            | Low        | No - better-auth has email |
| **richtext-lexical**   | Modern rich text editor       | Very High  | No - use simple markdown   |
| **richtext-slate**     | Older rich text editor        | High       | No - use simple markdown   |
| **graphql**            | GraphQL API generation        | High       | No - REST only for MVP     |
| **translations**       | Admin UI i18n (45+ languages) | Medium     | No - English only          |
| **live-preview**       | Real-time preview core        | High       | No - not MVP feature       |
| **live-preview-react** | React hooks for preview       | Medium     | No - not MVP feature       |
| **live-preview-vue**   | Vue composables for preview   | Medium     | No - not MVP feature       |
| **payload-cloud**      | Payload Cloud hosting plugin  | Low        | No - self-hosting          |
| **eslint-config**      | Shared ESLint config          | Low        | No - own preferences       |
| **eslint-plugin**      | Custom ESLint rules           | Low        | No - not extending Payload |

### Key Takeaways

1. **Email Packages**: Better-auth provides email functionality (verification, password reset), so we don't need Payload's email adapters.

2. **Rich Text Packages**: Both Lexical (~490 files, 23,785 lines) and Slate (~142 files, 5,483 lines) are dramatically more complex than needed. Use simple markdown editor like @uiw/react-md-editor instead (~5-10 files, 500-1000 lines).

3. **GraphQL**: Comprehensive auto-generation from schema, but REST is simpler and sufficient for MVP.

4. **Translations**: 45+ languages with full i18n support, but English-only is simpler initially.

5. **Live Preview**: Powerful real-time editing with iframe messaging, but not essential for basic content editing.

6. **Payload Cloud**: Environment-specific plugin with zero value for self-hosting.

7. **Tooling**: ESLint config and plugin are for Payload development, not for using Payload.

### What We Actually Need for MVP

**Core packages only:**

- `payload` (core functionality)
- `db-mongodb` (database adapter)
- `ui` (admin UI components)
- `next` (Next.js integration)

**Plus simple alternatives:**

- Simple markdown editor (not Payload's rich text)
- Better-auth for email (not Payload's email adapters)
- REST API only (not GraphQL)
- English only (not translations)

### Total Complexity Avoided

By not using these packages, we avoid:

- **~50,000+ lines** of complex editor code
- **45+ language files** and i18n overhead
- **GraphQL layer** with schema generation
- **Live preview** iframe messaging system
- **Email adapter abstraction** (better-auth has it)
- **Cloud-specific** integrations

### Estimated Time Savings

**Using Payload's full ecosystem:**

- Rich text setup: 4-8 hours
- GraphQL understanding: 2-4 hours
- Live preview integration: 4-6 hours
- Email adapter setup: 1-2 hours
- Total: **~15-25 hours** initial + ongoing maintenance

**Using simple alternatives:**

- Markdown editor: 30 minutes
- Direct better-auth email: 1 hour
- REST only: 0 hours (already planned)
- English strings: 0 hours (just write them)
- Total: **~1.5 hours**

**Savings: ~15-25 hours for MVP**

### Conclusion

All remaining packages demonstrate Payload's enterprise-grade features, but for tiny-cms MVP, we can start much simpler and add complexity only when user needs demand it.

**Focus on:**

- Solid REST API (collections, globals, auth)
- File uploads (local or S3)
- Basic admin UI
- MongoDB integration
- Simple markdown editor

**Everything else can wait for v2.**

---

_End of Report_
