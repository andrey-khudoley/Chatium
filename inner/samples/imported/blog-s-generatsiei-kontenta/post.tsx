import { jsx } from '@app/html-jsx'
import BlogPostPage from './pages/BlogPostPage.vue'
import PostsTable from './tables/posts.table'
import { getThumbnailUrl } from '@app/storage'

export const blogPostRoute = app.get('/:slug', async (ctx, req) => {
  const [post] = await PostsTable.findAll(ctx, {
    where: {
      slug: req.params.slug
    },
    limit: 1
  })

  if (!post) {
    return ctx.resp.notFound()
  }

  // If post is not published, only admins can view it
  if (!post.published && (!ctx.user || !ctx.user.is('Admin'))) {
    return ctx.resp.notFound()
  }

  const postExcerpt = post.excerpt || (post.content ? post.content.substring(0, 160) : '')
  const postImageUrl = post.coverImage ? getThumbnailUrl(ctx, post.coverImage, 1200, 630) : null

  return (
    <html>
      <head>
        <title>{post.title} - Имя автора</title>
        <meta name="description" content={postExcerpt} />

        {/* Open Graph meta tags */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={postExcerpt} />
        <meta property="og:image" content={postImageUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Название блога - Персональный блог" />
        <meta property="article:author" content="Название блога" />
        {post.publishedAt && (
          <meta
            property="article:published_time"
            content={new Date(post.publishedAt).toISOString()}
          />
        )}
        {post.tags &&
          post.tags.split(',').map((tag) => <meta property="article:tag" content={tag.trim()} />)}

        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={postExcerpt} />
        <meta name="twitter:image" content={postImageUrl} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <style type="text/tailwindcss">{`
          body {
            --color-primary: #2563eb;
            --color-secondary: #1e40af;
            --color-accent: #3b82f6;
            --color-dark: #111827;
            --color-light: #f8fafc;
            --font-sans: Inter, sans-serif;
            --font-serif: Georgia, serif;
            --font-mono: 'Courier New', monospace;
          }
          
          .prose {
            max-width: none;
          }
          
          .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
            color: var(--color-dark);
            font-weight: 600;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          
          .prose h1 { font-size: 2.25rem; line-height: 2.5rem; }
          .prose h2 { font-size: 1.875rem; line-height: 2.25rem; }
          .prose h3 { font-size: 1.5rem; line-height: 2rem; }
          
          .prose p {
            color: #4b5563;
            line-height: 1.7;
            margin-bottom: 1.5rem;
          }
          
          .prose a {
            color: var(--color-primary);
            text-decoration: none;
          }
          
          .prose a:hover {
            text-decoration: underline;
          }
          
          .prose code {
            background: #f1f5f9;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
          }
          
          .prose pre {
            background: #1e293b;
            color: #f1f5f9;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 1.5rem 0;
          }
          
          .prose ul, .prose ol {
            margin: 1.5rem 0;
            padding-left: 1.5rem;
          }
          
          .prose li {
            margin: 0.5rem 0;
            color: #4b5563;
          }
        `}</style>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <BlogPostPage post={post} />
      </body>
    </html>
  )
})
