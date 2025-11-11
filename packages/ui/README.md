# @tiny-cms/ui

UI components for tiny-cms admin interface. Provides a minimal, black and white design with all essential components for building admin panels.

## Features

- 🎨 **Minimal Design**: Clean black and white aesthetic
- 📦 **8 Field Types**: Text, Number, Email, Select, Checkbox, Date, Relation, RichText
- ✍️ **Markdown Support**: Integrated editor (@uiw/react-md-editor) and renderer (react-markdown with GFM)
- 🎯 **Tailwind CSS**: Built with Tailwind for easy customization
- 🔧 **shadcn/ui Style**: Component API inspired by shadcn/ui
- ⚡ **TypeScript**: Full type safety

## Installation

```bash
pnpm add @tiny-cms/ui
```

## Styling

Import the CSS file in your app:

```tsx
import '@tiny-cms/ui/styles.css'
```

Or if using Next.js app directory, add to your root layout:

```tsx
import '@tiny-cms/ui/styles.css'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

## Usage

### Field Components

```tsx
import { TextField, NumberField, EmailField } from '@tiny-cms/ui'

function MyForm() {
  const [name, setName] = useState('')
  const [age, setAge] = useState(0)

  return (
    <div>
      <TextField name="name" label="Name" value={name} onChange={setName} required />

      <NumberField name="age" label="Age" value={age} onChange={setAge} min={0} max={150} />

      <EmailField name="email" label="Email" required />
    </div>
  )
}
```

### Markdown Editor

```tsx
import { MarkdownEditor, MarkdownRenderer } from '@tiny-cms/ui'

function BlogPost() {
  const [content, setContent] = useState('')

  return (
    <div>
      <MarkdownEditor value={content} onChange={setContent} height={400} />

      <MarkdownRenderer content={content} />
    </div>
  )
}
```

### UI Components

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent } from '@tiny-cms/ui'

function Dashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Dashboard content</p>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

## Available Components

### UI Components

- Button
- Input
- Label
- Textarea
- Select
- Checkbox
- Card (with Header, Title, Description, Content, Footer)
- Table (with Header, Body, Footer, Row, Cell)

### Field Components

- TextField - Single/multiline text input
- NumberField - Numeric input with min/max
- EmailField - Email input with validation
- SelectField - Single/multiple selection
- CheckboxField - Boolean checkbox
- DateField - Date picker
- RelationField - Related document selector
- RichTextField - Markdown editor

### Markdown Components

- MarkdownEditor - Split-pane markdown editor with live preview
- MarkdownRenderer - Renders markdown with GitHub Flavored Markdown support

## Customization

All components accept a `className` prop for custom styling:

```tsx
<Button className="bg-blue-500 hover:bg-blue-600">Custom Button</Button>
```

Use the `cn()` utility for merging classes:

```tsx
import { cn } from '@tiny-cms/ui'

;<div className={cn('base-class', condition && 'conditional-class')}>Content</div>
```

## TypeScript

All components are fully typed. Import types as needed:

```tsx
import type { ButtonProps, TextFieldProps } from '@tiny-cms/ui'
```
