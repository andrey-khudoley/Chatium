import { jsx } from '@app/html-jsx'
import { apiInvitesByTokenRoute, apiInvitesAcceptRoute } from './api/invites'
import { apiChatJoinRoute } from './api/chats'
import { getUserById, findIdentities, normalizeIdentityKey } from '@app/auth'

export const invitePageRoute = app.get('/:token', async (ctx, req) => {
  const { token } = req.params
  
  try {
    // Получаем информацию о приглашении
    const inviteInfo = await apiInvitesByTokenRoute({ token }).run(ctx)
    
    if (!inviteInfo.success) {
      return (
        <html>
          <head>
            <title>Приглашение не найдено</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
            <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
          </head>
          <body class="min-h-screen bg-gray-100 flex items-center justify-center">
            <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
              <div class="text-red-500 text-5xl mb-4">
                <i class="fas fa-exclamation-circle"></i>
              </div>
              <h1 class="text-2xl font-bold text-gray-800 mb-2">Приглашение не найдено</h1>
              <p class="text-gray-600 mb-6">Ссылка недействительна или срок её действия истёк.</p>
              <a 
                href={indexPageRoute.url()}
                class="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors"
                style="background-color: #008069;"
              >
                На главную
              </a>
            </div>
          </body>
        </html>
      )
    }
    
    const { invite, chat } = inviteInfo
    
    // Проверяем, не истёк ли срок действия
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return (
        <html>
          <head>
            <title>Срок действия истёк</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
            <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
          </head>
          <body class="min-h-screen bg-gray-100 flex items-center justify-center">
            <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
              <div class="text-yellow-500 text-5xl mb-4">
                <i class="fas fa-clock"></i>
              </div>
              <h1 class="text-2xl font-bold text-gray-800 mb-2">Срок действия истёк</h1>
              <p class="text-gray-600 mb-6">Это приглашение больше не действительно.</p>
              <a 
                href={indexPageRoute.url()}
                class="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors"
                style="background-color: #008069;"
              >
                На главную
              </a>
            </div>
          </body>
        </html>
      )
    }
    
    // Если пользователь авторизован
    if (ctx.user) {
      // Проверяем, не является ли пользователь уже участником
      const isAlreadyMember = inviteInfo.isAlreadyMember
      
      if (isAlreadyMember) {
        // Перенаправляем в чат
        return ctx.resp.redirect(`${indexPageRoute.url()}#/chat/${chat.feedId}`)
      }
      
      // Показываем страницу с информацией о чате и кнопкой присоединиться
      return (
        <html>
          <head>
            <title>Приглашение в чат</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
            <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
            <style>{`
              .bg-primary { background-color: #008069; }
              .text-primary { color: #008069; }
              .hover\:bg-secondary:hover { background-color: #00a884; }
            `}</style>
          </head>
          <body class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
              <div class="mb-6">
                <div class="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <i class="fas fa-comments text-white text-3xl"></i>
                </div>
                <h1 class="text-2xl font-bold text-gray-800 mb-2">Вас пригласили в чат</h1>
              </div>
              
              <div class="bg-gray-50 rounded-lg p-4 mb-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-1">{chat.title}</h2>
                {chat.description && <p class="text-gray-600 text-sm">{chat.description}</p>}
                <div class="mt-3 flex items-center justify-center gap-4 text-sm text-gray-500">
                  <span><i class="fas fa-users mr-1"></i> {inviteInfo.participantsCount} участников</span>
                  {chat.type === 'public' && <span><i class="fas fa-globe mr-1"></i> Публичный</span>}
                </div>
              </div>
              
              {invite.invitedBy && (
                <p class="text-gray-600 mb-6">
                  Пригласил{invite.invitedBy.gender === 'female' ? 'а' : ''}: <span class="font-medium">{invite.invitedBy.displayName}</span>
                </p>
              )}
              
              <form method="POST" action={`${apiInvitesAcceptRoute.url()}?back=${encodeURIComponent(indexPageRoute.url() + '#/chat/' + chat.feedId)}`}>
                <input type="hidden" name="token" value={token} />
                <button 
                  type="submit"
                  class="w-full bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors mb-3"
                >
                  {chat.type === 'channel' ? 'Перейти к каналу' : 'Перейти к группе'}
                </button>
              </form>
              
              <a 
                href={indexPageRoute.url()}
                class="inline-block text-gray-500 hover:text-gray-700 transition-colors"
              >
                Отмена
              </a>
            </div>
          </body>
        </html>
      )
    }
    
    // Пользователь не авторизован - показываем страницу с предложением войти
    return (
      <html>
        <head>
          <title>Приглашение в чат</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
          <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
          <style>{`
            .bg-primary { background-color: #008069; }
            .text-primary { color: #008069; }
            .hover\:bg-secondary:hover { background-color: #00a884; }
          `}</style>
        </head>
        <body class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div class="mb-6">
              <div class="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-comments text-white text-3xl"></i>
              </div>
              <h1 class="text-2xl font-bold text-gray-800 mb-2">Вас пригласили в чат</h1>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 class="text-xl font-semibold text-gray-800 mb-1">{chat.title}</h2>
              {chat.description && <p class="text-gray-600 text-sm">{chat.description}</p>}
            </div>
            
            <p class="text-gray-600 mb-6">
              Чтобы присоединиться к чату, войдите в свой аккаунт или зарегистрируйтесь.
            </p>
            
            <a 
              href={`/s/auth/signin?back=${encodeURIComponent('/tg/invite~' + token)}`}
              class="inline-block w-full bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors mb-3"
            >
              Войти
            </a>
            
            <a 
              href={indexPageRoute.url()}
              class="inline-block text-gray-500 hover:text-gray-700 transition-colors"
            >
              На главную
            </a>
          </div>
        </body>
      </html>
    )
    
  } catch (error) {
    console.error('Error loading invite:', error)
    
    return (
      <html>
        <head>
          <title>Ошибка</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        </head>
        <body class="min-h-screen bg-gray-100 flex items-center justify-center">
          <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div class="text-red-500 text-5xl mb-4">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">Произошла ошибка</h1>
            <p class="text-gray-600 mb-6">Не удалось загрузить информацию о приглашении.</p>
            <a 
              href={indexPageRoute.url()}
              class="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors"
              style="background-color: #008069;"
            >
              На главную
            </a>
          </div>
        </body>
      </html>
    )
  }
})

// Импортируем для использования в шаблоне
import { indexPageRoute } from './index'