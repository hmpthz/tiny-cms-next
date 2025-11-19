import Link from 'next/link'
import { MarkdownPreview } from '@tiny-cms/admin-ui'
import type { Document } from '@tiny-cms/core'
import { getCMS } from '../lib/cms'

interface Post extends Omit<Document, 'id'> {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
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

export default async function HomePage() {
  const cms = getCMS()
  const result = await cms.find<Post>('posts', {
    limit: 5,
    orderBy: { publishedAt: 'desc' },
    where: { published: true },
  })

  const posts = result.docs

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              <Link href="/">Tiny CMS Blog</Link>
            </h1>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/posts" className="hover:underline font-medium">
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
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-2xl font-semibold">Recent Posts</h2>

          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No posts found. Create your first post in the admin panel.
            </p>
          ) : (
            <div className="grid gap-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-lg border bg-card p-4 shadow-sm transition hover:shadow-md"
                >
                  <header className="space-y-1">
                    <h3 className="text-lg font-semibold">
                      <Link href={`/posts/${post.slug}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {post.publishedAt &&
                        new Date(post.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      {post.author && ` · By ${post.author.name}`}
                    </p>
                  </header>

                  <div className="mt-3 text-sm text-muted-foreground">
                    {post.excerpt ? (
                      <p>{post.excerpt}</p>
                    ) : (
                    <div className="prose prose-sm max-w-none line-clamp-3">
                      <MarkdownPreview>
                        {post.content.substring(0, 200) + '...'}
                      </MarkdownPreview>
                    </div>
                    )}
                  </div>

                  <footer className="mt-4 flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="font-medium text-primary hover:underline"
                    >
                      Read more →
                    </Link>
                    {post.category && (
                      <Link
                        href={`/categories/${post.category.slug}`}
                        className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
                      >
                        {post.category.name}
                      </Link>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/posts" className="text-sm font-medium text-primary hover:underline">
              View all posts →
            </Link>
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          <p>Built with tiny-cms, Next.js, Tailwind CSS v4, and Base UI.</p>
        </div>
      </footer>
    </div>
  )
}
