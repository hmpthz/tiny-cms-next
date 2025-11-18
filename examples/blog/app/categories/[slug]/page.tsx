import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCMS } from '../../../lib/cms'

interface Category extends Record<string, unknown> {
  id: string
  name: string
  slug: string
  description?: string
}

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
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const cms = getCMS()
  const categoryResult = await cms.find<Category>('categories', {
    where: { slug },
    limit: 1,
  })

  const category = categoryResult.docs[0]

  if (!category) {
    notFound()
  }

  const postsResult = await cms.find<Post>('posts', {
    where: {
      published: true,
      category: category.id,
    },
    orderBy: { publishedAt: 'desc' },
  })

  const posts = postsResult.docs

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
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold">{category.name as string}</h2>
            {category.description && (
              <p className="text-sm text-muted-foreground">{category.description as string}</p>
            )}
          </div>

          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts in this category yet.</p>
          ) : (
            <div className="grid gap-4">
              {posts.map((post) => (
                <article
                  key={post.id as string}
                  className="rounded-lg border bg-card p-4 text-sm shadow-sm hover:shadow"
                >
                  <header className="space-y-1">
                    <h3 className="text-lg font-semibold">
                      <Link href={`/posts/${post.slug}`} className="hover:underline">
                        {post.title as string}
                      </Link>
                    </h3>
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
                </article>
              ))}
            </div>
          )}

          <div className="mt-8">
            <Link href="/posts" className="text-sm text-primary hover:underline">
              ← Back to all posts
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export async function generateStaticParams() {
  const cms = getCMS()
  const result = await cms.find<Category>('categories', {})

  return result.docs.map((category) => ({
    slug: category.slug,
  }))
}

