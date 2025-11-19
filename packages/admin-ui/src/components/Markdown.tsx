import type { Options } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownPreview(props: Options) {
  if (!props.remarkPlugins) {
    props.remarkPlugins = [remarkGfm]
  }
  return <ReactMarkdown {...props} />
}
