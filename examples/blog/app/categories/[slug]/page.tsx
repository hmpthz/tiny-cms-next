import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCMS } from '../../../lib/cms'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@tiny-cms/ui'

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

  // Find category by slug
  const cms = getCMS()
  const categoryResult = await cms.find<Category>('categories', {
    where: { slug },
    limit: 1,
  })

  const category = categoryResult.docs[0]

  if (!category) {
    notFound()
  }

  // Find posts in this category
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">{category.name}</h2>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </div>

          {posts.length === 0 ? (
            <p className="text-muted-foreground">No posts in this category yet.</p>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <CardTitle>
                      <Link href={`/posts/${post.slug}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {post.publishedAt && new Date(post.publishedAt).toLocaleDateString()}
                      {post.author && ` • By ${post.author.name}`}
                    </CardDescription>
                  </CardHeader>
                  {post.excerpt && (
                    <CardContent>
                      <p className="text-muted-foreground">{post.excerpt}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8">
            <Link href="/posts" className="text-primary hover:underline">
              ← Back to all posts
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

// Generate static params for all categories
export async function generateStaticParams() {
  const cms = getCMS()
  const result = await cms.find<Category>('categories', {})

  return result.docs.map((category) => ({
    slug: category.slug,
  }))
}
