import Link from 'next/link'
import { getCMS } from '../../lib/cms'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@tiny-cms/ui'

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
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">
              <Link href="/">Tiny CMS Blog</Link>
            </h1>
            <nav className="space-x-6">
              <Link href="/posts" className="hover:underline font-semibold">
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
          <h2 className="text-2xl font-semibold mb-8">All Posts</h2>

          {posts.length === 0 ? (
            <p className="text-muted-foreground">No posts published yet.</p>
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
                      {post.category && (
                        <div className="mt-4">
                          <Link
                            href={`/categories/${post.category.slug}`}
                            className="text-sm px-2 py-1 bg-secondary rounded hover:bg-secondary/80"
                          >
                            {post.category.name}
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
