import Link from 'next/link'
import { getCMS } from '../../lib/cms'

interface Post extends Record<string, unknown> {
  id: string
  title: string
  slug: string
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

export default async function PostsPage() {
  const cms = getCMS()
  const result = await cms.find<Post>('posts', {
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
              <Link href="/posts" className="font-semibold hover:underline">
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
          <h2 className="mb-8 text-2xl font-semibold">All Posts</h2>

          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts published yet.</p>
          ) : (
            <div className="grid gap-4">
              {posts.map((post) => (
                <article
                  key={post.id as string}
                  className="rounded-lg border bg-card p-4 text-sm shadow-sm hover:shadow"
                >
                  <header className="space-y-1">
                    <h2 className="text-lg font-semibold">
                      <Link href={`/posts/${post.slug}`} className="hover:underline">
                        {post.title as string}
                      </Link>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {post.publishedAt &&
                        new Date(post.publishedAt as string).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      {post.author && ` · By ${(post.author as { name?: string }).name}`}
                    </p>
                  </header>

                  {post.excerpt && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {post.excerpt as string}
                    </p>
                  )}

                  {post.category && (
                    <div className="mt-3">
                      <Link
                        href={`/categories/${(post.category as { slug: string }).slug}`}
                        className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
                      >
                        {(post.category as { name: string }).name}
                      </Link>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

