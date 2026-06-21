// @shared
import { jsx } from '@app/html-jsx'
import { requireAnyUser } from '@app/auth'
import UnitTestsPage from './pages/UnitTestsPage.vue'

export const testsPageRoute = app.get('/', async (ctx) => {
  // Защищаем страницу тестов авторизацией
  requireAnyUser(ctx)

  return (
    <html>
      <head>
        <title>Unit Tests - Telegram Channel Analytics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />

        {/* TailwindCSS */}
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>

        {/* FontAwesome */}
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />

        <style>{`
          :root {
            --color-bg: #0a0a0a;
            --color-bg-secondary: #141414;
            --color-bg-tertiary: #1a1a1a;
            --color-text: #e8e8e8;
            --color-text-secondary: #a0a0a0;
            --color-text-tertiary: #707070;
            --color-border: #2a2a2a;
            --color-border-light: #3a3a3a;
            --color-accent: #d3234b;
            --color-accent-hover: #e6395f;
            --color-accent-light: rgba(211, 35, 75, 0.15);
            --color-accent-medium: rgba(211, 35, 75, 0.25);
            --color-success: #00ff41;
            --color-error: #ff0040;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html { 
            background: #0a0a0a;
          }
          
          body { 
            margin: 0; 
            background: #0a0a0a;
            position: relative;
            min-height: 100vh;
            font-family: 'Share Tech Mono', 'Courier New', monospace;
            color: var(--color-text);
            letter-spacing: 0.03em;
            overflow-x: hidden;
            overflow-y: auto;
          }
          
          ::selection {
            background: #e0335a;
            color: #ffffff;
          }
          
          ::-moz-selection {
            background: #e0335a;
            color: #ffffff;
          }
          
          /* CRT Screen Vignette */
          #geometric-bg {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1;
            pointer-events: none;
            background: 
              radial-gradient(
                ellipse 100% 100% at 50% 50%,
                transparent 0%,
                transparent 75%,
                rgba(0, 0, 0, 0.3) 85%,
                rgba(0, 0, 0, 0.7) 92%,
                rgba(0, 0, 0, 0.95) 97%,
                rgba(0, 0, 0, 0.99) 100%
              );
            border-radius: 3% / 4%;
            box-shadow: 
              inset 0 0 200px 50px rgba(0, 0, 0, 0.8),
              inset 0 0 100px 20px rgba(0, 0, 0, 0.6);
            animation: crt-ambient-glow 3s ease-in-out infinite;
          }
          
          @media (max-width: 768px) {
            #geometric-bg {
              background: 
                radial-gradient(
                  ellipse 150% 100% at 50% 50%,
                  transparent 0%,
                  transparent 80%,
                  rgba(0, 0, 0, 0.5) 90%,
                  rgba(0, 0, 0, 0.95) 100%
                );
              border-radius: 0;
              box-shadow: 
                inset 0 100px 80px -50px rgba(0, 0, 0, 0.9),
                inset 0 -100px 80px -50px rgba(0, 0, 0, 0.9);
            }
          }
          
          @keyframes crt-ambient-glow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.97; }
          }
          
          /* Scanlines */
          body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.03),
              rgba(0, 0, 0, 0.03) 1px,
              transparent 1px,
              transparent 2px
            );
            pointer-events: none;
            z-index: 999999;
            border-radius: 3% / 4%;
            opacity: 0.6;
            animation: scanline-flicker 8s linear infinite;
          }
          
          @keyframes scanline-flicker {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.55; }
          }
        `}</style>
      </head>
      <body>
        <div id="geometric-bg"></div>
        <UnitTestsPage />
      </body>
    </html>
  )
})
