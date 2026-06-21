import { jsx } from '@app/html-jsx'
import BlogHomePage from './pages/BlogHomePage.vue'

// Use export to access index route in components and other modules
export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Персональный блог - Название блога</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Персональный блог о разработке" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script src={ctx.account.url('/s/metric/clarity.js')}></script>
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
          
          .prose {
            max-width: none;
          }
          
          .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
            color: var(--color-dark);
            font-weight: 600;
          }
          
          .prose p {
            color: #4b5563;
            line-height: 1.7;
          }
          
          .prose a {
            color: var(--color-primary);
            text-decoration: none;
          }
          
          .prose a:hover {
            text-decoration: underline;
          }
          
          .blog-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          
          .blog-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
        `}</style>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <BlogHomePage />
      </body>
    </html>
  )
})
