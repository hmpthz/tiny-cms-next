import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarkdownPreview } from '@tiny-cms/admin-ui'
import { getCMS } from '../../../lib/cms'

interface Post extends Record<string, unknown> {
  id: string
  title: string
  slug: string
  content: string
  publishedAt?: Date | string
  author?: {
    id: string
    name: string
  }
  category?: {
    id: string
    name: string
    slug: string
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const cms = getCMS()
  const result = await cms.find<Post>('posts', {
    where: {
      slug,
      published: true,
    },
    limit: 1,
  })

  const post = result.docs[0]

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              <Link href="/">Tiny CMS Blog</Link>
            </h1>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/posts" className="hover:underline">
                All Posts
              </Link>
              <Link href="/admin" className="hover:underline">
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <article className="mx-auto max-w-3xl">
          <header className="mb-8">
            <h1 className="mb-4 text-4xl font-bold">{post.title as string}</h1>
            <div className="text-sm text-muted-foreground">
              {post.publishedAt &&
                new Date(post.publishedAt as string).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              {post.author && ` · By ${(post.author as { name?: string }).name}`}
            </div>
            {post.category && (
              <div className="mt-4">
                <Link
                  href={`/categories/${(post.category as { slug: string }).slug}`}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
                >
                  {(post.category as { name: string }).name}
                </Link>
              </div>
            )}
          </header>

          <div className="prose prose-lg max-w-none">
            <MarkdownPreview>{post.content as string}</MarkdownPreview>
          </div>

          <div className="mt-12 border-t pt-8">
            <Link href="/posts" className="text-sm text-primary hover:underline">
              ← Back to all posts
            </Link>
          </div>
        </article>
      </main>
    </div>
  )
}

export async function generateStaticParams() {
  const cms = getCMS()
  const result = await cms.find<Post>('posts', {
    where: { published: true },
  })

  return result.docs.map((post) => ({
    slug: post.slug,
  }))
}
