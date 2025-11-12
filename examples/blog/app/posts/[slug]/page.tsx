import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCMS } from '../../../lib/cms'
import { MarkdownRenderer } from '@tiny-cms/ui'

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

  // Find post by slug
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
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">
              <Link href="/">Tiny CMS Blog</Link>
            </h1>
            <nav className="space-x-6">
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
        <article className="max-w-3xl mx-auto">
          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
            <div className="text-muted-foreground">
              {post.publishedAt &&
                new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              {post.author && ` • By ${post.author.name}`}
            </div>
            {post.category && (
              <div className="mt-4">
                <Link
                  href={`/categories/${post.category.slug}`}
                  className="text-sm px-3 py-1 bg-secondary rounded hover:bg-secondary/80"
                >
                  {post.category.name}
                </Link>
              </div>
            )}
          </header>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none">
            <MarkdownRenderer content={post.content} />
          </div>

          {/* Back Link */}
          <div className="mt-12 pt-8 border-t">
            <Link href="/posts" className="text-primary hover:underline">
              ← Back to all posts
            </Link>
          </div>
        </article>
      </main>
    </div>
  )
}

// Generate static params for all posts
export async function generateStaticParams() {
  const cms = getCMS()
  const result = await cms.find<Post>('posts', {
    where: { published: true },
  })

  return result.docs.map((post) => ({
    slug: post.slug,
  }))
}
