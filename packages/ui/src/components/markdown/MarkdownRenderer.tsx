/**
 * Markdown Renderer component
 * Uses react-markdown with GitHub Flavored Markdown support
 */

'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../../lib/utils'

export interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none',
        'prose-headings:font-semibold',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-muted prose-pre:border prose-pre:border-border',
        'prose-img:rounded-md prose-img:border prose-img:border-border',
        'prose-hr:border-border',
        'prose-table:border prose-table:border-border',
        'prose-th:border prose-th:border-border prose-th:bg-muted',
        'prose-td:border prose-td:border-border',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize link behavior (open external links in new tab)
          a: ({ node, ...props }) => {
            const href = props.href || ''
            const isExternal = href.startsWith('http')
            return (
              <a
                {...props}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
              />
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
