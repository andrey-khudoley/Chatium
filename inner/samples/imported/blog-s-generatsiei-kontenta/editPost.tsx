import { jsx } from '@app/html-jsx'
import EditPostPage from './pages/EditPostPage.vue'
import { genSocketId } from '@app/socket'
import { requireAccountRole } from '@app/auth'

// Use export to access edit post route in components and other modules
export const editPostPageRoute = app.get('/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const socketId = `post-edit-${req.params.id}`
  const encodedSocketId = await genSocketId(ctx, socketId)

  return (
    <html>
      <head>
        <title>Редактирование поста - Персональный блог</title>
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
            --color-success: #10b981;
            --color-danger: #ef4444;
            --color-warning: #f59e0b;
            --color-info: #3b82f6;
            --font-sans: Inter, sans-serif;
            --font-serif: Georgia, serif;
            --font-mono: 'Courier New', monospace;
          }
        `}</style>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <EditPostPage postId={req.params.id} encodedSocketId={encodedSocketId} />
      </body>
    </html>
  )
})
