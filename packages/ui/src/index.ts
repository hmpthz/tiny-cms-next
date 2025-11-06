/**
 * @tiny-cms/ui - UI components for tiny-cms admin interface
 */

// UI Components (shadcn/ui style)
export { Button, buttonVariants } from './components/ui/button'
export type { ButtonProps } from './components/ui/button'

export { Input } from './components/ui/input'
export type { InputProps } from './components/ui/input'

export { Label } from './components/ui/label'
export type { LabelProps } from './components/ui/label'

export { Textarea } from './components/ui/textarea'
export type { TextareaProps } from './components/ui/textarea'

export { Select } from './components/ui/select'
export type { SelectProps } from './components/ui/select'

export { Checkbox } from './components/ui/checkbox'
export type { CheckboxProps } from './components/ui/checkbox'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/ui/card'

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './components/ui/table'

// Markdown Components
export { MarkdownEditor } from './components/markdown/MarkdownEditor'
export type { MarkdownEditorProps } from './components/markdown/MarkdownEditor'

export { MarkdownRenderer } from './components/markdown/MarkdownRenderer'
export type { MarkdownRendererProps } from './components/markdown/MarkdownRenderer'

// Field Components
export { FieldWrapper } from './components/fields/FieldWrapper'
export type { FieldWrapperProps } from './components/fields/FieldWrapper'

export { TextField } from './components/fields/TextField'
export type { TextFieldProps } from './components/fields/TextField'

export { NumberField } from './components/fields/NumberField'
export type { NumberFieldProps } from './components/fields/NumberField'

export { EmailField } from './components/fields/EmailField'
export type { EmailFieldProps } from './components/fields/EmailField'

export { SelectField } from './components/fields/SelectField'
export type { SelectFieldProps, SelectOption } from './components/fields/SelectField'

export { CheckboxField } from './components/fields/CheckboxField'
export type { CheckboxFieldProps } from './components/fields/CheckboxField'

export { DateField } from './components/fields/DateField'
export type { DateFieldProps } from './components/fields/DateField'

export { RelationField } from './components/fields/RelationField'
export type { RelationFieldProps, RelationOption } from './components/fields/RelationField'

export { RichTextField } from './components/fields/RichTextField'
export type { RichTextFieldProps } from './components/fields/RichTextField'

// Form Components
export { DocumentForm } from './components/forms/DocumentForm'
export type { DocumentFormProps } from './components/forms/DocumentForm'

// Utilities
export { cn, formatDate, formatDateForInput, truncate } from './lib/utils'
