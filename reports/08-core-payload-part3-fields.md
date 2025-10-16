# Payload CMS Field System Analysis

**Location:** `payload-main/packages/payload/src/fields/`

**Report Date:** 2025-10-14
**Scope:** Comprehensive analysis of Payload's field type system, validation, hooks, and patterns for tiny-cms implementation

## Executive Summary

Payload CMS implements a sophisticated field system with **23+ field types** covering primitives, composites, and special-purpose fields. The architecture is built around:

- Strongly typed field definitions with shared base interfaces
- Comprehensive validation system with built-in and custom validators
- Field lifecycle hooks (beforeValidate, beforeChange, afterChange, afterRead, beforeDuplicate)
- Conditional field rendering and access control
- Per-field localization support
- Automatic admin UI generation

**Key Insight:** While Payload has 23+ field types, **~8 core types** can cover 90% of use cases for tiny-cms.

---

## 1. Complete Field Types Overview

### 1.1 Primitive Data Fields (8 types)

```typescript
// payload/src/fields/config/types.ts
// Text-based
type TextField = {
  type: 'text'
  hasMany?: boolean // Array of strings
  minLength?: number
  maxLength?: number
  minRows?: number // When hasMany
  maxRows?: number // When hasMany
} & FieldBase

type TextareaField = {
  type: 'textarea'
  minLength?: number
  maxLength?: number
  admin?: { rows?: number; rtl?: boolean }
} & FieldBase

type EmailField = {
  type: 'email'
  // Built-in email validation
} & FieldBase

// Numeric
type NumberField = {
  type: 'number'
  hasMany?: boolean // Array of numbers
  min?: number
  max?: number
  admin?: { step?: number }
} & FieldBase

// Boolean
type CheckboxField = {
  type: 'checkbox'
  defaultValue?: boolean
} & FieldBase

// Temporal
type DateField = {
  type: 'date'
  timezone?: true // Enable timezone picker
  admin?: {
    date?: {
      displayFormat?: string
      pickerAppearance?: 'default' | 'dayAndTime' | /** ... more options */
    }
  }
} & FieldBase

// Code/JSON
type CodeField = {
  type: 'code'
  admin?: {
    language?: string
    editorOptions?: EditorProps['options']
  }
} & FieldBase

type JSONField = {
  type: 'json'
  jsonSchema?: { uri: string; schema: JSONSchema4 }
} & FieldBase
```

### 1.2 Choice/Selection Fields (3 types)

```typescript
// payload/src/fields/config/types.ts
type SelectField = {
  type: 'select'
  options: Option[] // Array of {label, value} or strings
  hasMany?: boolean // Multi-select
  admin?: {
    isClearable?: boolean
    isSortable?: boolean // Drag-drop ordering
  }
  filterOptions?: (args) => Option[] // Dynamic options
} & FieldBase

type RadioField = {
  type: 'radio'
  options: Option[]
  admin?: { layout?: 'horizontal' | 'vertical' }
} & FieldBase

type PointField = {
  type: 'point' // Geographic coordinates [lng, lat]
  admin?: { step?: number }
} & FieldBase
```

### 1.3 Relationship/Reference Fields (2 types)

```typescript
// payload/src/fields/config/types.ts
// Relationship to other collections
type RelationshipField = {
  type: 'relationship'
  relationTo: CollectionSlug | CollectionSlug[] // Polymorphic
  hasMany?: boolean
  minRows?: number
  maxRows?: number
  maxDepth?: number // Population depth limit
  filterOptions?: FilterOptions // Dynamic filtering
  admin?: {
    allowCreate?: boolean
    allowEdit?: boolean
    appearance?: 'drawer' | 'select'
    sortOptions?: string
  }
} & FieldBase

// Upload/Media reference (specialized relationship)
type UploadField = {
  type: 'upload'
  relationTo: CollectionSlug | CollectionSlug[]
  hasMany?: boolean
  displayPreview?: boolean
  maxDepth?: number
  filterOptions?: FilterOptions
} & FieldBase
```

### 1.4 Rich Content Fields (1 type)

```typescript
type RichTextField<TValue, TAdapterProps, TExtraProperties> = {
  type: 'richText'
  editor?: RichTextAdapter | RichTextAdapterProvider
  maxDepth?: number // For relationship population in rich text
  // Adapter-specific properties added via TExtraProperties
} & FieldBase &
  TExtraProperties
```

### 1.5 Compositional/Layout Fields (6 types)

```typescript
// payload/src/fields/config/types.ts
// Array of repeated fields
type ArrayField = {
  type: 'array'
  fields: Field[]
  labels?: { singular: string; plural: string }
  minRows?: number
  maxRows?: number
  admin?: {
    initCollapsed?: boolean
    isSortable?: boolean
    components?: { RowLabel?: Component }
  }
} & FieldBase

// Blocks (array with multiple block types)
type BlocksField = {
  type: 'blocks'
  blocks: Block[] // Or block references
  blockReferences?: (Block | BlockSlug)[]
  minRows?: number
  maxRows?: number
  filterOptions?: BlocksFilterOptions
  admin?: { initCollapsed?: boolean; isSortable?: boolean }
} & FieldBase

type Block = {
  slug: string
  fields: Field[]
  labels?: Labels
  interfaceName?: string
  imageURL?: string
  admin?: { disableBlockName?: boolean }
}

// Named or unnamed grouping
type GroupField = NamedGroupField | UnnamedGroupField

type NamedGroupField = {
  type: 'group'
  name: string // Creates nested object
  fields: Field[]
  interfaceName?: string
} & FieldBase

type UnnamedGroupField = {
  type: 'group'
  fields: Field[] // Fields at same level (layout only)
} & Omit<FieldBase, 'name' | 'hooks' | 'virtual'>

// Layout helpers
type RowField = {
  type: 'row' // Horizontal layout
  fields: Field[]
} & Omit<FieldBase, 'name' | 'label' | 'localized' | 'validate'>

type CollapsibleField = {
  type: 'collapsible' // Collapsible section
  label: string
  fields: Field[]
  admin?: { initCollapsed?: boolean }
} & Omit<FieldBase, 'name' | 'localized' | 'validate'>

type TabsField = {
  type: 'tabs' // Tabbed interface
  tabs: Tab[]
} & Omit<FieldBase, 'name' | 'localized' | 'saveToJWT'>

type Tab = NamedTab | UnnamedTab // Named creates nested data
```

### 1.6 Special Purpose Fields (3 types)

```typescript
// Virtual computed field (no storage)
type JoinField = {
  type: 'join'
  collection: CollectionSlug | CollectionSlug[]
  on: string // Foreign key field
  where?: Where // Query constraints
  maxDepth?: number
  defaultLimit?: number
  orderable?: boolean // Enable custom ordering
  virtual?: true // Always virtual
} & FieldBase

// Custom UI component (no data)
type UIField = {
  type: 'ui'
  name: string
  admin: {
    components?: {
      Field?: Component
      Cell?: Component // List view
      Filter?: Component // List filter
    }
  }
}

// Hidden field (data only, no UI)
// Any field with hidden: true or admin.hidden: true
```

---

## 2. Field Architecture and Base Interfaces

### 2.1 FieldBase - Core Field Properties

```typescript
// payload/src/fields/config/types.ts
interface FieldBase {
  // Identity
  name: string // Required, must be alphanumeric without '.'
  label?: string | LabelFunction | false

  // Storage & Behavior
  defaultValue?: DefaultValue
  required?: boolean
  unique?: boolean
  index?: boolean // Database index
  localized?: boolean // Per-locale storage
  hidden?: boolean
  virtual?: boolean // No database storage

  // Access Control
  access?: {
    create?: FieldAccess
    read?: FieldAccess
    update?: FieldAccess
  }

  // Lifecycle Hooks
  hooks?: {
    beforeValidate?: FieldHook[]
    beforeChange?: FieldHook[]
    afterChange?: FieldHook[]
    afterRead?: FieldHook[]
    beforeDuplicate?: FieldHook[]
  }

  // Validation
  validate?: Validate

  // Admin UI
  admin?: FieldAdmin

  // Extension Points
  custom?: Record<string, any>
  saveToJWT?: boolean | string
  typescriptSchema?: Array<(args) => JSONSchema4>

  // Internal
  _sanitized?: boolean
}
```

### 2.2 FieldAdmin - UI Configuration

```typescript
// payload/src/fields/config/types.ts
export type FieldAdmin = {
  // Layout
  className?: string
  style?: CSSProperties
  width?: CSSProperties['width']
  position?: 'sidebar'

  // Behavior
  condition?: Condition
  disabled?: boolean
  readOnly?: boolean
  hidden?: boolean

  // List View
  disableListColumn?: boolean
  disableListFilter?: boolean
  disableGroupBy?: boolean
  disableBulkEdit?: boolean

  // Components
  components?: {
    Field?: PayloadComponent
    Cell?: PayloadComponent
    Description?: PayloadComponent
    Diff?: PayloadComponent
    Filter?: PayloadComponent
    /** ... field-specific components */
  }

  // Field-Specific
  description?: Description
  custom?: Record<string, any>
}
```

### 2.3 Field Type Discriminators

```typescript
// Fields that affect data storage
export type FieldAffectingData =
  | TextField
  | TextareaField
  | EmailField
  | NumberField
  | CheckboxField
  | DateField
  | CodeField
  | JSONField
  | SelectField
  | RadioField
  | PointField
  | RelationshipField
  | UploadField
  | RichTextField
  | ArrayField
  | BlocksField
  | NamedGroupField // Only named groups
  | JoinField
  | TabAsField // Only named tabs

// Layout/presentational only
export type FieldPresentationalOnly = UIField

// Fields with sub-fields
export type FieldWithSubFields = ArrayField | GroupField | RowField | CollapsibleField

// Helper functions
export function fieldAffectsData(field: Field): field is FieldAffectingData {
  return 'name' in field && !fieldIsPresentationalOnly(field)
}

export function fieldHasSubFields(field: Field): field is FieldWithSubFields {
  return (
    field.type === 'group' ||
    field.type === 'array' ||
    field.type === 'row' ||
    field.type === 'collapsible'
  )
}

export function fieldSupportsMany(field: Field): field is FieldWithMany {
  return field.type === 'select' || field.type === 'relationship' || field.type === 'upload'
}
```

---

## 3. Key Field Types - Detailed Analysis

### 3.1 Primitive Fields

#### Text Field

**Purpose:** Single-line or multi-value text input

```typescript
// Basic usage
{
  type: 'text',
  name: 'title',
  label: 'Title',
  required: true,
  maxLength: 100,
  admin: {
    placeholder: 'Enter title...',
    autoComplete: 'off'
  }
}

// Multi-value text (tags)
{
  type: 'text',
  name: 'tags',
  hasMany: true,
  minRows: 1,
  maxRows: 10
}
```

**Validation:**

```typescript
// payload/src/fields/validations/text.ts:10-45
export const text: TextFieldValidation = (value, options) => {
  // ... destructure options

  // Handle array validation
  if (hasMany === true) {
    /** ... validate array length (minRows, maxRows) */
  }

  // String length validation
  const stringsToValidate = Array.isArray(value) ? value : [value]
  for (const stringValue of stringsToValidate) {
    /** ... check maxLength, minLength */
  }

  // Required validation
  if (required && (!value || value.length === 0)) {
    return t('validation:required')
  }

  return true
}
```

**Key Patterns:**

- `hasMany` transforms field into array of strings
- `minRows`/`maxRows` apply only when `hasMany: true`
- Default max length from `config.defaultMaxTextLength`
- Auto-completion support via `admin.autoComplete`

#### Email Field

**Purpose:** Email with built-in validation

```typescript
{
  type: 'email',
  name: 'email',
  required: true,
  unique: true,
  admin: {
    placeholder: 'user@example.com'
  }
}
```

**Validation:**

```typescript
// payload/src/fields/validations/email.ts:8-18
export const email: EmailFieldValidation = (value, options) => {
  // Robust email regex
  const emailRegex = /^(?!.*\..)[\w!#$%&'*+/=?^`{|}~-]...$/i

  if ((value && !emailRegex.test(value)) || (!value && required)) {
    return t('validation:emailAddress')
  }

  return true
}
```

**Key Patterns:**

- Validates email format strictly
- No consecutive dots allowed
- Supports subdomains
- Often paired with `unique: true` for auth

#### Number Field

**Purpose:** Numeric input with min/max constraints

```typescript
// Single number
{
  type: 'number',
  name: 'price',
  required: true,
  min: 0,
  max: 999999,
  admin: {
    step: 0.01  // For currency
  }
}

// Array of numbers
{
  type: 'number',
  name: 'ratings',
  hasMany: true,
  min: 1,
  max: 5,
  minRows: 1
}
```

**Validation:**

```typescript
// payload/src/fields/validations/number.ts:10-45
export const number: NumberFieldValidation = (value, options) => {
  // ... destructure options

  if (hasMany) {
    /** ... validate array length (minRows, maxRows) */
  }

  if (!value && !isNumber(value)) {
    return required ? t('validation:required') : true
  }

  const numbersToValidate = Array.isArray(value) ? value : [value]
  for (const number of numbersToValidate) {
    /** ... validate isNumber, check max/min bounds */
  }

  return true
}
```

**Key Patterns:**

- Automatically parses string input to number
- `hasMany` enables array of numbers
- `admin.step` controls increment precision
- Zero is valid value (checked via `isNumber()`)

#### Date Field

**Purpose:** Date/datetime with timezone support

```typescript
{
  type: 'date',
  name: 'publishedAt',
  required: true,
  timezone: true,  // Enables timezone picker
  admin: {
    date: {
      pickerAppearance: 'dayAndTime',
      displayFormat: 'MMM d, yyyy h:mm a'
    }
  }
}
```

**Validation:**

`payload-main/packages/payload/src/fields/validations/date.ts` (lines 8-30)

```typescript
export const date: DateFieldValidation = (value, options) => {
  // ... destructure options

  const validDate = value && !isNaN(Date.parse(value.toString()))

  // Check timezone if enabled
  const hasRequiredTimezone = timezone && required
  const selectedTimezone = siblingData?.[`${name}_tz`]
  const validTimezone = hasRequiredTimezone ? Boolean(selectedTimezone) : true

  /** ... return appropriate error message or true */
  return true
}
```

**Key Patterns:**

- Stores ISO 8601 string
- `timezone: true` creates hidden `${name}_tz` field
- Supports various picker appearances
- Validates timezone separately when required

### 3.2 Selection Fields

#### Select Field

**Purpose:** Single or multi-select from options

```typescript
// Static options
{
  type: 'select',
  name: 'status',
  options: [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    'archived'  // Shorthand
  ],
  defaultValue: 'draft',
  required: true
}

// Multi-select with dynamic options
{
  type: 'select',
  name: 'categories',
  hasMany: true,
  options: [/* ... */],
  filterOptions: ({ data, siblingData }) => {
    // Return filtered options based on context
    return siblingData.type === 'blog'
      ? blogCategories
      : productCategories
  },
  admin: {
    isSortable: true,  // Drag-drop ordering
    isClearable: true
  }
}
```

**Validation:**

`payload-main/packages/payload/src/fields/validations/select.ts` (lines 10-60)

```typescript
export const select: SelectFieldValidation = (value, options) => {
  // ... destructure options

  // Apply filter options if provided
  const filteredOptions = typeof filterOptions === 'function'
    ? filterOptions({ data, options: allOptions, req, siblingData })
    : allOptions

  // Validate array values
  if (Array.isArray(value) && value.some(/** ... check if invalid */)) {
    return t('validation:invalidSelection')
  }

  // Validate single value
  if (typeof value === 'string' && !filteredOptions.some(/** ... */)) {
    return t('validation:invalidSelection')
  }

  // Required validation
  if (required && /** ... check if empty */) {
    return t('validation:required')
  }

  return true
}
```

**Key Patterns:**

- Options can be strings or `{label, value}` objects
- `filterOptions` enables dynamic option filtering
- `hasMany` enables multi-select
- `isSortable` allows drag-drop reordering (only when `hasMany`)
- Validation checks against filtered options, not all options
- Creates database enum for performance

#### Checkbox Field

**Purpose:** Boolean flag

```typescript
{
  type: 'checkbox',
  name: 'isActive',
  label: 'Active',
  defaultValue: false,  // Auto-set when required: true
  required: true
}
```

**Validation:**

```typescript
export const checkbox: CheckboxFieldValidation = (value, { req: { t }, required }) => {
  if ((value && typeof value !== 'boolean') || (required && typeof value !== 'boolean')) {
    return t('validation:trueOrFalse')
  }
  return true
}
```

**Key Patterns:**

- If `required: true` and no `defaultValue`, auto-sets to `false`
- Validates type strictly (must be boolean)
- String 'true'/'false' auto-converted in beforeValidate hook

### 3.3 Relationship Fields

#### Relationship Field

**Purpose:** Reference to other collection documents

```typescript
// Single relationship
{
  type: 'relationship',
  name: 'author',
  relationTo: 'users',
  required: true,
  maxDepth: 1,  // Population depth
  filterOptions: ({ siblingData, req }) => {
    // Only show active authors
    return { status: { equals: 'active' } }
  },
  admin: {
    allowCreate: false,
    sortOptions: 'name'
  }
}

// Polymorphic relationship
{
  type: 'relationship',
  name: 'owner',
  relationTo: ['users', 'organizations'],  // Multiple collections
  required: true,
  admin: {
    sortOptions: {
      users: 'name',
      organizations: 'title'
    }
  }
}

// Many-to-many
{
  type: 'relationship',
  name: 'categories',
  relationTo: 'categories',
  hasMany: true,
  minRows: 1,
  maxRows: 10,
  admin: {
    isSortable: true
  }
}
```

**Data Structure:**

```typescript
// Single collection
author: 'user123'  // Just ID
// Or when populated
author: { id: 'user123', name: 'John', ... }

// Polymorphic
owner: {
  relationTo: 'users',
  value: 'user123'
}
// Or when populated
owner: {
  relationTo: 'users',
  value: { id: 'user123', name: 'John', ... }
}

// Many
categories: ['cat1', 'cat2', 'cat3']
// Or polymorphic many
items: [
  { relationTo: 'products', value: 'prod1' },
  { relationTo: 'services', value: 'svc1' }
]
```

**Validation:**

`payload-main/packages/payload/src/fields/validations/relationship.ts` (lines 12-75)

```typescript
export const relationship: RelationshipFieldValidation = async (value, options) => {
  // ... destructure options

  // Required validation
  if (((!value && typeof value !== 'number') || /** ... */) && required) {
    return t('validation:required')
  }

  // Array length validation
  if (Array.isArray(value) && value.length > 0) {
    /** ... check minRows, maxRows */
  }

  // Validate ID types
  if (typeof value !== 'undefined' && value !== null) {
    const values = Array.isArray(value) ? value : [value]
    const invalidRelationships = values.filter((val) => {
      /** ... extract collectionSlug and requestedID */
      /** ... validate ID type matches collection's ID type */
      return !isValidID(requestedID, idType)
    })

    if (invalidRelationships.length > 0) {
      return `Invalid relationships: ${/** ... */}`
    }
  }

  // Skip filterOptions validation on onChange event
  if (event === 'onChange') return true

  // Validate against filterOptions
  return validateFilterOptions(value, options)
}
```

**Key Patterns:**

- Single collection: stores ID directly
- Polymorphic: stores `{relationTo, value}` object
- `hasMany` enables array of relationships
- `maxDepth` controls population depth (prevents infinite loops)
- `filterOptions` dynamically filters available documents
- `allowCreate` enables inline document creation
- Validates ID format matches collection's ID type (text/number)
- FilterOptions validation ensures selected docs match criteria

#### Upload Field

**Purpose:** Specialized relationship for media/files

```typescript
{
  type: 'upload',
  name: 'featuredImage',
  relationTo: 'media',
  required: true,
  displayPreview: true,  // Show image preview
  filterOptions: {
    mimeType: { contains: 'image' }  // Only images
  }
}
```

**Key Patterns:**

- Similar to relationship but for upload collections
- `displayPreview` shows thumbnail/preview
- Typically points to collections with `upload: true`
- Same validation as relationship field
- Supports polymorphic relationships to multiple upload collections

### 3.4 Compositional Fields

#### Array Field

**Purpose:** Repeatable group of fields

```typescript
{
  type: 'array',
  name: 'features',
  fields: [
    {
      type: 'text',
      name: 'title',
      required: true
    },
    {
      type: 'textarea',
      name: 'description'
    },
    {
      type: 'upload',
      name: 'icon',
      relationTo: 'media'
    }
  ],
  labels: {
    singular: 'Feature',
    plural: 'Features'
  },
  minRows: 1,
  maxRows: 10,
  admin: {
    initCollapsed: true,
    isSortable: true,
    components: {
      RowLabel: ({ data, index }) => {
        return data?.title || `Feature ${index + 1}`
      }
    }
  }
}
```

**Data Structure:**

```typescript
features: [
  { id: 'row1', title: 'Fast', description: '...', icon: 'media1' },
  { id: 'row2', title: 'Secure', description: '...', icon: 'media2' },
]
```

**Validation:**

`payload-main/packages/payload/src/fields/validations/array.ts` (lines 8-30)

```typescript
export const array: ArrayFieldValidation = (value, { maxRows, minRows, required, req: { t } }) => {
  return validateArrayLength(value, { maxRows, minRows, required, t })
}

const validateArrayLength = (value, options) => {
  const arrayLength = Array.isArray(value) ? value.length : (value as number) || 0

  if (!required && arrayLength === 0) return true
  /** ... check minRows, maxRows, required */
  return true
}
```

**Key Patterns:**

- Each row gets auto-generated `id` field
- Rows stored as array of objects
- `RowLabel` component customizes row headers
- `isSortable` enables drag-drop reordering
- Field validation runs on each row's fields independently
- Supports nesting (arrays within arrays)

#### Group Field

**Purpose:** Logical grouping of fields

```typescript
// Named group (creates nested data)
{
  type: 'group',
  name: 'metadata',
  fields: [
    { type: 'text', name: 'keywords' },
    { type: 'textarea', name: 'description' }
  ],
  admin: {
    hideGutter: true  // Remove visual border
  }
}
// Data: { metadata: { keywords: '...', description: '...' } }

// Unnamed group (layout only)
{
  type: 'group',
  fields: [
    { type: 'text', name: 'firstName' },
    { type: 'text', name: 'lastName' }
  ]
}
// Data: { firstName: '...', lastName: '...' }
```

**Key Patterns:**

- Named group: creates nested object in data
- Unnamed group: purely for UI layout, no data nesting
- No built-in validation (validates sub-fields)
- Can be localized (affects all sub-fields)
- `interfaceName` sets TypeScript type name

#### Blocks Field

**Purpose:** Flexible content blocks (builder pattern)

```typescript
{
  type: 'blocks',
  name: 'content',
  blocks: [
    {
      slug: 'hero',
      fields: [
        { type: 'text', name: 'heading', required: true },
        { type: 'textarea', name: 'tagline' },
        { type: 'upload', name: 'backgroundImage', relationTo: 'media' }
      ],
      labels: {
        singular: 'Hero Block',
        plural: 'Hero Blocks'
      }
    },
    {
      slug: 'textBlock',
      fields: [
        { type: 'richText', name: 'content' }
      ],
      labels: {
        singular: 'Text Block',
        plural: 'Text Blocks'
      }
    }
  ],
  minRows: 1,
  maxRows: 20,
  admin: {
    initCollapsed: true
  },
  filterOptions: ({ siblingData }) => {
    // Conditionally show blocks
    return siblingData.pageType === 'landing'
      ? ['hero', 'textBlock', 'cta']
      : ['textBlock', 'gallery']
  }
}
```

**Data Structure:**

```typescript
content: [
  {
    blockType: 'hero',
    id: 'block1',
    heading: 'Welcome',
    tagline: 'Build amazing things',
    backgroundImage: 'media1',
  },
  {
    blockType: 'textBlock',
    id: 'block2',
    content: {
      /* rich text data */
    },
  },
]
```

**Validation:**

`payload-main/packages/payload/src/fields/validations/blocks.ts` (lines 12-45)

```typescript
export const blocks: BlocksFieldValidation = async (value, options) => {
  // ... destructure options

  // Validate array length
  const lengthValidationResult = validateArrayLength(value, { maxRows, minRows, required, t })
  if (typeof lengthValidationResult === 'string') return lengthValidationResult

  // Validate block types against filterOptions
  if (filterOptions) {
    const { invalidBlockSlugs } = await validateBlocksFilterOptions({}) /** ... */
    if (invalidBlockSlugs?.length) {
      return t('validation:invalidBlocks', { blocks: invalidBlockSlugs.join(', ') })
    }
  }

  return true
}
```

**Key Patterns:**

- Each block gets `blockType` and `id` fields
- Blocks can be globally defined or inline
- `filterOptions` dynamically controls available blocks
- `blockReferences` allows referencing global blocks
- Block validation runs against allowed blocks
- Each block type has independent field schema
- Powerful for page builders and flexible content

#### Tabs Field

**Purpose:** Organize fields into tabs

```typescript
{
  type: 'tabs',
  tabs: [
    {
      label: 'Content',
      fields: [
        { type: 'text', name: 'title' },
        { type: 'richText', name: 'body' }
      ]
    },
    {
      name: 'meta',  // Named tab (creates nested data)
      label: 'Metadata',
      fields: [
        { type: 'text', name: 'seoTitle' },
        { type: 'textarea', name: 'seoDescription' }
      ]
    }
  ]
}
```

**Data Structure:**

```typescript
// Unnamed tab: fields at root level
{
  title: '...',
  body: { /* richText */ },
  // Named tab: creates nested object
  meta: {
    seoTitle: '...',
    seoDescription: '...'
  }
}
```

**Key Patterns:**

- Named tabs create nested data (like named groups)
- Unnamed tabs are layout-only
- Tab-specific descriptions
- Tabs cannot be localized (but fields within can be)
- Good for organizing large forms

### 3.5 Rich Text Field

**Purpose:** Rich text editing with adapter pattern

```typescript
{
  type: 'richText',
  name: 'content',
  required: true,
  editor: lexicalEditor({  // Or slateEditor()
    features: [
      BoldFeature(),
      ItalicFeature(),
      LinkFeature(),
      HeadingFeature(),
      BlockquoteFeature(),
      RelationshipFeature({
        collections: ['pages', 'posts']
      }),
      UploadFeature({
        collections: ['media']
      })
    ]
  }),
  maxDepth: 2  // For relationship population
}
```

**Validation:**

```typescript
export const richText: RichTextFieldValidation = async (value, options) => {
  if (!options?.editor) {
    throw new Error('richText field has no editor property.')
  }
  if (typeof options?.editor === 'function') {
    throw new Error('Attempted to access unsanitized rich text editor.')
  }

  const editor: RichTextAdapter = options.editor
  return editor.validate(value, options)
}
```

**Key Patterns:**

- Editor is pluggable (Lexical, Slate, custom)
- Validation delegated to editor adapter
- Each editor has own data format
- Can embed relationships and uploads
- `maxDepth` controls population of embedded docs
- Editor has own hook system
- Already covered in detail in richtext report

---

## 4. Validation System

### 4.1 Validation Architecture

```typescript
export type Validate<TValue, TData, TSiblingData, TFieldConfig> = (
  value: TValue | null | undefined,
  options: ValidateOptions<TData, TSiblingData, TFieldConfig, TValue>,
) => string | true | Promise<string | true>

export type ValidateOptions<TData, TSiblingData, TFieldConfig, TValue> = BaseValidateOptions<
  TData,
  TSiblingData,
  TValue
> &
  TFieldConfig

export type BaseValidateOptions<TData, TSiblingData, TValue> = {
  // Context
  req: PayloadRequest
  data: Partial<TData> // Full document data
  siblingData: Partial<TSiblingData> // Same-level fields
  blockData: Partial<TData> // Parent block data

  // Field info
  path: (string | number)[] // Field path (with indexes)
  operation?: 'create' | 'update' | 'read' | 'delete'
  event?: 'onChange' | 'submit' // Client vs server

  // Validation rules
  required?: boolean
  previousValue?: TValue

  // Document context
  id?: string | number
  collectionSlug?: string

  // Access
  overrideAccess?: boolean

  // User state
  preferences: DocumentPreferences
}
```

### 4.2 Built-in Validators

**Pattern:**

```typescript
// Each field type has a default validator
export const validations = {
  text,
  textarea,
  email,
  number,
  checkbox,
  date,
  richText,
  select,
  radio,
  point,
  relationship,
  upload,
  array,
  blocks,
  code,
  json,
  // Special validators
  password,
  confirmPassword,
  username,
}
```

**Validation Flow:**

1. Field's `validate` function called (if provided)
2. If no custom validator, use built-in validator based on field type
3. Validator receives full context (data, siblings, operation, etc.)
4. Returns `true` for valid, `string` error message for invalid
5. Async validation supported (e.g., checking DB constraints)

### 4.3 Custom Validation

```typescript
// Inline validator
{
  type: 'text',
  name: 'slug',
  validate: async (value, { operation, req, id }) => {
    if (!value) return true

    // Check uniqueness
    const existing = await req.payload.find({
      collection: 'posts',
      where: {
        slug: { equals: value },
        id: { not_equals: id }
      },
      limit: 1
    })

    if (existing.docs.length > 0) {
      return 'Slug must be unique'
    }

    // Check format
    if (!/^[a-z0-9-]+$/.test(value)) {
      return 'Slug can only contain lowercase letters, numbers, and hyphens'
    }

    return true
  }
}

// Cross-field validation
{
  type: 'date',
  name: 'endDate',
  validate: (value, { siblingData }) => {
    if (!value || !siblingData.startDate) return true

    const start = new Date(siblingData.startDate)
    const end = new Date(value)

    if (end < start) {
      return 'End date must be after start date'
    }

    return true
  }
}

// Conditional validation
{
  type: 'text',
  name: 'discountCode',
  validate: (value, { siblingData, required }) => {
    // Only validate if discount type is 'code'
    if (siblingData.discountType !== 'code') return true

    if (!value) {
      return 'Discount code is required when type is "code"'
    }

    if (value.length < 4) {
      return 'Discount code must be at least 4 characters'
    }

    return true
  }
}
```

### 4.4 Validation Patterns

**Required Validation:**

```typescript
// Handled automatically before custom validators
if (required && !value) {
  return t('validation:required')
}

// For checkboxes
if (field.type === 'checkbox' && field.required && field.defaultValue === undefined) {
  field.defaultValue = false // Auto-set in sanitization
}
```

**Min/Max Validation:**

```typescript
// Numbers
if (typeof max === 'number' && value > max) {
  return t('validation:greaterThanMax', { max, value })
}
if (typeof min === 'number' && value < min) {
  return t('validation:lessThanMin', { min, value })
}

// Strings
if (maxLength && value.length > maxLength) {
  return t('validation:shorterThanMax', { maxLength })
}
if (minLength && value.length < minLength) {
  return t('validation:longerThanMin', { minLength })
}

// Arrays
if (maxRows && array.length > maxRows) {
  return t('validation:requiresNoMoreThan', { count: maxRows })
}
if (minRows && array.length < minRows) {
  return t('validation:requiresAtLeast', { count: minRows })
}
```

**Pattern/Regex Validation:**

```typescript
{
  type: 'text',
  name: 'phoneNumber',
  validate: (value) => {
    if (!value) return true
    const phoneRegex = /^\+?1?\d{9,15}$/
    return phoneRegex.test(value) || 'Invalid phone number format'
  }
}
```

**Async DB Validation:**

```typescript
{
  type: 'relationship',
  name: 'category',
  relationTo: 'categories',
  validate: async (value, { req }) => {
    if (!value) return true

    const category = await req.payload.findByID({
      collection: 'categories',
      id: value
    })

    if (category.archived) {
      return 'Cannot select an archived category'
    }

    return true
  }
}
```

---

## 5. Field Hooks

### 5.1 Hook Execution Order

```
Operation Flow:
┌─────────────────────┐
│  Request Arrives    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  beforeValidate     │  ← Sanitize input, compute values
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Field Validation   │  ← Built-in + custom validators
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  beforeChange       │  ← Transform data before save
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Write to Database  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  afterChange        │  ← Post-save side effects
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  afterRead          │  ← Transform on retrieval
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Return to Client   │
└─────────────────────┘

Special:
┌─────────────────────┐
│  beforeDuplicate    │  ← Before document duplication
└─────────────────────┘
```

### 5.2 Hook Types and Arguments

```typescript
export type FieldHook<TData, TValue, TSiblingData> = (
  args: FieldHookArgs<TData, TValue, TSiblingData>,
) => Promise<TValue> | TValue

export type FieldHookArgs<TData, TValue, TSiblingData> = {
  // Document data
  data?: Partial<TData> // Full document (mutable in beforeValidate/beforeChange)
  originalDoc?: TData // Original doc before changes
  previousDoc?: TData // Doc before changes (afterChange only)
  previousSiblingDoc?: TData // Sibling data before changes

  // Field data
  value?: TValue // Current field value
  previousValue?: TValue // Value before changes
  siblingData: Partial<TSiblingData> // Same-level fields
  siblingFields: (Field | TabAsField)[] // Sibling field configs
  blockData: JsonObject | undefined // Parent block data

  // Context
  req: PayloadRequest
  operation?: 'create' | 'update' | 'read' | 'delete'
  field: FieldAffectingData // Field configuration

  // Path info
  path: (string | number)[] // With array indexes
  schemaPath: string[] // Without indexes
  indexPath: number[] // Just indexes

  // Collection/global
  collection: SanitizedCollectionConfig | null
  global: SanitizedGlobalConfig | null

  // Read-specific (afterRead hook)
  depth?: number
  currentDepth?: number
  showHiddenFields?: boolean
  findMany?: boolean // True for find operations

  // Other
  context: RequestContext
  overrideAccess?: boolean
  draft?: boolean
}
```

### 5.3 beforeValidate Hook

**Purpose:** Sanitize input, compute derived values, set defaults

```typescript
{
  type: 'text',
  name: 'slug',
  hooks: {
    beforeValidate: [
      // Auto-generate slug from title
      ({ value, siblingData, operation }) => {
        if (operation === 'create' && !value && siblingData.title) {
          return slugify(siblingData.title, { lower: true, strict: true })
        }
        return value
      }
    ]
  }
}

{
  type: 'number',
  name: 'price',
  hooks: {
    beforeValidate: [
      // Round to 2 decimals
      ({ value }) => {
        if (typeof value === 'number') {
          return Math.round(value * 100) / 100
        }
        return value
      }
    ]
  }
}

{
  type: 'array',
  name: 'tags',
  hooks: {
    beforeValidate: [
      // Deduplicate and normalize
      ({ value }) => {
        if (!Array.isArray(value)) return value

        const normalized = value.map(tag =>
          tag.toLowerCase().trim()
        )
        return [...new Set(normalized)]  // Remove duplicates
      }
    ]
  }
}
```

**Built-in Sanitization:**

`payload-main/packages/payload/src/fields/hooks/beforeValidate/promise.ts` (lines 80-140)

```typescript
switch (field.type) {
  case 'checkbox':
    // String to boolean conversion
    /** ... convert 'true'/'false'/'' to boolean */
    break

  case 'number':
    // String to number conversion
    /** ... parse string to number, handle empty string */
    break

  case 'relationship':
  case 'upload':
    // Normalize empty values
    /** ... convert '', 'none', 'null' to null or [] */
    // Extract ID from populated docs
    /** ... if populated object, extract just the ID */
    break

  case 'richText':
    // Parse JSON string
    /** ... try JSON.parse if string */
    break

  case 'array':
  case 'blocks':
    // Normalize zero values
    /** ... convert '0'/0 to [] */
    break
}
```

### 5.4 beforeChange Hook

**Purpose:** Transform data before saving, side effects

```typescript
{
  type: 'date',
  name: 'publishedAt',
  hooks: {
    beforeChange: [
      // Auto-set published date when status changes to 'published'
      ({ siblingData, value, operation }) => {
        if (operation === 'update' && siblingData.status === 'published' && !value) {
          return new Date().toISOString()
        }
        return value
      }
    ]
  }
}

{
  type: 'text',
  name: 'email',
  hooks: {
    beforeChange: [
      // Normalize email
      ({ value }) => {
        return value ? value.toLowerCase().trim() : value
      }
    ]
  }
}

{
  type: 'richText',
  name: 'content',
  hooks: {
    beforeChange: [
      // Extract first image for thumbnail
      async ({ value, siblingData, req }) => {
        if (value && !siblingData.thumbnail) {
          const firstImage = extractFirstImage(value)  // Custom function
          if (firstImage) {
            siblingData.thumbnail = firstImage
          }
        }
        return value
      }
    ]
  }
}
```

**Difference from beforeValidate:**

- `beforeValidate`: Runs before validation, sanitizes input
- `beforeChange`: Runs after validation passes, before DB write
- Both can modify data, but beforeChange guarantees valid data

### 5.5 afterChange Hook

**Purpose:** Post-save side effects (don't modify current document)

```typescript
{
  type: 'text',
  name: 'status',
  hooks: {
    afterChange: [
      // Send notification when published
      async ({ value, previousValue, req, data }) => {
        if (value === 'published' && previousValue !== 'published') {
          await req.payload.sendEmail({
            to: data.author.email,
            subject: 'Your post is now published!',
            html: `Your post "${data.title}" is now live.`
          })
        }
        return value
      }
    ]
  }
}

{
  type: 'upload',
  name: 'avatar',
  hooks: {
    afterChange: [
      // Delete old avatar when changed
      async ({ value, previousValue, req }) => {
        if (previousValue && previousValue !== value) {
          await req.payload.delete({
            collection: 'media',
            id: previousValue
          })
        }
        return value
      }
    ]
  }
}

{
  type: 'relationship',
  name: 'categories',
  hooks: {
    afterChange: [
      // Update category counts
      async ({ value, previousValue, req }) => {
        const added = value.filter(v => !previousValue.includes(v))
        const removed = previousValue.filter(v => !value.includes(v))

        for (const categoryId of added) {
          await req.payload.update({
            collection: 'categories',
            id: categoryId,
            data: { postCount: { increment: 1 } }
          })
        }

        for (const categoryId of removed) {
          await req.payload.update({
            collection: 'categories',
            id: categoryId,
            data: { postCount: { decrement: 1 } }
          })
        }

        return value
      }
    ]
  }
}
```

**Key Patterns:**

- Return value is ignored (can't modify document)
- Access both `value` and `previousValue`
- Perfect for notifications, logging, cache invalidation
- Can trigger other API operations
- Runs after successful DB write

### 5.6 afterRead Hook

**Purpose:** Transform data when reading from DB

```typescript
{
  type: 'text',
  name: 'email',
  hooks: {
    afterRead: [
      // Mask email in certain contexts
      ({ value, req }) => {
        if (!req.user || req.user.role !== 'admin') {
          return value.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        }
        return value
      }
    ]
  }
}

{
  type: 'number',
  name: 'price',
  hooks: {
    afterRead: [
      // Convert cents to dollars
      ({ value }) => {
        return value ? value / 100 : value
      }
    ]
  }
}

{
  type: 'richText',
  name: 'content',
  hooks: {
    afterRead: [
      // Add computed reading time
      ({ value, siblingData }) => {
        if (value) {
          const text = extractText(value)  // Get plain text
          const words = text.split(/\s+/).length
          const readingTime = Math.ceil(words / 200)  // 200 wpm
          siblingData.readingTime = readingTime
        }
        return value
      }
    ]
  }
}
```

**Key Patterns:**

- Runs on every read (find, findByID)
- Can modify value for display
- Access `depth`, `currentDepth`, `showHiddenFields`
- Good for computed/virtual fields
- Careful with performance (runs frequently)

### 5.7 beforeDuplicate Hook

**Purpose:** Handle document duplication

```typescript
{
  type: 'text',
  name: 'slug',
  unique: true,
  hooks: {
    beforeDuplicate: [
      // Append timestamp to duplicated slug
      ({ value }) => {
        return `${value}-${Date.now()}`
      }
    ]
  }
}

{
  type: 'number',
  name: 'orderNumber',
  unique: true,
  hooks: {
    beforeDuplicate: [
      // Clear order number (will get new one)
      () => null
    ]
  }
}

{
  type: 'relationship',
  name: 'sharedResources',
  hooks: {
    beforeDuplicate: [
      // Keep relationships in duplicates
      ({ value }) => value
    ]
  }
}
```

**Default Behavior:**

- Fields with `unique: true` return `null` (cleared)
- Other fields copy value as-is
- Can override per-field with hook

---

## 6. Conditional Fields

### 6.1 Condition Function

```typescript
export type Condition<TData, TSiblingData> = (
  data: Partial<TData>, // Full document data
  siblingData: Partial<TSiblingData>, // Same-level fields
  context: {
    blockData: Partial<TData> // Parent block data
    operation: Operation // 'create' | 'update' | 'read'
    path: (string | number)[] // Field path
    user: PayloadRequest['user'] // Current user
  },
) => boolean
```

### 6.2 Condition Examples

```typescript
// Show field based on sibling value
{
  type: 'text',
  name: 'externalUrl',
  admin: {
    condition: (data, siblingData) => {
      return siblingData.linkType === 'external'
    }
  }
}

// Show based on user role
{
  type: 'select',
  name: 'priority',
  options: ['low', 'medium', 'high', 'critical'],
  admin: {
    condition: (data, siblingData, { user }) => {
      return user?.role === 'admin' || user?.role === 'editor'
    }
  }
}

// Show based on operation
{
  type: 'date',
  name: 'publishedAt',
  admin: {
    condition: (data, siblingData, { operation }) => {
      // Only show when updating
      return operation === 'update'
    }
  }
}

// Complex nested condition
{
  type: 'number',
  name: 'discountPercentage',
  admin: {
    condition: (data, siblingData, { blockData }) => {
      // Show if:
      // 1. Product is on sale
      // 2. User is admin
      // 3. In a promotional block
      return siblingData.onSale === true &&
             blockData?.type === 'promotion'
    }
  }
}

// Array field conditions
{
  type: 'array',
  name: 'variants',
  fields: [
    {
      type: 'text',
      name: 'sku'
    },
    {
      type: 'number',
      name: 'wholesalePrice',
      admin: {
        condition: (data, siblingData, { user }) => {
          // Show wholesale price only to wholesalers
          return user?.accountType === 'wholesale'
        }
      }
    }
  ]
}
```

### 6.3 Condition Behavior

**Client-side:**

- Hides/shows fields in admin UI
- Hidden fields don't submit data
- Re-evaluates on dependency changes

**Server-side:**

- Runs during validation
- If condition false, field validation skipped
- Field access control still applies
- Prevents tampering (can't submit hidden field)

**Best Practices:**

```typescript
// ❌ Bad: External API call (slow, unreliable)
condition: async (data) => {
  const result = await fetch('/api/check')
  return result.allowed
}

// ✅ Good: Use local data
condition: (data, siblingData) => {
  return siblingData.type === 'premium'
}

// ❌ Bad: Depends on deeply nested data (hard to track)
condition: (data) => {
  return data.config.settings.advanced.features.enabled
}

// ✅ Good: Use sibling or parent data
condition: (data, siblingData, { blockData }) => {
  return siblingData.enabled || blockData.enabled
}
```

---

## 7. Localization Per Field

### 7.1 Localization Configuration

```typescript
// Collection-level localization
{
  slug: 'posts',
  fields: [
    {
      type: 'text',
      name: 'title',
      localized: true  // Separate value per locale
    },
    {
      type: 'richText',
      name: 'content',
      localized: true
    },
    {
      type: 'text',
      name: 'slug',
      localized: false  // Same slug for all locales
    }
  ]
}
```

### 7.2 Data Storage

**Non-localized field:**

```typescript
{
  title: 'Hello World',
  slug: 'hello-world'
}
```

**Localized field:**

```typescript
{
  title: {
    en: 'Hello World',
    es: 'Hola Mundo',
    fr: 'Bonjour le monde'
  },
  slug: 'hello-world'  // Not localized
}
```

### 7.3 Localization Patterns

**Fallback Locales:**

```typescript
// Config level
{
  localization: {
    locales: ['en', 'es', 'fr'],
    defaultLocale: 'en',
    fallback: true  // Fall back to default if locale missing
  }
}

// On read, if Spanish missing:
// 1. Check 'es' value
// 2. Fall back to 'en' (default)
// 3. Return first available locale
// 4. Return null
```

**Nested Localization:**

```typescript
{
  type: 'group',
  name: 'meta',
  localized: true,  // Makes ALL sub-fields localized
  fields: [
    { type: 'text', name: 'title' },      // Automatically localized
    { type: 'textarea', name: 'description' }  // Automatically localized
  ]
}

// Data structure:
{
  meta: {
    en: {
      title: 'English Title',
      description: 'English Description'
    },
    es: {
      title: 'Título en Español',
      description: 'Descripción en Español'
    }
  }
}
```

**Array Localization:**

```typescript
{
  type: 'array',
  name: 'features',
  localized: true,  // Each locale has independent array
  fields: [
    { type: 'text', name: 'title' },
    { type: 'textarea', name: 'description' }
  ]
}

// Data:
{
  features: {
    en: [
      { id: 'f1', title: 'Fast', description: 'Lightning fast' },
      { id: 'f2', title: 'Secure', description: 'Bank-grade security' }
    ],
    es: [
      { id: 'f3', title: 'Rápido', description: 'Súper rápido' }
      // Spanish version has different items
    ]
  }
}
```

**Partial Localization:**

```typescript
{
  type: 'group',
  name: 'content',
  fields: [
    {
      type: 'text',
      name: 'title',
      localized: true  // Localized
    },
    {
      type: 'upload',
      name: 'image',
      relationTo: 'media',
      localized: false  // Shared across locales
    }
  ]
}

// Data:
{
  content: {
    title: {
      en: 'Welcome',
      es: 'Bienvenido'
    },
    image: 'media123'  // Same image for all
  }
}
```

### 7.4 Localization Rules

1. **Parent overrides child:** If group/array is localized, fields within inherit
2. **Cannot nest localized:** Can't have localized field inside localized parent
3. **Relationships not localized by default:** ID refs same across locales
4. **RichText special handling:** Can localize entire rich text tree
5. **Fallback chain:** Missing locale → default locale → first available → null

---

## 8. Admin UI Rendering

### 8.1 Component Architecture

**Field Component Structure:**

```typescript
// Server Component (SSR)
export type TextFieldServerComponent = FieldServerComponent<
  TextField, // Full server config
  TextFieldClientWithoutType, // Client-safe config
  TextFieldBaseServerProps // Additional server props
>

// Client Component (Interactive)
export type TextFieldClientComponent = FieldClientComponent<
  TextFieldClientWithoutType, // Client config
  TextFieldBaseClientProps // Additional client props
>

// Props passed to components
type FieldClientComponent<TFieldClient, TBaseProps> = {
  field: TFieldClient // Sanitized field config
  path: string // Field path in form
  value: any // Current value
  onChange: (value: any) => void
  disabled?: boolean
  readOnly?: boolean
  validate?: Validate
  // ... form state
} & TBaseProps
```

### 8.2 Customizable Components

Each field type supports custom components:

```typescript
{
  type: 'text',
  name: 'title',
  admin: {
    components: {
      // Replace entire field
      Field: '/components/CustomTextField',

      // Replace label
      Label: '/components/CustomLabel',

      // Replace error message
      Error: '/components/CustomError',

      // Replace description
      Description: '/components/CustomDescription',

      // Add before/after input
      beforeInput: ['/components/CharCounter'],
      afterInput: ['/components/Tooltip'],

      // List view cell
      Cell: '/components/CustomCell',

      // Diff view
      Diff: '/components/CustomDiff',

      // Filter component
      Filter: '/components/CustomFilter'
    }
  }
}
```

### 8.3 List View Integration

**Cell Rendering:**

```typescript
{
  type: 'text',
  name: 'status',
  admin: {
    components: {
      Cell: ({ data, rowData }) => {
        const color = {
          draft: 'gray',
          published: 'green',
          archived: 'red'
        }[data]

        return <Badge color={color}>{data}</Badge>
      }
    }
  }
}
```

**Column Visibility:**

```typescript
{
  type: 'richText',
  name: 'content',
  admin: {
    disableListColumn: true  // Don't show in column selector
  }
}
```

**Filtering:**

```typescript
{
  type: 'select',
  name: 'category',
  options: [/* ... */],
  admin: {
    disableListFilter: false,  // Show in filters
    components: {
      Filter: '/components/CategoryFilter'  // Custom filter UI
    }
  }
}
```

**Sorting:**

```typescript
// Only these types are sortable:
const sortableFieldTypes = [
  'text',
  'textarea',
  'code',
  'json',
  'number',
  'email',
  'radio',
  'select',
  'date',
]
```

### 8.4 Edit View Layout

**Position:**

```typescript
{
  type: 'group',
  name: 'sidebar',
  admin: {
    position: 'sidebar'  // Moves to sidebar
  },
  fields: [
    { type: 'select', name: 'status', options: [/* ... */] },
    { type: 'date', name: 'publishedAt' }
  ]
}
```

**Conditional UI:**

```typescript
{
  type: 'text',
  name: 'customValue',
  admin: {
    condition: (data) => data.type === 'custom',
    hidden: false,     // Not hidden by default
    disabled: false,   // Not disabled by default
    readOnly: false    // Not read-only by default
  }
}
```

**Width Control:**

```typescript
{
  type: 'row',
  fields: [
    {
      type: 'text',
      name: 'firstName',
      admin: {
        width: '50%'  // Half width
      }
    },
    {
      type: 'text',
      name: 'lastName',
      admin: {
        width: '50%'
      }
    }
  ]
}
```

---

## 9. Database Mapping

### 9.1 Field to Database Type Mapping

```typescript
// Simplified mapping (varies by adapter)

// Text fields → VARCHAR/TEXT
type: 'text'        → VARCHAR(maxLength) or TEXT
type: 'textarea'    → TEXT
type: 'email'       → VARCHAR(255)
type: 'code'        → TEXT

// Numeric → Numeric types
type: 'number'      → DECIMAL/DOUBLE/INTEGER (based on step/decimals)

// Boolean → BOOLEAN
type: 'checkbox'    → BOOLEAN

// Temporal → TIMESTAMP
type: 'date'        → TIMESTAMP WITH TIME ZONE

// JSON → JSONB/JSON
type: 'json'        → JSONB (Postgres) / JSON (MongoDB)
type: 'richText'    → JSONB (stores editor state)

// Enums → ENUM or VARCHAR with CHECK
type: 'select'      → ENUM (if enumName) or VARCHAR
type: 'radio'       → ENUM or VARCHAR

// Relationships → Foreign Keys
type: 'relationship' → VARCHAR/INTEGER (FK to related collection)
type: 'upload'       → VARCHAR/INTEGER (FK to upload collection)

// Compositional → Separate tables or JSONB
type: 'array'       → Separate table with parent FK
type: 'blocks'      → Separate table(s) per block type
type: 'group'       → Nested columns or JSONB

// Special
type: 'point'       → GEOMETRY(Point) or ARRAY[2]
type: 'join'        → No storage (virtual field)
```

### 9.2 Table Structure Examples

**Simple Collection:**

```sql
-- posts collection with basic fields
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content JSONB,  -- richText
  status VARCHAR(20) CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

**Localized Fields:**

```sql
-- posts with localized title
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  slug VARCHAR(255) NOT NULL,  -- Not localized
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE posts_locales (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
  title VARCHAR(255),  -- Localized
  content JSONB,       -- Localized
  UNIQUE(parent_id, locale)
);
```

**Array Fields:**

```sql
-- posts with array field
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Array stored as separate table
CREATE TABLE posts_tags (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  order INTEGER NOT NULL,  -- For array ordering
  value VARCHAR(100) NOT NULL,  -- Array item value
  UNIQUE(parent_id, order)
);
```

**Blocks Fields:**

```sql
-- posts with blocks
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE posts_blocks (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  order INTEGER NOT NULL,
  block_type VARCHAR(50) NOT NULL,  -- 'hero', 'textBlock', etc.
  UNIQUE(parent_id, order)
);

-- Hero block fields
CREATE TABLE posts_blocks_hero (
  id UUID PRIMARY KEY REFERENCES posts_blocks(id) ON DELETE CASCADE,
  heading VARCHAR(255),
  tagline TEXT,
  background_image_id UUID REFERENCES media(id)
);

-- Text block fields
CREATE TABLE posts_blocks_text (
  id UUID PRIMARY KEY REFERENCES posts_blocks(id) ON DELETE CASCADE,
  content JSONB
);
```

**Relationship Fields:**

```sql
-- Single relationship
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  author_id UUID REFERENCES users(id),  -- Single relationship
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Many relationship
CREATE TABLE posts_categories (
  id UUID PRIMARY KEY,
  posts_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  categories_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  order INTEGER,  -- If isSortable: true
  UNIQUE(posts_id, categories_id)
);

-- Polymorphic relationship
CREATE TABLE posts_related (
  id UUID PRIMARY KEY,
  posts_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  related_type VARCHAR(50) NOT NULL,  -- 'pages', 'products', etc.
  related_id UUID NOT NULL,
  order INTEGER,
  UNIQUE(posts_id, related_type, related_id)
);
```

### 9.3 Indexing Strategy

```typescript
{
  type: 'text',
  name: 'slug',
  unique: true,     // Creates UNIQUE INDEX
  index: true       // Creates regular INDEX (redundant if unique)
}

// Generated:
// CREATE UNIQUE INDEX idx_posts_slug ON posts(slug);
```

**Auto-indexed fields:**

- `id` - Primary key
- Foreign keys (relationships)
- `unique: true` fields
- `index: true` fields

**Custom indexes:**

```typescript
// Collection-level composite indexes
{
  slug: 'posts',
  fields: [/* ... */],
  indexes: [
    {
      fields: { slug: 'asc', status: 'asc' },
      unique: false
    },
    {
      fields: { author: 'asc', publishedAt: 'desc' }
    }
  ]
}
```

### 9.4 Database Adapter Differences

**Postgres (Drizzle):**

- Uses proper relational tables
- Array fields → separate tables with FKs
- Blocks → separate tables per block type
- Locales → separate `_locales` tables
- Full ACID compliance
- Strong typing with Drizzle schema

**MongoDB:**

- Uses embedded documents
- Array fields → nested arrays
- Blocks → nested array of objects
- Locales → nested objects by locale
- No join overhead for embedded data
- Flexible schema

**SQLite:**

- Similar to Postgres but simpler
- Limited JSON support (stored as text)
- No true UUID type (text)
- Good for development/small scale

---

## 10. Recommendations for tiny-cms

### 10.1 Core Field Types to Implement (8 types)

**Priority 1: Essential (5 types)**

1. **text** - Single-line text, tags (hasMany)
2. **textarea** - Multi-line text
3. **number** - Numeric values
4. **checkbox** - Boolean flags
5. **richText** - Rich content (Lexical adapter)

**Priority 2: Important (3 types)** 6. **select** - Single/multi select from options 7. **relationship** - References to other collections 8. **date** - Date/datetime values

**Why these 8:**

- Cover 90% of use cases
- Simple to implement
- Clear validation patterns
- Good database mapping
- Essential for CMS functionality

### 10.2 Simplified Field Architecture

```typescript
// Base field interface
interface TinyFieldBase {
  type: FieldType
  name: string
  label?: string
  defaultValue?: any
  required?: boolean
  unique?: boolean

  // Validation
  validate?: (value: any, context: ValidationContext) => string | true

  // Hooks (simplified)
  hooks?: {
    beforeSave?: (value: any) => any
    afterRead?: (value: any) => any
  }

  // Admin
  admin?: {
    description?: string
    placeholder?: string
    hidden?: boolean
    readOnly?: boolean
    condition?: (data: any) => boolean
  }
}

// Specific field types
interface TextField extends TinyFieldBase {
  type: 'text'
  minLength?: number
  maxLength?: number
  hasMany?: boolean // For tags/arrays
}

interface NumberField extends TinyFieldBase {
  type: 'number'
  min?: number
  max?: number
}

interface SelectField extends TinyFieldBase {
  type: 'select'
  options: Array<string | { label: string; value: string }>
  hasMany?: boolean
}

interface RelationshipField extends TinyFieldBase {
  type: 'relationship'
  relationTo: string // Collection name
  hasMany?: boolean
}

interface RichTextField extends TinyFieldBase {
  type: 'richText'
  // Use Lexical adapter
}

interface DateField extends TinyFieldBase {
  type: 'date'
}

interface CheckboxField extends TinyFieldBase {
  type: 'checkbox'
}

interface TextareaField extends TinyFieldBase {
  type: 'textarea'
  minLength?: number
  maxLength?: number
}
```

### 10.3 Simplified Validation

```typescript
// Built-in validators for each type
const validators = {
  text: (value, field: TextField) => {
    if (field.required && !value) return 'Required'
    if (field.minLength && value.length < field.minLength) {
      return `Must be at least ${field.minLength} characters`
    }
    if (field.maxLength && value.length > field.maxLength) {
      return `Must be no more than ${field.maxLength} characters`
    }
    return true
  },

  number: (value, field: NumberField) => {
    if (field.required && value == null) return 'Required'
    if (field.min != null && value < field.min) {
      return `Must be at least ${field.min}`
    }
    if (field.max != null && value > field.max) {
      return `Must be no more than ${field.max}`
    }
    return true
  },

  select: (value, field: SelectField) => {
    if (field.required && !value) return 'Required'
    const values = Array.isArray(value) ? value : [value]
    const validValues = field.options.map((opt) => (typeof opt === 'string' ? opt : opt.value))
    for (const v of values) {
      if (!validValues.includes(v)) return 'Invalid selection'
    }
    return true
  },

  relationship: async (value, field: RelationshipField, ctx) => {
    if (field.required && !value) return 'Required'
    // Verify relationship exists
    const exists = await ctx.db.findOne(field.relationTo, { id: value })
    if (!exists) return 'Invalid reference'
    return true
  },

  // ... others
}
```

### 10.4 What to Skip

**Fields to skip initially:**

- `array` - Can use `hasMany` on simple fields
- `blocks` - Too complex, use array of relationships instead
- `group` - Use flat fields or nested collections
- `tabs` - UI-only, not needed for API
- `row` / `collapsible` - UI layout, not needed
- `code` / `json` - Use textarea
- `point` - Niche use case
- `radio` - Use select instead
- `upload` - Use relationship to media collection
- `join` - Advanced feature
- `ui` - No data storage

**Features to skip:**

- Polymorphic relationships (single collection only)
- Field-level access control (use collection-level)
- Multiple hook types (just beforeSave, afterRead)
- beforeDuplicate hook
- Localization (add later if needed)
- filterOptions (static options only)
- Custom admin components
- Sortable arrays
- TypeScript schema generation

**Simplifications:**

1. **No localization:** English only initially
2. **No polymorphic relations:** One collection per relationship
3. **Simple hooks:** Just beforeSave and afterRead
4. **Static options:** No dynamic option filtering
5. **No nested fields:** Flat structure or separate collections
6. **Basic validation:** Built-in rules + custom validator function
7. **Simple admin:** Auto-generated forms, no custom components

### 10.5 Database Schema Pattern

```typescript
// Simple approach: Use Drizzle schema directly

import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core'

// Generated from field definitions
const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),

  // text field
  title: varchar('title', { length: 255 }).notNull(),

  // textarea field
  excerpt: text('excerpt'),

  // richText field (stores JSON)
  content: text('content'), // JSON.stringify/parse

  // number field
  viewCount: integer('view_count').default(0),

  // checkbox field
  published: boolean('published').default(false),

  // date field
  publishedAt: timestamp('published_at'),

  // relationship field (single)
  authorId: uuid('author_id').references(() => users.id),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Many-to-many relationship (hasMany: true)
const postsToCategories = pgTable('posts_to_categories', {
  postId: uuid('post_id')
    .references(() => posts.id)
    .notNull(),
  categoryId: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
})

// hasMany on simple fields (like tags)
const postsTags = pgTable('posts_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .references(() => posts.id)
    .notNull(),
  value: varchar('value', { length: 100 }).notNull(),
})
```

### 10.6 Implementation Roadmap

**Phase 1: Core Fields (Week 1)**

- Implement 5 essential fields (text, textarea, number, checkbox, richText)
- Basic validation
- Simple hooks (beforeSave, afterRead)
- Database mapping

**Phase 2: Relationships (Week 2)**

- Relationship field (single only)
- Foreign key constraints
- Population logic
- Basic validation

**Phase 3: Advanced Fields (Week 3)**

- Select field (static options)
- Date field
- hasMany for simple fields

**Phase 4: Polish (Week 4)**

- Conditional fields
- Better error messages
- Admin UI generation
- Documentation

### 10.7 Key Takeaways

1. **Start simple:** 8 field types cover most needs
2. **Skip complexity:** No polymorphic, no localization, no blocks
3. **Clear patterns:** Each field has validation, hooks, DB mapping
4. **Composability:** Use relationships instead of nested fields
5. **Extensibility:** Custom validate function for special cases
6. **Performance:** Index appropriately, limit population depth
7. **Type safety:** Generate TypeScript types from schema

---

## Conclusion

Payload's field system is comprehensive but can be simplified significantly for tiny-cms. The core insight is that **~8 field types** (text, textarea, number, checkbox, select, relationship, date, richText) can handle the vast majority of content modeling needs.

Key simplifications for tiny-cms:

- Skip compositional fields (array, blocks, group) - use flat structure or separate collections
- Skip advanced features (polymorphic, localization, multiple hooks)
- Use simple validation pattern (built-in + custom function)
- Direct database mapping (no complex table structures)
- Basic admin UI (auto-generated forms)

The Payload patterns worth keeping:

- Strong typing for field definitions
- Validation with context (siblingData, operation)
- Simple hook system (beforeSave, afterRead)
- Conditional field rendering
- Clear separation of concerns (validation, hooks, admin)

This focused approach will deliver a functional, maintainable CMS field system without the complexity of Payload's full implementation.
