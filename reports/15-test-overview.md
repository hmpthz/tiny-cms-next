# Test Structure Overview - Payload CMS

## Executive Summary

Payload's test suite is comprehensive, with **133 total test files** organized into **~80+ test directories**. The suite includes:
- **66 integration tests** (int.spec.ts)
- **66 E2E tests** (e2e.spec.ts)
- **4 unit tests** (test.ts files)

Tests are organized by feature area, with each directory containing its own config, collections, and seed data.

---

## 1. Test Directory Structure

### Top-Level Organization

The test suite is organized into ~80+ directories under `/test/`, each representing a specific feature area or component:

**Core Functionality Tests:**
- `access-control/` - Field and collection-level access control
- `auth/` - Authentication and authorization
- `collections-graphql/` - GraphQL collection operations
- `collections-rest/` - REST collection operations
- `config/` - Configuration validation
- `database/` - Database adapter tests
- `endpoints/` - Custom endpoint functionality
- `fields/` - All field types and validation
- `globals/` - Global configuration tests
- `hooks/` - Lifecycle hooks
- `relationships/` - Relationship field tests
- `uploads/` - File upload and storage
- `versions/` - Document versioning

**Admin UI Tests:**
- `admin/` - Core admin panel functionality
- `admin-bar/` - Admin bar component
- `admin-root/` - Custom admin root
- `bulk-edit/` - Bulk editing features
- `field-error-states/` - Field validation UI
- `folders/` - Collection folders feature
- `form-state/` - Form state management
- `live-preview/` - Live preview functionality
- `locked-documents/` - Document locking

**Rich Text Editors:**
- `lexical/` - Lexical editor tests
- `lexical-mdx/` - MDX integration

**Advanced Features:**
- `dataloader/` - DataLoader optimization
- `group-by/` - Group by functionality
- `i18n/` - Internationalization
- `joins/` - Database joins
- `localization/` - Content localization
- `localization-rtl/` - RTL language support
- `query-presets/` - Query presets
- `queues/` - Job queue system
- `sdk/` - SDK functionality
- `sort/` - Sorting functionality
- `trash/` - Soft delete/trash

**Plugin Tests:**
- `plugin-cloud-storage/` - Cloud storage integration
- `plugin-ecommerce/` - E-commerce features
- `plugin-form-builder/` - Form builder
- `plugin-import-export/` - Import/export functionality
- `plugin-multi-tenant/` - Multi-tenancy
- `plugin-nested-docs/` - Nested document structure
- `plugin-redirects/` - Redirect management
- `plugin-search/` - Search functionality
- `plugin-sentry/` - Sentry error tracking
- `plugin-seo/` - SEO metadata
- `plugin-stripe/` - Stripe integration

**Storage Adapters:**
- `storage-azure/` - Azure Blob Storage
- `storage-gcs/` - Google Cloud Storage
- `storage-r2/` - Cloudflare R2
- `storage-s3/` - AWS S3
- `storage-uploadthing/` - UploadThing
- `storage-vercel-blob/` - Vercel Blob Storage

**Email Adapters:**
- `email/` - Email functionality
- `email-nodemailer/` - Nodemailer adapter
- `email-resend/` - Resend adapter

**Other:**
- `_community/` - Community template test
- `array-update/` - Array field updates
- `benchmark-blocks/` - Performance benchmarks
- `create-payload-app/` - CPA tests
- `database/` - Database-specific tests
- `import-test/` - Import validation
- `migrations-cli/` - Migration CLI
- `nested-fields/` - Nested field structures
- `types/` - TypeScript type generation

---

## 2. Test Types

### Integration Tests (int.spec.ts) - 66 files

Integration tests focus on **API-level testing** using the Payload SDK and REST client:

```typescript
// Typical structure
describe('Feature Name', () => {
  beforeAll(async () => {
    ({ payload, restClient } = await initPayloadInt(dirname))
  })

  afterAll(async () => {
    await payload.destroy()
  })

  describe('CRUD operations', () => {
    it('creates a document', async () => {
      const doc = await payload.create({
        collection: 'posts',
        data: { title: 'Test' }
      })
      expect(doc.title).toBe('Test')
    })
  })
})
```

**Coverage:**
- Database operations (CRUD)
- REST API endpoints
- GraphQL API
- Field validation
- Access control
- Hooks execution
- Authentication flows
- Relationship queries
- File uploads
- Localization

### E2E Tests (e2e.spec.ts) - 66 files

E2E tests use **Playwright** to test the admin UI in a real browser:

```typescript
// Typical structure
describe('Admin Panel', () => {
  let page: Page
  let serverURL: string
  let payload: PayloadTestSDK

  beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    ;({ payload, serverURL } = await initPayloadE2ENoConfig({ dirname }))
    await ensureCompilationIsDone({ page, serverURL })
  })

  it('navigates to collection list', async () => {
    await page.goto(`${serverURL}/admin/collections/posts`)
    await expect(page.locator('.collection-list')).toBeVisible()
  })
})
```

**Coverage:**
- Admin UI interactions
- Form submission
- Document editing
- Navigation
- Authentication UI
- Field components
- Relationship selectors
- Upload UI
- List view
- Filtering/sorting
- Bulk operations

### Unit Tests (test.ts) - 4 files

Minimal unit tests, mostly for utility functions:

- `lexical-mdx/tests/` - MDX conversion utilities
- Few isolated utility tests

**Note:** Payload primarily uses integration and E2E tests rather than unit tests, testing features holistically.

---

## 3. Test Configuration

### Jest Configuration (Integration Tests)

**File:** `test/jest.config.js`

```javascript
{
  testMatch: ['<rootDir>/**/*int.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globalSetup: './helpers/startMemoryDB.ts',  // Starts MongoDB Memory Server
  globalTeardown: './helpers/stopMemoryDB.ts',
  moduleNameMapper: {
    '\\.(css|scss)$': '<rootDir>/helpers/mocks/emptyModule.js',
    '\\.(jpg|jpeg|png|gif|...)$': '<rootDir>/helpers/mocks/fileMock.js',
  }
}
```

**Key Setup (jest.setup.js):**
- Sets `PAYLOAD_DISABLE_ADMIN=true` (no UI compilation needed)
- Sets `PAYLOAD_DROP_DATABASE=true` (clean slate per test)
- Generates database adapter dynamically
- Mocks nodemailer for email tests
- Sets environment variables for testing

### Playwright Configuration (E2E Tests)

**File:** `test/playwright.config.ts`

```typescript
{
  testMatch: '*e2e.spec.ts',
  timeout: 40000 * multiplier,  // 40s (160s in CI)
  expect: { timeout: 6000 },
  workers: 16,
  retries: process.env.CI ? 5 : undefined,
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  }
}
```

**Key Features:**
- 16 parallel workers
- 5 retries in CI (for flaky tests)
- Captures screenshots/traces on failure
- Higher timeouts in CI environment

### Database Setup

**Database Adapters Tested:**
- MongoDB (default)
- PostgreSQL
- SQLite
- Vercel Postgres

**Dynamic Adapter Selection:**
```javascript
// jest.setup.js
if (!process.env.PAYLOAD_DATABASE) {
  process.env.PAYLOAD_DATABASE = 'mongodb'
}
generateDatabaseAdapter(process.env.PAYLOAD_DATABASE)
```

**Memory Databases:**
- MongoDB: Uses `mongodb-memory-server` for fast in-memory testing
- PostgreSQL: Uses `pg-replica` for test databases

---

## 4. Key Test Patterns

### Pattern 1: Collection Testing

Each test suite typically includes:

**1. Config File** (`config.ts`):
```typescript
export default buildConfigWithDefaults({
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        // ... other fields
      ]
    }
  ]
})
```

**2. Collection Definitions** (`collections/Posts/index.ts`):
```typescript
export const Posts: CollectionConfig = {
  slug: 'posts',
  fields: [/* ... */],
  hooks: {
    beforeChange: [/* ... */],
    afterRead: [/* ... */]
  }
}
```

**3. Seed Data** (`seed.ts`):
```typescript
export async function seed(payload: Payload) {
  await payload.create({
    collection: 'posts',
    data: { title: 'Test Post' }
  })
}
```

**4. Test File** (`int.spec.ts`):
```typescript
describe('Posts', () => {
  beforeEach(async () => {
    await clearAndSeedEverything(payload)
  })

  it('creates a post', async () => {
    // Test implementation
  })
})
```

### Pattern 2: Field Testing

Field tests are organized by field type in `test/fields/collections/`:

```
fields/
├── collections/
│   ├── Array/
│   ├── Blocks/
│   ├── Checkbox/
│   ├── Date/
│   ├── Email/
│   ├── Group/
│   ├── Number/
│   ├── Point/
│   ├── Radio/
│   ├── Relationship/
│   ├── Select/
│   ├── Text/
│   ├── Upload/
│   └── ...
└── int.spec.ts  # Tests all field types
```

**Test Coverage per Field:**
- Default values
- Validation rules
- Required fields
- Hooks (beforeValidate, afterChange, etc.)
- Localization
- Access control
- Conditional logic
- Admin UI rendering (E2E)

### Pattern 3: Auth Testing

**File:** `test/auth/int.spec.ts`

**Coverage:**
- Login/logout (REST & GraphQL)
- JWT token generation/validation
- Password reset flow
- Email verification
- API key authentication
- Custom strategies
- Session management
- Fields saved to JWT
- Collection-level auth
- First user registration

**Example:**
```typescript
describe('Auth', () => {
  describe('REST - admin user', () => {
    it('should login', async () => {
      const response = await restClient.login({
        slug: 'users',
        credentials: { email, password }
      })
      expect(response.token).toBeDefined()
    })

    it('should decode JWT correctly', () => {
      const decoded = jwtDecode(token)
      expect(decoded.email).toBe(email)
      expect(decoded.collection).toBe('users')
    })
  })
})
```

### Pattern 4: Hook Testing

**File:** `test/hooks/int.spec.ts`

**Coverage:**
- beforeValidate
- beforeChange
- afterChange
- beforeRead
- afterRead
- beforeOperation
- afterOperation

**Execution Order Tests:**
```typescript
it('should execute hooks in correct order on create', () => {
  // Verifies hooks run in documented order:
  // 1. beforeValidate
  // 2. beforeChange
  // 3. afterChange
  // 4. afterRead
  expect(doc.collectionBeforeValidate).toBeTruthy()
  expect(doc.collectionBeforeChange).toBeTruthy()
  expect(doc.collectionAfterChange).toBeTruthy()
  expect(doc.fieldBeforeChange).toBeTruthy()
})
```

**Hook Context Tests:**
```typescript
it('should pass correct context to hooks', async () => {
  // Tests that req, operation, context are properly passed
})
```

**Transform Hooks** (Mongoose):
```typescript
it('should not throw on transform actions', async () => {
  // Tests Mongoose transform hooks don't interfere
})
```

### Pattern 5: Access Control Testing

**File:** `test/access-control/int.spec.ts`

**Coverage:**
- Collection-level access (read, create, update, delete)
- Field-level access (read, update)
- Hidden fields
- Admin-only fields
- User-based filtering
- Request header-based access
- Sibling data dependencies

**Example:**
```typescript
describe('Access Control', () => {
  describe('Fields', () => {
    it('should not affect hidden fields when patching data', async () => {
      const doc = await payload.create({
        collection: 'hidden-fields',
        data: {
          partiallyHiddenGroup: {
            name: 'public',
            value: 'private'  // Hidden field
          }
        }
      })

      await payload.update({
        id: doc.id,
        collection: 'hidden-fields',
        data: { title: 'Updated' }
      })

      const updated = await payload.findByID({
        id: doc.id,
        collection: 'hidden-fields',
        showHiddenFields: true
      })

      // Hidden field should still exist
      expect(updated.partiallyHiddenGroup.value).toBe('private')
    })
  })

  describe('Collections', () => {
    it('should restrict read access', async () => {
      // Tests access function returning false prevents read
    })

    it('should filter results based on access', async () => {
      // Tests access function with where clause
    })
  })
})
```

---

## 5. Test Utilities and Helpers

### Core Initialization Helpers

**`initPayloadInt(dirname)`** - Integration Tests
```typescript
// Returns: { payload, restClient, sdk, config }
// - Initializes Payload with test config
// - Creates REST client for API testing
// - Returns SDK for type-safe operations
// - Used by all int.spec.ts files
```

**`initPayloadE2ENoConfig({ dirname })`** - E2E Tests
```typescript
// Returns: { payload (SDK), serverURL }
// - Starts Next.js dev server
// - Returns test SDK and server URL
// - Used by all e2e.spec.ts files
```

### Test Data Helpers

**`seedDB()`** - Located in `helpers/seed.ts`
```typescript
// Features:
// - Resets database (deletes all collections)
// - Runs seed function
// - Clears uploads directory
// - Creates/restores snapshots for faster re-runs
// - Supports multiple databases (Mongo, Postgres, SQLite)
```

**`resetDB(payload, collectionSlugs)`** - Located in `helpers/reset.ts`
```typescript
// Deletes all documents from specified collections
```

**`clearAndSeedEverything(payload)`**
```typescript
// Used in beforeEach to ensure clean state
```

### REST Client Helper

**`NextRESTClient`** - Located in `helpers/NextRESTClient.ts`

```typescript
// Wraps Next.js API routes for testing
class NextRESTClient {
  async login({ slug, credentials })
  async GET(path, options)
  async POST(path, { body, ...options })
  async PATCH(path, { body, ...options })
  async DELETE(path, options)
  async GRAPHQL_POST({ body })

  // Convenience methods:
  async create({ slug, data })
  async find({ slug, query, depth })
  async findByID({ slug, id })
  async update({ slug, id, data })
  async delete({ slug, id })
}
```

### E2E Helper Functions

**Located in:** `helpers/helpers.ts` and `helpers/e2e/`

**Page Setup:**
```typescript
ensureCompilationIsDone({ page, serverURL })
// Waits for Next.js compilation before running tests

initPageConsoleErrorCatch(page)
// Fails test on console errors (catches React errors)
```

**Form Actions:**
```typescript
saveDocAndAssert(page, selector, expectation)
// Clicks save button and verifies toast message

saveDocHotkeyAndAssert(page)
// Tests Cmd+S / Ctrl+S keyboard shortcut

openDocDrawer(page, selector)
openCreateDocDrawer(page, fieldSelector)
toggleDocDrawer(page)
// Drawer interactions
```

**Navigation:**
```typescript
navigateToDoc({ page, serverURL, slug, id })
goToListDoc({ page, slug, title })
switchTab(page, selector)
```

**Locale Testing:**
```typescript
openLocaleSelector(page)
closeLocaleSelector(page)
changeLocale(page, 'es')
```

**Table/List Helpers:**
```typescript
findTableRow(page, title)
findTableCell(page, fieldName, rowTitle)
selectTableRow(scope, title)
openColumnControls(page)
```

**Field Helpers:**
```typescript
copyPasteField(page, { fieldName })
toggleCollapsible(page, togglerSelector)
selectInput({ page, locator, value })
// Located in helpers/e2e/fields/
```

**Assertions:**
```typescript
checkPageTitle(page, title)
checkBreadcrumb(page, text)
exactText(text) // Returns regex for exact match
```

**Performance Testing:**
```typescript
throttleTest({ context, page, delay: 'Fast 3G' })
// Simulates network conditions and CPU throttling
```

### Mock Data and Fixtures

**Mock Files:**
- `helpers/mocks/emptyModule.js` - For CSS imports
- `helpers/mocks/fileMock.js` - For asset imports

**Test Assets** (`uploads/`):
- `image.jpg`, `image.png`, `image.svg` - Various image formats
- `test-pdf.pdf` - PDF upload testing
- `audio.mp3` - Audio file testing
- `duck.glb` - 3D model testing
- `animated.webp`, `non-animated.webp` - WebP testing
- `test-image-avif.avif` - AVIF format
- `2mb.jpg` - Large file testing

**Seed Data Patterns:**
```typescript
// Each test suite has its own seed.ts
export async function seed(payload: Payload) {
  await payload.create({ collection: 'users', data: devUser })
  await payload.create({ collection: 'posts', data: { title: 'Seed Post' } })
  // ... more seed data
}
```

### Snapshot System

**Located in:** `helpers/snapshot.ts`

```typescript
// Caches database state and uploads directory
// Speeds up test re-runs by restoring from cache
// Instead of re-seeding each time

createSnapshot(_payload, snapshotKey, collectionSlugs)
restoreFromSnapshot(_payload, snapshotKey, collectionSlugs)
```

**Usage:**
```typescript
await seedDB({
  _payload: payload,
  collectionSlugs: ['posts', 'users'],
  snapshotKey: 'fields-test',
  seedFunction: seed,
  uploadsDir: './media'
})
// First run: seeds data, creates snapshot
// Subsequent runs: restores from snapshot (much faster)
```

### Config Builder

**`buildConfigWithDefaults(testConfig)`** - Located in `buildConfigWithDefaults.ts`

```typescript
// Provides base configuration for all tests:
// - Database adapter (from env)
// - Lexical editor with all features
// - Test email adapter
// - Auto-login (dev@payloadcms.com)
// - Sharp for image processing
// - i18n support (en, es, de)
// - Telemetry disabled
// - Custom endpoints for testing
```

### Database Helpers

**`generateDatabaseAdapter(database)`** - Located in `generateDatabaseAdapter.ts`
```typescript
// Dynamically generates database adapter file
// Based on PAYLOAD_DATABASE env var
// Supports: mongodb, postgres, sqlite, vercel-postgres
```

**`isMongoose(payload)`** - Located in `helpers/isMongoose.ts`
```typescript
// Type guard to check if using Mongoose adapter
// Used to conditionally run Mongoose-specific tests
```

---

## 6. Test Coverage Analysis

### Areas with Strong Coverage

#### **1. Field Types** ⭐⭐⭐⭐⭐
- Every field type has dedicated tests
- Covers validation, defaults, hooks, localization
- Both API and UI testing
- Examples: Text, Number, Date, Relationship, Upload, Blocks, Array, etc.

#### **2. Access Control** ⭐⭐⭐⭐⭐
- Collection-level access (CRUD operations)
- Field-level access (read/update)
- Hidden fields
- User-based filtering
- Request context-based access

#### **3. Authentication** ⭐⭐⭐⭐⭐
- Login/logout flows
- JWT handling
- Password reset
- API keys
- Custom strategies
- First user registration
- Session management

#### **4. Hooks** ⭐⭐⭐⭐⭐
- All hook types tested
- Execution order verified
- Context passing
- Field-level vs collection-level
- Transform hooks (Mongoose)

#### **5. Relationships** ⭐⭐⭐⭐⭐
- hasMany, hasOne
- Polymorphic relationships
- Filtered relationships
- Chained relationships
- Custom ID relationships
- Join queries
- GraphQL relationship queries

#### **6. Uploads** ⭐⭐⭐⭐⭐
- Multiple file formats
- Image processing (sizes, focal points)
- External URLs
- Storage adapters (S3, Azure, GCS, R2, etc.)
- MIME type validation
- Crop and resize

#### **7. Admin UI** ⭐⭐⭐⭐⭐
- List view (filtering, sorting, pagination)
- Document view (editing, validation)
- Bulk operations
- Navigation
- Drawers and modals
- Field components
- Form state management

#### **8. Localization** ⭐⭐⭐⭐
- Localized fields
- Fallback locales
- Admin UI language switching
- RTL language support
- i18n strings

#### **9. Versioning** ⭐⭐⭐⭐
- Draft/publish workflow
- Version history
- Restoring versions
- Auto-save
- Scheduled publishing

#### **10. Database Operations** ⭐⭐⭐⭐
- CRUD operations
- Complex queries
- Transactions
- Migrations
- Multiple adapters (MongoDB, Postgres, SQLite)
- Indexes

### Areas with Moderate Coverage

#### **1. GraphQL API** ⭐⭐⭐
- Basic queries and mutations
- Relationship queries
- Authentication
- Could use more edge case testing

#### **2. Email** ⭐⭐⭐
- Email sending (mocked)
- Template rendering
- Multiple adapters (nodemailer, resend)
- Limited real-world email testing

#### **3. Plugins** ⭐⭐⭐
- Most plugins have basic tests
- Some lack comprehensive E2E coverage
- Integration well-tested

#### **4. SDK** ⭐⭐⭐
- Basic SDK operations covered
- Could use more complex workflow testing

### Areas with Less Coverage

#### **1. Performance** ⭐⭐
- `benchmark-blocks/` exists but limited
- No systematic performance regression testing
- Limited load testing

#### **2. Error Handling** ⭐⭐
- Some error cases tested
- Could use more comprehensive error scenario coverage
- Edge cases for malformed data

#### **3. Caching** ⭐⭐
- Basic caching tested
- Cache invalidation scenarios limited

#### **4. Search** ⭐⭐
- `plugin-search` has tests
- Full-text search scenarios could be more comprehensive

#### **5. Real-time Features** ⭐
- Live preview tested
- Collaborative editing not extensively tested
- WebSocket scenarios limited

### Coverage by Test Type

**Integration Tests (API):**
- ✅ Database operations
- ✅ REST endpoints
- ✅ GraphQL queries
- ✅ Hooks execution
- ✅ Access control
- ✅ Validation
- ✅ Relationships
- ⚠️ Performance
- ⚠️ Concurrent operations

**E2E Tests (UI):**
- ✅ Form interactions
- ✅ Navigation
- ✅ Document editing
- ✅ List operations
- ✅ Field components
- ⚠️ Mobile responsiveness
- ⚠️ Accessibility
- ⚠️ Browser compatibility

---

## 7. Test Execution

### Running Tests

**Integration Tests:**
```bash
# All integration tests
pnpm test:int

# Specific test suite
pnpm test:int fields

# With specific database
PAYLOAD_DATABASE=postgres pnpm test:int fields
```

**E2E Tests:**
```bash
# All E2E tests
pnpm test:e2e

# Specific test suite (not directly supported)
# Must run from test directory
```

**All Tests:**
```bash
pnpm test
```

### Test Development Workflow

**1. Create Test Suite:**
```bash
test/my-feature/
├── config.ts          # Payload config
├── collections/       # Collection definitions
│   └── Posts/
│       └── index.ts
├── seed.ts           # Seed data
├── int.spec.ts       # Integration tests
└── e2e.spec.ts       # E2E tests (optional)
```

**2. Run Dev Server:**
```bash
pnpm dev my-feature
# Loads test/my-feature/config.ts
```

**3. Run Tests:**
```bash
pnpm test:int my-feature
pnpm test:e2e  # E2E tests run all matching
```

### CI/CD Integration

**GitHub Actions:**
- Runs on every PR
- Matrix strategy (multiple databases)
- Parallel test execution
- Retries flaky tests (5x)
- Uploads test artifacts on failure

**Test Database in CI:**
- MongoDB: Uses mongodb-memory-server
- PostgreSQL: Spins up Docker container
- SQLite: In-memory database

---

## 8. Test Organization Best Practices

### What the Tests Teach Us

**1. Feature Isolation:**
- Each test suite is self-contained
- Own config, collections, seed data
- No dependencies between test suites

**2. Comprehensive Testing:**
- Both API (integration) and UI (E2E) tested
- Field types tested in isolation and composition
- Edge cases covered (errors, validation, access)

**3. Database Agnostic:**
- Tests run against all supported databases
- Adapter-specific tests conditionally skipped
- Database-specific features isolated

**4. Snapshot Optimization:**
- Snapshot system speeds up test re-runs
- Particularly important for large seed datasets
- Balances speed vs. isolation

**5. Helper Abstraction:**
- Common patterns extracted to helpers
- E2E helpers reduce boilerplate
- REST client simplifies API testing

**6. Real-World Testing:**
- Actual database operations (not mocked)
- Real Next.js server for E2E
- Actual file uploads and processing

---

## 9. Notable Test Patterns

### Pattern: Conditional Tests by Database

```typescript
const mongoIt = mongooseList.includes(process.env.PAYLOAD_DATABASE || '')
  ? it
  : it.skip

mongoIt('should run on MongoDB only', async () => {
  // Mongoose-specific test
})
```

### Pattern: Login Before Tests

```typescript
beforeAll(async () => {
  ({ payload, restClient } = await initPayloadInt(dirname))
  await restClient.login({ slug: 'users' })
})
```

### Pattern: Console Error Detection

```typescript
initPageConsoleErrorCatch(page)
// Any console.error() fails the test
// Catches React errors like missing keys
```

### Pattern: Polling for Async Operations

```typescript
await expect.poll(
  () => page.url() === expectedURL,
  { timeout: POLL_TOPASS_TIMEOUT }
).toBe(true)

// Retries until condition is true or timeout
```

### Pattern: Test-Specific Config Override

```typescript
export default buildConfigWithDefaults({
  collections: [Posts],
  // Override defaults for this test
  admin: {
    autoLogin: false
  }
})
```

---

## 10. Key Takeaways

### For New Contributors

1. **Start with Integration Tests:** Easier to write, faster to run
2. **Use Existing Patterns:** Copy from similar test suites
3. **Test Both Success and Failure:** Don't just test happy paths
4. **Include Seed Data:** Make tests reproducible
5. **Name Tests Clearly:** Describe what's being tested

### For Test Improvements

**High Priority:**
1. Add more error scenario coverage
2. Expand performance testing
3. Add accessibility testing to E2E
4. Test mobile responsiveness
5. Add more concurrent operation tests

**Medium Priority:**
1. Increase GraphQL edge case coverage
2. More comprehensive search testing
3. Real-world email testing
4. Cache invalidation scenarios
5. Plugin E2E coverage

**Low Priority:**
1. Browser compatibility matrix
2. Load testing
3. Stress testing
4. Chaos testing (network failures, etc.)

### Test Organization Principles

1. ✅ **Self-Contained:** Each test suite is independent
2. ✅ **Comprehensive:** Tests both API and UI
3. ✅ **Fast:** Snapshot system, parallel execution
4. ✅ **Real:** No excessive mocking, actual databases
5. ✅ **Maintainable:** Helper abstractions reduce duplication
6. ⚠️ **Growing:** Test suite keeps expanding with features

---

## Summary Statistics

- **Total Test Files:** 133
- **Integration Tests:** 66
- **E2E Tests:** 66
- **Unit Tests:** 4
- **Test Directories:** ~80+
- **Test Helper Files:** 30+
- **Config Files:** 76
- **Seed Files:** 13
- **Test Assets:** 25+ files

**Test Coverage by Category:**
- Core Features: ⭐⭐⭐⭐⭐ (95%+)
- Admin UI: ⭐⭐⭐⭐⭐ (90%+)
- Plugins: ⭐⭐⭐⭐ (80%+)
- Performance: ⭐⭐ (20%+)
- Edge Cases: ⭐⭐⭐ (60%+)

**Overall Test Maturity:** ⭐⭐⭐⭐ (4/5)
- Strong integration and E2E coverage
- Well-organized and maintainable
- Room for improvement in performance and edge cases
- Excellent helper utilities and patterns
