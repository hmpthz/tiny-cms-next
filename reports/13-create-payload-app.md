# Create Payload App CLI - Comprehensive Analysis

## Table of Contents

1. [Package Overview](#1-package-overview)
2. [CLI Architecture](#2-cli-architecture)
3. [CLI Implementation](#3-cli-implementation)
4. [Templates System](#4-templates-system)
5. [Key Features Analysis](#5-key-features-analysis)
6. [Database Selection System](#6-database-selection-system)
7. [Next.js Integration](#7-nextjs-integration)
8. [Environment Management](#8-environment-management)
9. [Package Management](#9-package-management)
10. [Git Initialization](#10-git-initialization)
11. [File Operations](#11-file-operations)
12. [What We Need for tiny-cms CLI](#12-what-we-need-for-tiny-cms-cli)

---

## 1. Package Overview

**Location:** `payload-main/packages/create-payload-app/`

### 1.1 Directory Structure

```
create-payload-app/
├── bin/                      # CLI entry point (cli.js)
├── src/
│   ├── index.ts              # Main export
│   ├── main.ts               # Core CLI logic
│   ├── types.ts              # TypeScript types
│   ├── lib/                  # Core functionality (18 files)
│   ├── utils/                # Utility functions (6 files)
│   └── scripts/              # Build scripts (pack-template-files.ts)
```

### 1.2 Dependencies

**Core Dependencies:**

```json
{
  "@clack/prompts": "^0.7.0", // Interactive CLI prompts
  "@sindresorhus/slugify": "^1.1.0", // String slugification
  "@swc/core": "1.11.29", // TypeScript/JavaScript compiler
  "arg": "^5.0.0", // Argument parser
  "chalk": "^4.1.0", // Terminal string styling
  "comment-json": "^4.2.3", // JSON with comments parser
  "esprima-next": "^6.0.3", // JavaScript parser
  "execa": "^5.0.0", // Process execution
  "figures": "^6.1.0", // Unicode symbols
  "fs-extra": "^9.0.1", // Enhanced file system methods
  "globby": "11.1.0", // Pattern matching for files
  "tar": "^7.4.3", // Tar archive handling
  "terminal-link": "^2.1.1" // Clickable links in terminal
}
```

**Key Package Features:**

1. **@clack/prompts** - Beautiful CLI prompts with:
   - Text input
   - Select/multi-select
   - Confirm dialogs
   - Spinners and progress indicators
   - Cancel handling

2. **arg** - Minimal argument parser with:
   - Flag definitions
   - Type safety
   - Aliases support
   - Permissive mode for positional args

3. **execa** - Better child process execution:
   - Promise-based API
   - Better error handling
   - Command string parsing

### 1.3 Package Configuration

```json
{
  "name": "create-payload-app",
  "version": "3.59.1",
  "type": "module",
  "bin": {
    "create-payload-app": "bin/cli.js"
  },
  "exports": {
    "./types": "./src/types.ts",
    "./commands": "./src/lib/init-next.ts",
    "./lib/*": "./src/lib/*",
    "./utils/*": "./src/utils/*"
  },
  "engines": {
    "node": "^18.20.2 || >=20.9.0"
  }
}
```

---

## 2. CLI Architecture

### 2.1 Entry Point Flow

```
bin/cli.js
  ↓
src/index.ts (main function)
  ↓
src/main.ts (Main class)
  ↓
Main.init() method
```

**bin/cli.js:**

```javascript
#!/usr/bin/env node

import { main } from '../dist/index.js'
main()
```

**src/index.ts:**

```typescript
import { Main } from './main.js'
import { error } from './utils/log.js'

export async function main(): Promise<void> {
  try {
    await new Main().init()
  } catch (e) {
    if (e instanceof Error) {
      error(e.message)
    }
  }
}
```

### 2.2 Main Class Structure

The `Main` class in `src/main.ts` orchestrates the entire CLI flow:

```typescript
export class Main {
  args: CliArgs

  constructor() {
    // Parse CLI arguments using 'arg' library
    this.args = arg(
      {
        '--branch': String,
        '--db': String,
        '--db-accept-recommended': Boolean,
        '--db-connection-string': String,
        '--example': String,
        '--help': Boolean,
        '--local-template': String,
        '--name': String,
        '--secret': String,
        '--template': String,
        '--version': String,
        '--init-next': Boolean,
        '--no-deps': Boolean,
        '--use-bun': Boolean,
        '--use-npm': Boolean,
        '--use-pnpm': Boolean,
        '--use-yarn': Boolean,
        '--no-git': Boolean,
        '--beta': Boolean,
        '--debug': Boolean,
        '--dry-run': Boolean,
        // Aliases
        '-d': '--db',
        '-e': '--example',
        '-h': '--help',
        '-n': '--name',
        '-t': '--template',
      },
      { permissive: true },
    )
  }

  async init(): Promise<void> {
    // Main CLI logic here
  }
}
```

### 2.3 Type Definitions

**packages/create-payload-app/src/types.ts:**

```typescript
export type CliArgs = arg.Result<Args>

export type ProjectTemplate = GitTemplate | PluginTemplate

export interface GitTemplate extends Template {
  type: 'starter'
  url: string
}

export interface PluginTemplate extends Template {
  type: 'plugin'
  url: string
}

interface Template {
  description?: string
  name: string
  type: ProjectTemplate['type']
}

export type PackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn'

export type DbType = 'd1-sqlite' | 'mongodb' | 'postgres' | 'sqlite' | 'vercel-postgres'

export type DbDetails = {
  dbUri?: string
  type: DbType
}

export type NextAppDetails = {
  hasTopLevelLayout: boolean
  isPayloadInstalled?: boolean
  isSrcDir: boolean
  isSupportedNextVersion: boolean
  nextAppDir?: string
  nextConfigPath?: string
  nextConfigType?: NextConfigType
  nextVersion: null | string
}

export type NextConfigType = 'cjs' | 'esm' | 'ts'

export type StorageAdapterType = 'localDisk' | 'r2Storage' | 'vercelBlobStorage'
```

---

## 3. CLI Implementation

### 3.1 Main Flow Logic

The `init()` method in `Main` class handles three distinct scenarios:

1. **Existing Next.js Project Detection**
2. **Payload Upgrade in Existing Project**
3. **New Project Creation**

**Complete Flow:**

```typescript
// packages/create-payload-app/src/main.ts:189-452
async init(): Promise<void> {
  // 1. Get latest version and show welcome
  const LATEST_VERSION = await getLatestPackageVersion(/** ... */)
  if (this.args['--help']) { /** Show help and exit */ }

  // 2. Show welcome message
  p.intro(chalk.bgCyan(chalk.black(' create-payload-app ')))

  // 3. Detect existing Next.js project
  const nextAppDetails = await getNextAppDetails(process.cwd())

  // 4-7. Handle existing Next.js project scenarios
  if (nextConfigPath) {
    // Check version compatibility
    // Handle Payload upgrade
    // Install Payload in Next.js
    /** ... initNext flow */
    return
  }

  // 8-10. Handle new project creation
  const projectName = await parseProjectName(this.args)
  const projectDir = path.resolve(process.cwd(), slugify(projectName))

  if (exampleArg) {
    /** ... Handle example project */
  } else {
    /** ... Handle template-based project */
  }

  info('Payload project successfully created!')
  p.outro(feedbackOutro())
}
```

### 3.2 Interactive Prompts

The CLI uses `@clack/prompts` for beautiful interactive prompts:

**Project Name Prompt:**

```typescript
// packages/create-payload-app/src/lib/parse-project-name.ts

export async function parseProjectName(args: CliArgs): Promise<string> {
  if (args['--name']) {
    return slugify(args['--name'])
  }
  if (args._[0]) {
    return slugify(args._[0])
  }

  const projectName = await p.text({
    message: 'Project name?',
    validate: (value) => {
      if (!value) {
        return 'Please enter a project name.'
      }
    },
  })

  if (p.isCancel(projectName)) {
    process.exit(0)
  }

  return slugify(projectName)
}
```

**Template Selection Prompt:**

```typescript
// packages/create-payload-app/src/lib/parse-template.ts

export async function parseTemplate(
  args: CliArgs,
  validTemplates: ProjectTemplate[],
): Promise<ProjectTemplate | undefined> {
  if (args['--template']) {
    const templateName = args['--template']
    const template = validTemplates.find((t) => t.name === templateName)
    if (!template) {
      throw new Error('Invalid template given')
    }
    return template
  }

  const response = await p.select<{ label: string; value: string }[], string>({
    message: 'Choose project template',
    options: validTemplates.map((p) => {
      return {
        label: p.name,
        value: p.name,
      }
    }),
  })

  if (p.isCancel(response)) {
    process.exit(0)
  }

  return validTemplates.find((t) => t.name === response)
}
```

### 3.3 Command Line Arguments

The CLI supports extensive flags:

| Flag                      | Type    | Description                     |
| ------------------------- | ------- | ------------------------------- |
| `--name, -n`              | String  | Project name                    |
| `--template, -t`          | String  | Template to use                 |
| `--example, -e`           | String  | Example to use                  |
| `--db, -d`                | String  | Database type                   |
| `--db-accept-recommended` | Boolean | Accept default DB connection    |
| `--db-connection-string`  | String  | Custom DB connection string     |
| `--secret`                | String  | Custom Payload secret           |
| `--version`               | String  | Override Payload version        |
| `--branch`                | String  | Git branch for template/example |
| `--local-template`        | String  | Local template path (dev)       |
| `--local-example`         | String  | Local example path (dev)        |
| `--use-npm`               | Boolean | Use npm                         |
| `--use-yarn`              | Boolean | Use yarn                        |
| `--use-pnpm`              | Boolean | Use pnpm                        |
| `--use-bun`               | Boolean | Use bun                         |
| `--no-deps`               | Boolean | Skip dependency installation    |
| `--no-git`                | Boolean | Skip git initialization         |
| `--init-next`             | Boolean | Initialize in Next.js project   |
| `--debug`                 | Boolean | Enable debug logging            |
| `--dry-run`               | Boolean | Simulate without changes        |
| `--help, -h`              | Boolean | Show help message               |

---

## 4. Templates System

### 4.1 Template Structure

Templates are stored in the `templates/` directory at the root of the Payload monorepo:

```
templates/
├── blank/              # Minimal starter
├── website/            # Full website template
├── ecommerce/          # E-commerce template
├── with-cloudflare-d1/ # Cloudflare D1 integration
└── plugin/             # Plugin development template
```

### 4.2 Template Definition

**packages/create-payload-app/src/lib/templates.ts:**

```typescript
export function getValidTemplates(): ProjectTemplate[] {
  return [
    {
      name: 'blank',
      type: 'starter',
      description: 'Blank 3.0 Template',
      url: `https://github.com/payloadcms/payload/templates/blank#main`,
    },
    {
      name: 'website',
      type: 'starter',
      description: 'Website Template',
      url: `https://github.com/payloadcms/payload/templates/website#main`,
    },
    {
      name: 'ecommerce',
      type: 'starter',
      description: 'Ecommerce template',
      url: 'https://github.com/payloadcms/payload/templates/ecommerce#main',
    },
    {
      name: 'with-cloudflare-d1',
      type: 'starter',
      description: 'Blank template with Cloudflare D1 and Workers integration',
      url: 'https://github.com/payloadcms/payload/templates/with-cloudflare-d1#main',
    },
    {
      name: 'plugin',
      type: 'plugin',
      description: 'Template for creating a Payload plugin',
      url: 'https://github.com/payloadcms/payload/templates/plugin#main',
    },
  ]
}

export function validateTemplate({ templateName }: { templateName: string }): boolean {
  const validTemplates = getValidTemplates()
  if (!validTemplates.map((t) => t.name).includes(templateName)) {
    error(`'${templateName}' is not a valid template.`)
    info(`Valid templates: ${validTemplates.map((t) => t.name).join(', ')}`)
    return false
  }
  return true
}
```

### 4.3 Blank Template Structure

The `blank` template provides a minimal Next.js + Payload setup:

```
templates/blank/
├── src/
│   ├── app/
│   │   ├── (frontend)/
│   │   │   ├── page.tsx
│   │   ├── (payload)/
│   │   │   ├── admin/
│   │   │   │   └── [[...segments]]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── not-found.tsx
│   │   │   ├── api/
│   │   │   │   ├── [...slug]/
│   │   │   │   ├── graphql/
│   │   │   │   └── graphql-playground/
│   │   │   ├── custom.scss
│   │   │   └── layout.tsx
│   │   └── my-route/
│   │       └── route.ts
│   ├── collections/
│   ├── payload.config.ts
│   └── payload-types.ts
```

**Key Files:**

1. **payload.config.ts** - Main Payload configuration
2. **collections/** - Collection schemas
3. **app/(payload)/** - Admin UI routes
4. **app/(frontend)/** - Frontend routes
5. **.env.example** - Environment variables template

### 4.4 Template Payload Config

**templates/blank/src/payload.config.ts:**

```typescript
// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb' // database-adapter-import
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // database-adapter-config-start
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  // database-adapter-config-end
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
```

Notice the special comments:

- `// database-adapter-import` - Replaced with correct DB adapter import
- `// database-adapter-config-start` and `// database-adapter-config-end` - Replaced with DB config
- `// storage-adapter-placeholder` - Replaced with storage adapter config
- `// storage-adapter-import-placeholder` - Replaced with storage import

### 4.5 Template Package.json

**templates/blank/package.json:**

```json
{
  "name": "blank",
  "version": "1.0.0",
  "description": "A blank template to get started with Payload 3.0",
  "type": "module",
  "scripts": {
    "build": "cross-env NODE_OPTIONS=\"--no-deprecation\" next build",
    "dev": "cross-env NODE_OPTIONS=--no-deprecation next dev",
    "generate:importmap": "payload generate:importmap",
    "generate:types": "payload generate:types",
    "start": "cross-env NODE_OPTIONS=--no-deprecation next start"
  },
  "dependencies": {
    "@payloadcms/db-mongodb": "workspace:*",
    "@payloadcms/next": "workspace:*",
    "@payloadcms/payload-cloud": "workspace:*",
    "@payloadcms/richtext-lexical": "workspace:*",
    "@payloadcms/ui": "workspace:*",
    "cross-env": "^7.0.3",
    "graphql": "^16.8.1",
    "next": "15.4.4",
    "payload": "workspace:*",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "sharp": "0.34.2"
  },
  "engines": {
    "node": "^18.20.2 || >=20.9.0"
  }
}
```

Note: `workspace:*` dependencies are replaced with actual versions during project creation.

### 4.6 Template Download Process

**packages/create-payload-app/src/lib/download-template.ts:**

```typescript
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { x } from 'tar'

export async function downloadTemplate({
  debug,
  projectDir,
  template,
}: {
  debug?: boolean
  projectDir: string
  template: ProjectTemplate
}) {
  // Extract branch/tag from URL
  // URL format: https://github.com/payloadcms/payload/templates/blank#main
  const branchOrTag = template.url.split('#')?.[1] || 'latest'

  // GitHub codeload URL for downloading tar.gz
  const url = `https://codeload.github.com/payloadcms/payload/tar.gz/${branchOrTag}`

  // Filter path within the tarball
  // Format: payload-{branch}/templates/{template-name}/
  const filter = `payload-${branchOrTag.replace(/^v/, '').replaceAll('/', '-')}/templates/${template.name}/`

  if (debug) {
    debugLog(`Using template url: ${template.url}`)
    debugLog(`Codeload url: ${url}`)
    debugLog(`Filter: ${filter}`)
  }

  // Download and extract
  await pipeline(
    await downloadTarStream(url),
    x({
      cwd: projectDir,
      filter: (p) => p.includes(filter),
      strip: 2 + template.name.split('/').length, // Strip directory prefix
    }),
  )
}

async function downloadTarStream(url: string) {
  const res = await fetch(url)

  if (!res.body) {
    throw new Error(`Failed to download: ${url}`)
  }

  return Readable.from(res.body as unknown as NodeJS.ReadableStream)
}
```

**How it works:**

1. Parse template URL to extract branch/tag
2. Construct GitHub codeload URL: `https://codeload.github.com/payloadcms/payload/tar.gz/{branch}`
3. Download tar.gz stream from GitHub
4. Extract only files matching the filter path
5. Strip directory prefix to place files in projectDir root

### 4.7 Template Packing for Next.js Init

For the `--init-next` flow, templates are pre-packed during build:

**packages/create-payload-app/src/scripts/pack-template-files.ts:**

```typescript
async function main() {
  const root = path.resolve(dirname, '../../../../')
  const outputPath = path.resolve(dirname, '../../dist/template')
  const sourceTemplatePath = path.resolve(root, 'templates/blank')

  if (!fs.existsSync(sourceTemplatePath)) {
    throw new Error(`Source path does not exist: ${sourceTemplatePath}`)
  }

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true })
  }

  // Copy the src directory from `templates/blank` to `dist`
  const srcPath = path.resolve(sourceTemplatePath, 'src')
  const distSrcPath = path.resolve(outputPath, 'src')

  // Copy entire file structure from src to dist
  await fsp.cp(srcPath, distSrcPath, { recursive: true })
}
```

This runs during `pnpm build` and copies template files to `dist/template/` for use when installing Payload into existing Next.js projects.

---

## 5. Key Features Analysis

### 5.1 Project Creation

**packages/create-payload-app/src/lib/create-project.ts:**

```typescript
// packages/create-payload-app/src/lib/create-project.ts:604-732
export async function createProject(
  args: {
    cliArgs: CliArgs
    dbDetails?: DbDetails
    packageManager: PackageManager
    projectDir: string
    projectName: string
  } & TemplateOrExample,
): Promise<void> {
  const { cliArgs, dbDetails, packageManager, projectDir, projectName } = args

  // 1. Dry run check
  if (cliArgs['--dry-run']) {
    /** ... exit early */
  }

  // 2. Create directory and download template
  await createOrFindProjectDir(projectDir)

  // 3-5. Handle template/example download
  if (cliArgs['--local-example']) {
    /** ... copy local */
  } else if (cliArgs['--local-template']) {
    /** ... copy local */
  } else if ('template' in args) {
    /** ... download template */
  } else if ('example' in args) {
    /** ... download example */
  }

  // 6-7. Get version and update package.json
  const payloadVersion =
    /** ... get or verify version */
    await updatePackageJSON({
      /** ... */
    })

  // 8-9. Configure Payload and environment
  if ('template' in args) {
    /** ... configure by type */
  }
  await manageEnvFiles({
    /** ... */
  })

  // 10-12. Cleanup and install
  await fse.remove(path.resolve(projectDir, 'pnpm-lock.yaml'))
  if (!cliArgs['--no-deps']) {
    /** ... install deps */
  }
  if (!cliArgs['--no-git']) {
    tryInitRepoAndCommit({ cwd: projectDir })
  }
}
```

### 5.2 Package.json Updates

**Updating package.json:**

```typescript
export async function updatePackageJSON(args: {
  latestVersion: string
  projectDir: string
  projectName: string
}): Promise<void> {
  const { latestVersion, projectDir, projectName } = args
  const packageJsonPath = path.resolve(projectDir, 'package.json')

  try {
    const packageObj = await fse.readJson(packageJsonPath)
    packageObj.name = projectName

    updatePackageJSONDependencies({
      latestVersion,
      packageJson: packageObj,
    })

    await fse.writeJson(packageJsonPath, packageObj, { spaces: 2 })
  } catch (err: unknown) {
    warning(`Unable to update name in package.json. ${err instanceof Error ? err.message : ''}`)
  }
}

export function updatePackageJSONDependencies(args: {
  latestVersion: string
  packageJson: Record<string, unknown>
}): void {
  const { latestVersion, packageJson } = args

  const updatedDependencies = Object.entries(packageJson.dependencies || {}).reduce(
    (acc, [key, value]) => {
      // Replace workspace:* with actual version
      if (typeof value === 'string' && value.startsWith('workspace:')) {
        acc[key] = `${latestVersion}`
      }
      // Update Payload packages to match version
      else if (key === 'payload' || key.startsWith('@payloadcms')) {
        acc[key] = `${latestVersion}`
      } else {
        acc[key] = value
      }
      return acc
    },
    {} as Record<string, string>,
  )

  packageJson.dependencies = updatedDependencies
}
```

### 5.3 Latest Version Fetching

```typescript
async function getLatestPackageVersion({
  packageName = 'payload',
}: {
  packageName?: string
}): Promise<string> {
  try {
    const response = await fetch(`https://registry.npmjs.org/-/package/${packageName}/dist-tags`)
    const data = await response.json()

    const latestVersion =
      data &&
      typeof data === 'object' &&
      'latest' in data &&
      data.latest &&
      typeof data.latest === 'string'
        ? data.latest
        : null

    if (!latestVersion) {
      throw new Error(`No latest version found for package: ${packageName}`)
    }

    return latestVersion
  } catch (error) {
    console.error('Error fetching Payload version:', error)
    throw error
  }
}
```

---

## 6. Database Selection System

### 6.1 Database Types

**packages/create-payload-app/src/types.ts:**

```typescript
export type DbType = 'd1-sqlite' | 'mongodb' | 'postgres' | 'sqlite' | 'vercel-postgres'
```

### 6.2 Database Selection

**packages/create-payload-app/src/lib/select-db.ts:**

```typescript
type DbChoice = {
  dbConnectionPrefix?: `${string}/`
  dbConnectionSuffix?: string
  title: string
  value: DbType
}

export const dbChoiceRecord: Record<DbType, DbChoice> = {
  'd1-sqlite': {
    title: 'Cloudflare D1 SQlite',
    value: 'd1-sqlite',
  },
  mongodb: {
    dbConnectionPrefix: 'mongodb://127.0.0.1/',
    title: 'MongoDB',
    value: 'mongodb',
  },
  postgres: {
    dbConnectionPrefix: 'postgres://postgres:<password>@127.0.0.1:5432/',
    title: 'PostgreSQL',
    value: 'postgres',
  },
  sqlite: {
    dbConnectionPrefix: 'file:./',
    dbConnectionSuffix: '.db',
    title: 'SQLite',
    value: 'sqlite',
  },
  'vercel-postgres': {
    dbConnectionPrefix: 'postgres://postgres:<password>@127.0.0.1:5432/',
    title: 'Vercel Postgres',
    value: 'vercel-postgres',
  },
}

export async function selectDb(args: CliArgs, projectName: string): Promise<DbDetails> {
  let dbType: DbType | symbol | undefined = undefined

  // 1. Check for CLI argument
  if (args['--db']) {
    if (!Object.values(dbChoiceRecord).some((dbChoice) => dbChoice.value === args['--db'])) {
      throw new Error(
        `Invalid database type given. Valid types are: ${Object.values(dbChoiceRecord)
          .map((dbChoice) => dbChoice.value)
          .join(', ')}`,
      )
    }
    dbType = args['--db'] as DbType
  }
  // 2. Interactive prompt
  else {
    dbType = await p.select<{ label: string; value: DbType }[], DbType>({
      initialValue: 'mongodb',
      message: `Select a database`,
      options: Object.values(dbChoiceRecord).map((dbChoice) => ({
        label: dbChoice.title,
        value: dbChoice.value,
      })),
    })
    if (p.isCancel(dbType)) {
      process.exit(0)
    }
  }

  const dbChoice = dbChoiceRecord[dbType]

  // 3. Build initial connection string
  let dbUri: string | symbol | undefined = undefined
  const initialDbUri = `${dbChoice.dbConnectionPrefix}${
    projectName === '.' ? `payload-${getRandomDigitSuffix()}` : slugify(projectName)
  }${dbChoice.dbConnectionSuffix || ''}`

  // 4. Get connection string
  if (args['--db-accept-recommended']) {
    dbUri = initialDbUri
  } else if (args['--db-connection-string']) {
    dbUri = args['--db-connection-string']
  }
  // D1 Sqlite does not use a connection string
  else if (dbType !== 'd1-sqlite') {
    dbUri = await p.text({
      initialValue: initialDbUri,
      message: `Enter ${dbChoice.title.split(' ')[0]} connection string`,
    })
    if (p.isCancel(dbUri)) {
      process.exit(0)
    }
  }

  return {
    type: dbChoice.value,
    dbUri,
  }
}

function getRandomDigitSuffix(): string {
  return (Math.random() * Math.pow(10, 6)).toFixed(0)
}
```

### 6.3 Database Adapter Configuration

**packages/create-payload-app/src/lib/replacements.ts:**

```typescript
type DbAdapterReplacement = {
  configReplacement: (envName?: string) => string[]
  importReplacement: string
  packageName: string
}

const postgresReplacement: DbAdapterReplacement = {
  configReplacement: (envName = 'DATABASE_URI') => [
    '  db: postgresAdapter({',
    '    pool: {',
    `      connectionString: process.env.${envName} || '',`,
    '    },',
    '  }),',
  ],
  importReplacement: "import { postgresAdapter } from '@payloadcms/db-postgres'",
  packageName: '@payloadcms/db-postgres',
}

const vercelPostgresReplacement: DbAdapterReplacement = {
  configReplacement: (envName = 'POSTGRES_URL') => [
    '  db: vercelPostgresAdapter({',
    '    pool: {',
    `      connectionString: process.env.${envName} || '',`,
    '    },',
    '  }),',
  ],
  importReplacement: "import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'",
  packageName: '@payloadcms/db-vercel-postgres',
}

export const dbReplacements: Record<DbType, DbAdapterReplacement> = {
  'd1-sqlite': d1SqliteReplacement,
  mongodb: mongodbReplacement,
  postgres: postgresReplacement,
  sqlite: sqliteReplacement,
  'vercel-postgres': vercelPostgresReplacement,
}
```

### 6.4 Payload Config Modification

**packages/create-payload-app/src/lib/configure-payload-config.ts:**

```typescript
// packages/create-payload-app/src/lib/configure-payload-config.ts:989-1122
export async function configurePayloadConfig(args: {
  dbType?: DbType
  envNames?: { dbUri: string }
  packageJsonName?: string
  projectDirOrConfigPath: { payloadConfigPath: string } | { projectDir: string }
  sharp?: boolean
  storageAdapter?: StorageAdapterType
}): Promise<void> {
  if (!args.dbType) return

  // 1. Update package.json dependencies
  const packageJsonPath = /** ... resolve path */
  if (packageJsonPath) {
    // Remove other DB adapters
    // Set matching version for selected adapter
    // Handle storage adapter and sharp
    /** ... update and save package.json */
  }

  // 2-3. Find and read payload.config.ts
  const payloadConfigPath = /** ... find config file */
  const configLines = fse.readFileSync(payloadConfigPath, 'utf-8').split('\n')

  // 4-7. Replace adapters and configs
  const dbReplacement = dbReplacements[args.dbType]
  configLines = replaceInConfigLines({ /** DB import */ })
  configLines = replaceInConfigLines({ /** DB config */ })
  if (args.storageAdapter) { /** ... replace storage */ }
  if (args.sharp === false) { /** ... remove sharp */ }

  // 8. Write updated config
  fse.writeFileSync(payloadConfigPath, configLines.join('\n'))
}

function replaceInConfigLines({
  endMatch,
  lines,
  replacement,
  startMatch,
}: {
  endMatch?: string
  lines: string[]
  replacement: string[]
  startMatch: string
}) {
  if (!replacement) {
    return lines
  }

  const startIndex = lines.findIndex((l) => l.includes(startMatch))
  const endIndex = endMatch ? lines.findIndex((l) => l.includes(endMatch)) : startIndex

  if (startIndex === -1 || endIndex === -1) {
    return lines
  }

  lines.splice(startIndex, endIndex - startIndex + 1, ...replacement)
  return lines
}
```

---

## 7. Next.js Integration

### 7.1 Next.js Project Detection

**packages/create-payload-app/src/lib/init-next.ts:**

```typescript
export async function getNextAppDetails(projectDir: string): Promise<NextAppDetails> {
  const isSrcDir = fs.existsSync(path.resolve(projectDir, 'src'))

  // 1. Find next.config file (js, ts, mjs, cjs)
  const nextConfigPath: string | undefined = (
    await globby('next.config.(\\w)?(t|j)s', { absolute: true, cwd: projectDir })
  )?.[0]

  if (!nextConfigPath || nextConfigPath.length === 0) {
    return {
      hasTopLevelLayout: false,
      isSrcDir,
      isSupportedNextVersion: false,
      nextConfigPath: undefined,
      nextVersion: null,
    }
  }

  // 2. Read package.json to check Next.js version
  const packageObj = await fse.readJson(path.resolve(projectDir, 'package.json'))
  let nextVersion = null

  if (packageObj.dependencies?.next) {
    nextVersion = packageObj.dependencies.next

    // Match major version
    const versionMatch = /(?<major>\d+)/.exec(nextVersion)
    if (!versionMatch) {
      p.log.warn(`Could not determine Next.js version from ${nextVersion}`)
      return {
        hasTopLevelLayout: false,
        isSrcDir,
        isSupportedNextVersion: false,
        nextConfigPath,
        nextVersion,
      }
    }

    const { major } = versionMatch.groups as { major: string }
    const majorVersion = parseInt(major)

    // Require Next.js >= 15
    if (majorVersion < 15) {
      return {
        hasTopLevelLayout: false,
        isSrcDir,
        isSupportedNextVersion: false,
        nextConfigPath,
        nextVersion,
      }
    }
  }

  const isSupportedNextVersion = true

  // 3. Check if Payload already installed
  if (packageObj.dependencies?.payload) {
    return {
      hasTopLevelLayout: false,
      isPayloadInstalled: true,
      isSrcDir,
      isSupportedNextVersion,
      nextConfigPath,
      nextVersion,
    }
  }

  // 4. Find app directory
  let nextAppDir: string | undefined = (
    await globby(['**/app'], {
      absolute: true,
      cwd: projectDir,
      ignore: ['**/node_modules/**'],
      onlyDirectories: true,
    })
  )?.[0]

  if (!nextAppDir || nextAppDir.length === 0) {
    nextAppDir = undefined
  }

  // 5. Determine config type
  const configType = getProjectType({ nextConfigPath, packageObj })

  // 6. Check for top-level layout
  const hasTopLevelLayout = nextAppDir
    ? fs.existsSync(path.resolve(nextAppDir, 'layout.tsx'))
    : false

  return {
    hasTopLevelLayout,
    isSrcDir,
    isSupportedNextVersion,
    nextAppDir,
    nextConfigPath,
    nextConfigType: configType,
    nextVersion,
  }
}

function getProjectType(args: {
  nextConfigPath: string
  packageObj: Record<string, unknown>
}): NextConfigType {
  const { nextConfigPath, packageObj } = args

  if (nextConfigPath.endsWith('.ts')) {
    return 'ts'
  }

  if (nextConfigPath.endsWith('.mjs')) {
    return 'esm'
  }
  if (nextConfigPath.endsWith('.cjs')) {
    return 'cjs'
  }

  const packageJsonType = packageObj.type
  if (packageJsonType === 'module') {
    return 'esm'
  }
  if (packageJsonType === 'commonjs') {
    return 'cjs'
  }

  return 'cjs'
}
```

### 7.2 Installing Payload in Next.js Project

```typescript
export async function initNext(args: InitNextArgs): Promise<InitNextResult> {
  const { dbType, packageManager, projectDir } = args

  const nextAppDetails = args.nextAppDetails || (await getNextAppDetails(projectDir))

  // 1. Create app directory if not exists
  if (!nextAppDetails.nextAppDir) {
    warning(`Could not find app directory in ${projectDir}, creating...`)
    const createdAppDir = path.resolve(projectDir, nextAppDetails.isSrcDir ? 'src/app' : 'app')
    fse.mkdirSync(createdAppDir, { recursive: true })
    nextAppDetails.nextAppDir = createdAppDir
  }

  const { hasTopLevelLayout, isSrcDir, nextAppDir, nextConfigType } = nextAppDetails

  // 2. Validate Next config type
  if (!nextConfigType) {
    return {
      isSrcDir,
      nextAppDir,
      reason: `Could not determine Next Config type in ${projectDir}.`,
      success: false,
    }
  }

  // 3. Check for top-level layout
  if (hasTopLevelLayout) {
    p.log.warn(moveMessage({ nextAppDir, projectDir }))
    return {
      isSrcDir,
      nextAppDir,
      reason: 'Found existing layout.tsx in app directory',
      success: false,
    }
  }

  const installSpinner = p.spinner()
  installSpinner.start('Installing Payload and dependencies...')

  // 4. Install and configure Payload
  const configurationResult = await installAndConfigurePayload({
    ...args,
    nextAppDetails,
    nextConfigType,
    useDistFiles: true, // Use pre-packed template files
  })

  if (configurationResult.success === false) {
    installSpinner.stop(configurationResult.reason, 1)
    return { ...configurationResult, isSrcDir, success: false }
  }

  // 5. Install Payload packages
  const { success: installSuccess } = await installDeps(projectDir, packageManager, dbType)
  if (!installSuccess) {
    installSpinner.stop('Failed to install dependencies', 1)
    return {
      ...configurationResult,
      isSrcDir,
      reason: 'Failed to install dependencies',
      success: false,
    }
  }

  // 6. Add @payload-config to tsconfig.json paths
  await addPayloadConfigToTsConfig(projectDir, isSrcDir)

  installSpinner.stop('Successfully installed Payload and dependencies')
  return { ...configurationResult, isSrcDir, nextAppDir, success: true }
}

async function installAndConfigurePayload(
  args: {
    nextAppDetails: NextAppDetails
    nextConfigType: NextConfigType
    useDistFiles?: boolean
  } & InitNextArgs,
): Promise<
  | { payloadConfigPath: string; success: true }
  | { payloadConfigPath?: string; reason: string; success: false }
> {
  const {
    '--debug': debug,
    nextAppDetails: { isSrcDir, nextAppDir, nextConfigPath } = {},
    nextConfigType,
    projectDir,
    useDistFiles,
  } = args

  if (!nextAppDir || !nextConfigPath) {
    return {
      reason: 'Could not find app directory or next.config.js',
      success: false,
    }
  }

  if (!fs.existsSync(projectDir)) {
    return {
      reason: `Could not find specified project directory at ${projectDir}`,
      success: false,
    }
  }

  // Use pre-packed template files or fallback to templates/blank
  const templateFilesPath =
    dirname.endsWith('dist') || useDistFiles
      ? path.resolve(dirname, '../..', 'dist/template')
      : path.resolve(dirname, '../../../../templates/blank')

  if (!fs.existsSync(templateFilesPath)) {
    return {
      reason: `Could not find template source files from ${templateFilesPath}`,
      success: false,
    }
  }

  // Copy template files
  const templateSrcDir = path.resolve(templateFilesPath, isSrcDir ? '' : 'src')
  copyRecursiveSync(templateSrcDir, path.dirname(nextConfigPath))

  // Wrap next.config with withPayload
  await wrapNextConfig({ nextConfigPath, nextConfigType })

  return {
    payloadConfigPath: path.resolve(nextAppDir, '../payload.config.ts'),
    success: true,
  }
}

async function installDeps(projectDir: string, packageManager: PackageManager, dbType: DbType) {
  const packagesToInstall = ['payload', '@payloadcms/next', '@payloadcms/richtext-lexical'].map(
    (pkg) => `${pkg}@latest`,
  )

  packagesToInstall.push(`@payloadcms/db-${dbType}@latest`)
  packagesToInstall.push('graphql@^16.8.1')

  return await installPackages({ packageManager, packagesToInstall, projectDir })
}

async function addPayloadConfigToTsConfig(projectDir: string, isSrcDir: boolean) {
  const tsConfigPath = path.resolve(projectDir, 'tsconfig.json')

  if (!fs.existsSync(tsConfigPath)) {
    warning(`Could not find tsconfig.json to add @payload-config path.`)
    return
  }

  const userTsConfigContent = await readFile(tsConfigPath, { encoding: 'utf8' })
  const userTsConfig = parse(userTsConfigContent) as {
    compilerOptions?: CompilerOptions
  }

  const hasBaseUrl =
    userTsConfig?.compilerOptions?.baseUrl && userTsConfig?.compilerOptions?.baseUrl !== '.'
  const baseUrl = hasBaseUrl ? userTsConfig?.compilerOptions?.baseUrl : './'

  if (!userTsConfig.compilerOptions && !('extends' in userTsConfig)) {
    userTsConfig.compilerOptions = {}
  }

  if (
    !userTsConfig.compilerOptions?.paths?.['@payload-config'] &&
    userTsConfig.compilerOptions?.paths
  ) {
    userTsConfig.compilerOptions.paths = {
      ...(userTsConfig.compilerOptions.paths || {}),
      '@payload-config': [`${baseUrl}${isSrcDir ? 'src/' : ''}payload.config.ts`],
    }
    await writeFile(tsConfigPath, stringify(userTsConfig, null, 2), { encoding: 'utf8' })
  }
}
```

### 7.3 Next Config Wrapping

**packages/create-payload-app/src/lib/wrap-next-config.ts:**

The CLI automatically wraps the Next.js config with `withPayload()` using AST parsing:

```typescript
export const withPayloadStatement = {
  cjs: `const { withPayload } = require("@payloadcms/next/withPayload");`,
  esm: `import { withPayload } from "@payloadcms/next/withPayload";`,
  ts: `import { withPayload } from "@payloadcms/next/withPayload";`,
}

export const wrapNextConfig = async (args: {
  nextConfigPath: string
  nextConfigType: NextConfigType
}) => {
  const { nextConfigPath, nextConfigType: configType } = args
  const configContent = fs.readFileSync(nextConfigPath, 'utf8')

  const { modifiedConfigContent: newConfig, success } = await parseAndModifyConfigContent(
    configContent,
    configType,
  )

  if (!success) {
    return
  }

  fs.writeFileSync(nextConfigPath, newConfig)
}

export async function parseAndModifyConfigContent(
  content: string,
  configType: NextConfigType,
): Promise<{ modifiedConfigContent: string; success: boolean }> {
  // Add import statement
  content = withPayloadStatement[configType] + '\n' + content

  if (configType === 'cjs' || configType === 'esm') {
    try {
      const ast = parseModule(content, { loc: true })

      if (configType === 'cjs') {
        // Find `module.exports = X`
        const moduleExports = ast.body.find(
          (p) =>
            p.type === Syntax.ExpressionStatement &&
            p.expression?.type === Syntax.AssignmentExpression &&
            p.expression.left?.type === Syntax.MemberExpression &&
            p.expression.left.object?.type === Syntax.Identifier &&
            p.expression.left.object.name === 'module' &&
            p.expression.left.property?.type === Syntax.Identifier &&
            p.expression.left.property.name === 'exports',
        )

        if (moduleExports && moduleExports.expression.right?.loc) {
          const modifiedConfigContent = insertBeforeAndAfter(
            content,
            moduleExports.expression.right.loc,
          )
          return { modifiedConfigContent, success: true }
        }

        return Promise.resolve({
          modifiedConfigContent: content,
          success: false,
        })
      } else if (configType === 'esm') {
        // Find `export default X`
        const exportDefaultDeclaration = ast.body.find(
          (p) => p.type === Syntax.ExportDefaultDeclaration,
        )

        if (exportDefaultDeclaration && exportDefaultDeclaration.declaration?.loc) {
          const modifiedConfigContent = insertBeforeAndAfter(
            content,
            exportDefaultDeclaration.declaration.loc,
          )
          return { modifiedConfigContent, success: true }
        }

        warning('Could not automatically wrap Next config with withPayload.')
        warnUserWrapNotSuccessful(configType)
        return Promise.resolve({
          modifiedConfigContent: content,
          success: false,
        })
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        warning(`Unable to parse Next config. Error: ${error.message}`)
        warnUserWrapNotSuccessful(configType)
      }
      return {
        modifiedConfigContent: content,
        success: false,
      }
    }
  } else if (configType === 'ts') {
    // Use SWC for TypeScript
    const { moduleItems, parseOffset } = await compileTypeScriptFileToAST(content)

    const exportDefaultDeclaration = moduleItems.find(
      (m) =>
        m.type === 'ExportDefaultExpression' &&
        (m.expression.type === 'Identifier' || m.expression.type === 'CallExpression'),
    )

    if (exportDefaultDeclaration) {
      if (!('span' in exportDefaultDeclaration.expression)) {
        warning('Could not automatically wrap Next config with withPayload.')
        warnUserWrapNotSuccessful(configType)
        return Promise.resolve({
          modifiedConfigContent: content,
          success: false,
        })
      }

      const modifiedConfigContent = insertBeforeAndAfterSWC(
        content,
        exportDefaultDeclaration.expression.span,
        parseOffset,
      )
      return { modifiedConfigContent, success: true }
    }
  }

  warning('Could not automatically wrap Next config with withPayload.')
  warnUserWrapNotSuccessful(configType)
  return Promise.resolve({
    modifiedConfigContent: content,
    success: false,
  })
}

function insertBeforeAndAfter(content: string, loc: Loc): string {
  const { end, start } = loc
  const lines = content.split('\n')

  const insert = (line: string, column: number, text: string) => {
    return line.slice(0, column) + text + line.slice(column)
  }

  // insert ) after end
  lines[end.line - 1] = insert(lines[end.line - 1]!, end.column, ')')
  // insert withPayload before start
  if (start.line === end.line) {
    lines[end.line - 1] = insert(lines[end.line - 1]!, start.column, 'withPayload(')
  } else {
    lines[start.line - 1] = insert(lines[start.line - 1]!, start.column, 'withPayload(')
  }

  return lines.join('\n')
}
```

**Result:**

```javascript
// Before
const nextConfig = {
  // config
}
export default nextConfig

// After
import { withPayload } from "@payloadcms/next/withPayload"

const nextConfig = {
  // config
}
export default withPayload(nextConfig)
```

---

## 8. Environment Management

### 8.1 Generate Secret

**packages/create-payload-app/src/lib/generate-secret.ts:**

```typescript
import { randomBytes } from 'crypto'

export function generateSecret(): string {
  return randomBytes(32).toString('hex').slice(0, 24)
}
```

### 8.2 Environment File Management

**packages/create-payload-app/src/lib/manage-env-files.ts:**

```typescript
// packages/create-payload-app/src/lib/manage-env-files.ts:1662-1747
const sanitizeEnv = ({
  contents,
  databaseType,
  databaseUri,
  payloadSecret,
}: {
  contents: string
  databaseType: DbType | undefined
  databaseUri?: string
  payloadSecret?: string
}): string => {
  const seenKeys = new Set<string>()

  // 1. Add defaults if missing
  let withDefaults = contents
  if (!contents.includes('DATABASE_URI') && /** ... */) {
    withDefaults += '\nDATABASE_URI=your-connection-string-here'
  }
  if (!contents.includes('PAYLOAD_SECRET')) {
    withDefaults += '\nPAYLOAD_SECRET=YOUR_SECRET_HERE'
  }

  // 2. Process each line
  let updatedEnv = withDefaults
    .split('\n')
    .map((line) => {
      // Skip comments
      if (line.startsWith('#') || !line.includes('=')) return line
      const [key, value] = line.split('=')

      // Replace DATABASE_URI
      if (key === 'DATABASE_URI' || /** ... other DB keys */) {
        /** ... set database URI */
      }

      // Replace PAYLOAD_SECRET
      if (key === 'PAYLOAD_SECRET') {
        line = `PAYLOAD_SECRET=${payloadSecret || 'YOUR_SECRET_HERE'}`
      }

      // Remove duplicates
      if (seenKeys.has(key)) return null
      seenKeys.add(key)
      return line
    })
    .filter(Boolean)
    .join('\n')

  return `# Added by Payload\n${updatedEnv}`
}

export async function manageEnvFiles(args: {
  cliArgs: CliArgs
  databaseType?: DbType
  databaseUri?: string
  payloadSecret: string
  projectDir: string
  template?: ProjectTemplate
}): Promise<void> {
  const { cliArgs, databaseType, databaseUri, payloadSecret, projectDir, template } = args

  const debugFlag = cliArgs['--debug']

  if (cliArgs['--dry-run']) {
    debug(`DRY RUN: Environment files managed`)
    return
  }

  const pathToEnvExample = path.join(projectDir, '.env.example')
  const envPath = path.join(projectDir, '.env')

  let exampleEnv: null | string = ''

  try {
    // Skip for plugin template
    if (template?.type === 'plugin') {
      if (debugFlag) {
        debug(`plugin template detected - no .env added`)
      }
      return
    }

    // 1. Read .env.example if exists
    if (fs.existsSync(pathToEnvExample)) {
      const envExampleContents = await fs.readFile(pathToEnvExample, 'utf8')

      exampleEnv = sanitizeEnv({
        contents: envExampleContents,
        databaseType,
        databaseUri,
        payloadSecret,
      })

      if (debugFlag) {
        debug(`.env.example file successfully read`)
      }
    }

    // 2. Create .env if doesn't exist
    if (!fs.existsSync(envPath)) {
      const envContent = sanitizeEnv({
        contents: exampleEnv,
        databaseType,
        databaseUri,
        payloadSecret,
      })

      await fs.writeFile(envPath, envContent)

      if (debugFlag) {
        debug(`.env file successfully created`)
      }
    }
    // 3. Update existing .env
    else {
      const envContents = await fs.readFile(envPath, 'utf8')

      const updatedEnvContents = sanitizeEnv({
        contents: envContents,
        databaseType,
        databaseUri,
        payloadSecret,
      })

      await fs.writeFile(envPath, updatedEnvContents)

      if (debugFlag) {
        debug(`.env file successfully updated`)
      }
    }
  } catch (err: unknown) {
    error('Unable to manage environment files')
    if (err instanceof Error) {
      error(err.message)
    }
    process.exit(1)
  }
}
```

**Example .env output:**

```env
# Added by Payload
DATABASE_URI=mongodb://127.0.0.1/my-project
PAYLOAD_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2
```

---

## 9. Package Management

### 9.1 Package Manager Detection

**packages/create-payload-app/src/lib/get-package-manager.ts:**

```typescript
export async function getPackageManager(args: {
  cliArgs?: CliArgs
  projectDir: string
}): Promise<PackageManager> {
  const { cliArgs, projectDir } = args

  try {
    let detected: PackageManager = 'npm'

    // 1. Check for CLI flags
    if (cliArgs?.['--use-pnpm'] || fse.existsSync(`${projectDir}/pnpm-lock.yaml`)) {
      detected = 'pnpm'
    } else if (cliArgs?.['--use-yarn'] || fse.existsSync(`${projectDir}/yarn.lock`)) {
      detected = 'yarn'
    } else if (cliArgs?.['--use-npm'] || fse.existsSync(`${projectDir}/package-lock.json`)) {
      detected = 'npm'
    } else if (cliArgs?.['--use-bun'] || fse.existsSync(`${projectDir}/bun.lockb`)) {
      detected = 'bun'
    }
    // 2. Check if pnpm is installed globally
    else if (await commandExists('pnpm')) {
      detected = 'pnpm'
    }
    // 3. Check environment
    else {
      detected = getEnvironmentPackageManager()
    }

    return detected
  } catch (ignore) {
    return 'npm'
  }
}

function getEnvironmentPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent || ''

  if (userAgent.startsWith('yarn')) {
    return 'yarn'
  }

  if (userAgent.startsWith('pnpm')) {
    return 'pnpm'
  }

  if (userAgent.startsWith('bun')) {
    return 'bun'
  }

  return 'npm'
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execa.command(process.platform === 'win32' ? `where ${command}` : `command -v ${command}`)
    return true
  } catch {
    return false
  }
}
```

**Detection Priority:**

1. CLI flags (`--use-pnpm`, etc.)
2. Lock files in project directory
3. Global pnpm installation
4. `npm_config_user_agent` environment variable
5. Default to npm

### 9.2 Package Installation

**packages/create-payload-app/src/lib/install-packages.ts:**

```typescript
export async function installPackages(args: {
  packageManager: PackageManager
  packagesToInstall: string[]
  projectDir: string
}) {
  const { packageManager, packagesToInstall, projectDir } = args

  let exitCode = 0
  let stderr = ''

  switch (packageManager) {
    case 'bun':
    case 'pnpm':
    case 'yarn': {
      if (packageManager === 'bun') {
        warning('Bun support is untested.')
      }
      ;({ exitCode, stderr } = await execa(packageManager, ['add', ...packagesToInstall], {
        cwd: projectDir,
      }))
      break
    }
    case 'npm': {
      ;({ exitCode, stderr } = await execa('npm', ['install', '--save', ...packagesToInstall], {
        cwd: projectDir,
      }))
      break
    }
  }

  if (exitCode !== 0) {
    error(`Unable to install packages. Error: ${stderr}`)
  }

  return { success: exitCode === 0 }
}
```

**Commands executed:**

- **npm**: `npm install --save <packages>`
- **yarn**: `yarn add <packages>`
- **pnpm**: `pnpm add <packages>`
- **bun**: `bun add <packages>`

---

## 10. Git Initialization

**packages/create-payload-app/src/utils/git.ts:**

```typescript
import type { ExecSyncOptions } from 'child_process'
import { execSync } from 'child_process'

export function tryInitRepoAndCommit(args: { cwd: string }): void {
  const execOpts: ExecSyncOptions = { cwd: args.cwd, stdio: 'ignore' }

  try {
    // 1. Check if git is available
    execSync('git -v', execOpts)

    // 2. Do nothing if already in a git repo
    if (isGitRepo(execOpts)) {
      return
    }

    // 3. Initialize
    execSync('git init', execOpts)
    if (!ensureHasDefaultBranch(execOpts)) {
      execSync('git checkout -b main', execOpts)
    }

    // 4. Add and commit files
    execSync('git add -A', execOpts)
    execSync('git commit -m "feat: initial commit"', execOpts)
  } catch (_) {
    warning('Failed to initialize git repository.')
  }
}

function isGitRepo(opts: ExecSyncOptions): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', opts)
    return true
  } catch (_) {
    // Ignore errors
  }
  return false
}

function ensureHasDefaultBranch(opts: ExecSyncOptions): boolean {
  try {
    execSync(`git config init.defaultBranch`, opts)
    return true
  } catch (_) {
    // Ignore errors
  }
  return false
}
```

**Git initialization steps:**

1. Check if git is installed
2. Skip if already in a git repository
3. Initialize new repository with `git init`
4. Create `main` branch if no default branch configured
5. Add all files and create initial commit

---

## 11. File Operations

### 11.1 Recursive Copy

**packages/create-payload-app/src/utils/copy-recursive-sync.ts:**

```typescript
export function copyRecursiveSync(src: string, dest: string, ignoreRegex?: string[]): void {
  const exists = fs.existsSync(src)
  const stats = exists && fs.statSync(src)
  const isDirectory = exists && stats !== false && stats.isDirectory()

  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true })
    fs.readdirSync(src).forEach((childItemName) => {
      if (
        ignoreRegex &&
        ignoreRegex.some((regex) => {
          return new RegExp(regex).test(childItemName)
        })
      ) {
        console.log(`Ignoring ${childItemName} due to regex: ${ignoreRegex}`)
        return
      }
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName), ignoreRegex)
    })
  } else {
    fs.copyFileSync(src, dest)
  }
}
```

### 11.2 Logging Utilities

**packages/create-payload-app/src/utils/log.ts:**

```typescript
import * as p from '@clack/prompts'
import chalk from 'chalk'

export const warning = (message: string): void => {
  p.log.warn(chalk.yellow('? ') + chalk.bold(message))
}

export const info = (message: string): void => {
  p.log.step(chalk.bold(message))
}

export const error = (message: string): void => {
  p.log.error(chalk.bold(message))
}

export const debug = (message: string): void => {
  p.log.step(`${chalk.bgGray('[DEBUG]')} ${chalk.gray(message)}`)
}

export const log = (message: string): void => {
  p.log.message(message)
}
```

### 11.3 String Utilities

**packages/create-payload-app/src/utils/casing.ts:**

```typescript
export const toCamelCase = (str: string) => {
  const s = str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+\d*|\b)|[A-Z]?[a-z]+\d*|[A-Z]|\d+/g)
    ?.map((x) => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())
    .join('')
  return (s && s.slice(0, 1).toLowerCase() + s.slice(1)) ?? ''
}

export function toPascalCase(input: string): string {
  return input
    .replace(/[_-]+/g, ' ') // Replace underscores or hyphens with spaces
    .replace(/(?:^|\s+)(\w)/g, (_, c) => c.toUpperCase()) // Capitalize first letter
    .replace(/\s+/g, '') // Remove all spaces
}
```

---

## 12. What We Need for tiny-cms CLI

### 12.1 Essential Features for tiny-cms

Based on the analysis, here's what we need for a simplified tiny-cms CLI:

#### 12.1.1 Core Requirements

**1. Single Template (Blog)**

- No template selection needed
- Pre-configured blog template with Posts, Categories, Tags
- Simplified to one database choice (e.g., MongoDB or SQLite)

**2. Simplified CLI Arguments**

```typescript
{
  '--name, -n': String,          // Project name
  '--db': String,                // Database: mongodb or sqlite
  '--db-uri': String,            // Database connection string
  '--use-npm': Boolean,          // Package manager flags
  '--use-yarn': Boolean,
  '--use-pnpm': Boolean,
  '--no-deps': Boolean,          // Skip dependency installation
  '--no-git': Boolean,           // Skip git initialization
  '--help, -h': Boolean,         // Show help
}
```

**3. Simplified Flow**

```
1. Welcome message
2. Prompt for project name
3. Select database (MongoDB or SQLite)
4. Enter database URI (with smart defaults)
5. Download blog template
6. Configure Payload config
7. Generate environment file
8. Install dependencies
9. Initialize git
10. Show success message
```

#### 12.1.2 Simplified Architecture

```typescript
// src/index.ts
export async function main() {
  const cli = new TinyCMSCLI()
  await cli.init()
}

// src/cli.ts
class TinyCMSCLI {
  args: CliArgs

  async init() {
    // 1. Parse arguments
    // 2. Show welcome
    // 3. Get project details
    // 4. Create project
    // 5. Show success
  }

  async createProject() {
    // 1. Create directory
    // 2. Download template
    // 3. Update package.json
    // 4. Configure payload.config.ts
    // 5. Create .env file
    // 6. Install dependencies
    // 7. Initialize git
  }
}
```

#### 12.1.3 Key Modules to Implement

**1. Project Creation** (`lib/create-project.ts`)

```typescript
export async function createProject(args: CreateProjectArgs) {
  await createProjectDir(args.projectDir)
  await downloadTemplate(args.projectDir)
  await updatePackageJson(args)
  await configurePayloadConfig(args)
  await createEnvFile(args)
  await installDependencies(args)
  await initGit(args)
}
```

**2. Database Selection** (`lib/select-db.ts`)

```typescript
export async function selectDb(args: CliArgs): Promise<DbDetails> {
  const dbType = args['--db'] || (await promptDbType())
  const dbUri = args['--db-uri'] || (await promptDbUri(dbType))
  return { type: dbType, uri: dbUri }
}
```

**3. Template Download** (`lib/download-template.ts`)

```typescript
export async function downloadTemplate(projectDir: string) {
  // Download from GitHub or copy from local template
  // Use tar.x to extract template files
}
```

**4. Configuration** (`lib/configure-payload.ts`)

```typescript
export async function configurePayloadConfig(args: ConfigArgs) {
  // Read payload.config.ts
  // Replace database adapter
  // Update imports
  // Write back to file
}
```

**5. Environment Management** (`lib/manage-env.ts`)

```typescript
export async function createEnvFile(args: EnvArgs) {
  const env = `
DATABASE_URI=${args.dbUri}
PAYLOAD_SECRET=${generateSecret()}
  `.trim()

  await fs.writeFile(path.join(args.projectDir, '.env'), env)
}
```

#### 12.1.4 Simplified Dependencies

```json
{
  "dependencies": {
    "@clack/prompts": "^0.7.0", // Interactive prompts
    "chalk": "^4.1.0", // Terminal styling
    "arg": "^5.0.0", // Argument parsing
    "execa": "^5.0.0", // Process execution
    "fs-extra": "^9.0.1", // File operations
    "tar": "^7.4.3" // Template extraction
  }
}
```

#### 12.1.5 Blog Template Structure

```
templates/blog/
├── src/
│   ├── app/
│   │   ├── (frontend)/
│   │   │   ├── blog/
│   │   │   │   ├── [slug]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── (payload)/
│   │       ├── admin/[[...segments]]/page.tsx
│   │       ├── api/[...slug]/route.ts
│   │       └── layout.tsx
│   ├── collections/
│   ├── payload.config.ts
│   └── payload-types.ts
```

#### 12.1.6 Example Collections

**Posts Collection:**

```typescript
// templates/blog/src/collections/Posts.ts:2305-2372
import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'status', 'publishedAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'author', type: 'relationship', relationTo: 'users', required: true },
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true },
    { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    { name: 'content', type: 'richText' },
    { name: 'excerpt', type: 'textarea' },
    { name: 'status', type: 'select' /** options: draft/published */ },
    { name: 'publishedAt', type: 'date' },
  ],
}
```

**Categories Collection:**

```typescript
// templates/blog/src/collections/Categories.ts:2378-2403
export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
  ],
}
```

**Tags Collection:**

```typescript
// templates/blog/src/collections/Tags.ts:2409-2430
export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
  ],
}
```

#### 12.1.7 Simplified Usage

```bash
# Interactive mode
npx create-tiny-cms

# With arguments
npx create-tiny-cms my-blog --db mongodb --use-pnpm

# All options
npx create-tiny-cms my-blog \
  --db mongodb \
  --db-uri mongodb://localhost/my-blog \
  --use-pnpm \
  --no-git
```

#### 12.1.8 Implementation Checklist

**Phase 1: Core CLI**

- [ ] Set up project structure
- [ ] Implement argument parsing with `arg`
- [ ] Create Main CLI class
- [ ] Add interactive prompts with `@clack/prompts`
- [ ] Implement project name parsing and slugification

**Phase 2: Template System**

- [ ] Create blog template with collections
- [ ] Implement template download from GitHub
- [ ] Add local template copy for development
- [ ] Create template packing script

**Phase 3: Configuration**

- [ ] Implement database selection (MongoDB/SQLite)
- [ ] Create payload.config.ts configuration logic
- [ ] Add database adapter replacement
- [ ] Implement package.json updates

**Phase 4: Environment & Dependencies**

- [ ] Implement secret generation
- [ ] Create .env file management
- [ ] Add package manager detection
- [ ] Implement dependency installation

**Phase 5: Git & Finalization**

- [ ] Implement git initialization
- [ ] Add success messages and help text
- [ ] Create comprehensive error handling
- [ ] Add dry-run mode for testing

**Phase 6: Testing & Documentation**

- [ ] Test all CLI flows
- [ ] Add debug mode
- [ ] Write README with examples
- [ ] Create contribution guide

#### 12.1.9 Key Simplifications vs create-payload-app

1. **No Next.js detection** - Always create new project
2. **No template selection** - Single blog template
3. **No example system** - Only one template
4. **Simplified database** - Only MongoDB or SQLite
5. **No plugin template** - Focus on blog only
6. **No storage adapter** - Use local disk only
7. **No Next.js config wrapping** - Template includes correct config
8. **No Payload upgrade** - Only new projects
9. **Simplified arguments** - Fewer CLI flags
10. **No branch selection** - Always use main/latest

#### 12.1.10 File Structure Comparison

**create-payload-app (Complex):**

```
src/
├── lib/ (15 files)
│   ├── configure-payload-config.ts
│   ├── configure-plugin-project.ts
│   ├── create-project.ts
│   ├── download-example.ts
│   ├── download-template.ts
│   ├── examples.ts
│   ├── generate-secret.ts
│   ├── get-package-manager.ts
│   ├── init-next.ts              # Not needed
│   ├── install-packages.ts
│   ├── manage-env-files.ts
│   ├── parse-project-name.ts
│   ├── parse-template.ts         # Simplified
│   ├── replacements.ts
│   ├── select-db.ts              # Simplified
│   ├── templates.ts              # Simplified
│   ├── update-payload-in-project.ts  # Not needed
│   └── wrap-next-config.ts       # Not needed
├── utils/ (6 files)
└── scripts/ (1 file)
```

**create-tiny-cms (Simplified):**

```
src/
├── lib/ (8 files)
│   ├── configure-payload.ts      # Simplified
│   ├── create-project.ts         # Simplified
│   ├── download-template.ts      # Simplified
│   ├── generate-secret.ts        # Same
│   ├── get-package-manager.ts    # Same
│   ├── install-packages.ts       # Same
│   ├── manage-env.ts             # Simplified
│   └── select-db.ts              # Simplified
├── utils/ (4 files)
│   ├── copy-recursive.ts
│   ├── git.ts
│   ├── log.ts
│   └── slugify.ts
└── types.ts
```

---

## Summary

The `create-payload-app` CLI is a comprehensive tool that handles:

1. **Multiple project types**: New projects, existing Next.js projects, examples, plugins
2. **Template management**: Download and configure multiple templates from GitHub
3. **Database flexibility**: Support for 5 different databases with custom adapters
4. **Next.js integration**: Automatic detection, config wrapping, and Payload installation
5. **Environment management**: Smart .env handling with variable replacement
6. **Package management**: Detection and support for npm, yarn, pnpm, and bun
7. **Git initialization**: Automatic repository setup with initial commit
8. **Configuration manipulation**: AST-based config file modification

For **tiny-cms**, we can simplify significantly by:

1. Only supporting **new project creation** (no Next.js detection)
2. Using a **single blog template** (no template selection)
3. Supporting **2 databases** instead of 5 (MongoDB and SQLite)
4. **Pre-configured** templates (no need for config wrapping)
5. **Simplified CLI arguments** (fewer options)
6. **Smaller codebase** (~40% less code)

This analysis provides a complete blueprint for building a simplified CLI that maintains the essential features while reducing complexity for the specific use case of creating blog projects with tiny-cms.
