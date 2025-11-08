import Link from 'next/link'
import { cms } from '../lib/cms'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, MarkdownRenderer } from '@tiny-cms/ui'
import type { Document } from '@tiny-cms/core'

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
  // Fetch recent posts
  const result = await cms.find<Post>('posts', {
    limit: 5,
    orderBy: { publishedAt: 'desc' },
    where: { published: true },
  })

  const posts = result.docs

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-8">Recent Posts</h2>

          {posts.length === 0 ? (
            <p className="text-muted-foreground">No posts found. Create your first post in the admin panel.</p>
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
                  <CardContent>
                    {post.excerpt ? (
                      <p className="text-muted-foreground">{post.excerpt}</p>
                    ) : (
                      <div className="line-clamp-3">
                        <MarkdownRenderer content={post.content.substring(0, 200) + '...'} />
                      </div>
                    )}
                    <div className="mt-4">
                      <Link
                        href={`/posts/${post.slug}`}
                        className="text-primary hover:underline font-medium"
                      >
                        Read more →
                      </Link>
                    </div>
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
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/posts" className="text-primary hover:underline font-medium">
              View all posts →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>Built with Tiny CMS</p>
        </div>
      </footer>
    </div>
  )
}
