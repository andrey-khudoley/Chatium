// @shared
import { jsx } from '@app/html-jsx'
import { getEnabledAuthProviders } from '@app/auth/provider'
import { tailwindScript, cssVariables, commonStyles } from './styles'
import LoginPage from './pages/LoginPage.vue'
import { indexPageRoute } from './index'
import { getProjectName } from './shared/projectName'
import { applyDebugLevel } from './lib/logging'

export const loginPageRoute = app.html('/', async (ctx, req) => {
  await applyDebugLevel(ctx, 'login-page')

  const back = (req.query.back as string) || indexPageRoute.url()

  // Получение доступных провайдеров авторизации
  const providers = await getEnabledAuthProviders(ctx)
  const projectName = await getProjectName(ctx)

  return (
    <html>
      <head>
        <title>{projectName} - Вход</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />

        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: tailwindScript }} />

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

        <style type="text/tailwindcss">{cssVariables}</style>
        <style>{commonStyles}</style>
        <style>{`
          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
            padding: 2rem;
          }
          
          .login-card {
            background: var(--color-bg-secondary);
            border-radius: 1.5rem;
            padding: 3rem;
            max-width: 480px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          
          .login-logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
            border-radius: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 32px rgba(14, 165, 233, 0.4);
          }
          
          .theme-toggle-login {
            position: fixed;
            top: 1.5rem;
            right: 1.5rem;
            width: 3.5rem;
            height: 3.5rem;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border: 1.5px solid rgba(255, 255, 255, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            transition: var(--transition);
            z-index: 1000;
            color: white;
            cursor: pointer;
          }
          
          .theme-toggle-login:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
          }
        `}</style>

        <script>{`
          // Инициализация темы
          function initTheme() {
            const savedTheme = localStorage.getItem('theme')
            const isDark = savedTheme === 'dark' || 
              (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
            
            if (isDark) {
              document.documentElement.classList.add('dark')
            }
            
            updateThemeIcon(isDark)
          }
          
          function updateThemeIcon(isDark) {
            const icon = document.querySelector('.theme-toggle-login i')
            if (icon) {
              icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon'
            }
          }
          
          function toggleTheme() {
            const isDark = document.documentElement.classList.toggle('dark')
            localStorage.setItem('theme', isDark ? 'dark' : 'light')
            updateThemeIcon(isDark)
          }
          
          // Инициализация при загрузке
          initTheme()
        `}</script>
      </head>
      <body>
        <button class="theme-toggle-login" onclick="toggleTheme()">
          <i class="fas fa-moon"></i>
        </button>

        <div class="login-container">
          <LoginPage providers={providers} back={back} />
        </div>
      </body>
    </html>
  )
})

export default loginPageRoute
