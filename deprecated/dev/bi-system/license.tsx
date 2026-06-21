// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import { tailwindScript, cssVariables, commonStyles } from './styles'
import { indexPageRoute } from './index'
import { settingsPageRoute } from './settings'
import { getProjectName } from './shared/projectName'
import { Debug } from './shared/debug'
import { applyDebugLevel } from './lib/logging'

export const licensePageRoute = app.html('/license', async (ctx, req) => {
  await applyDebugLevel(ctx, 'license-page')

  // Проверяем авторизацию
  try {
    requireAccountRole(ctx, 'Admin')
  } catch (error) {
    Debug.warn(ctx, '[license] Пользователь не админ, редирект на login')
    const loginUrl =
      (await import('./login')).loginPageRoute.url() + `?back=${encodeURIComponent(ctx.req.url)}`
    return (
      <html>
        <head>
          <meta http-equiv="refresh" content={`0; url=${loginUrl}`} />
          <script>{`window.location.href = '${loginUrl}'`}</script>
        </head>
        <body>
          <p>Перенаправление на страницу входа...</p>
        </body>
      </html>
    )
  }

  const projectName = await getProjectName(ctx)

  return (
    <html>
      <head>
        <title>{projectName} - Лицензия</title>
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

        <script>{`
          (function() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else if (savedTheme === 'light') {
              document.documentElement.classList.remove('dark');
            } else {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (prefersDark) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            }
          })();
        `}</script>
      </head>
      <body>
        <div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
          <Header
            projectName={projectName}
            indexPageUrl={indexPageRoute.url()}
            isAdmin={true}
            settingsPageUrl={settingsPageRoute.url()}
            pageTitle="Лицензия"
          />
          <div class="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div class="mb-6">
              <a
                href={indexPageRoute.url()}
                class="text-[var(--color-primary)] hover:opacity-70 flex items-center gap-2"
              >
                <i class="fas fa-arrow-left"></i>
                <span>Вернуться к главной</span>
              </a>
            </div>

            <div class="card">
              <div class="mb-8 text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg">
                  <i class="fas fa-file-contract text-2xl text-white"></i>
                </div>
                <h1 class="text-3xl font-bold mb-2 text-[var(--color-text)]">
                  Лицензионное соглашение
                </h1>
                <p class="text-[var(--color-text-secondary)]">
                  Ограниченная лицензия на использование программного обеспечения
                </p>
              </div>

              <div
                class="prose prose-lg max-w-none dark:prose-invert"
                style={{
                  color: 'var(--color-text)'
                }}
              >
                <section class="mb-8">
                  <h2 class="text-2xl font-bold mb-4 text-[var(--color-text)]">
                    1. Общие положения
                  </h2>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    Настоящее Лицензионное соглашение (далее — «Соглашение») регулирует отношения
                    между Индивидуальным предпринимателем Худолей Андреем Германовичем (ИНН:
                    1234567890), далее именуемым «Лицензиар», и лицом, получившим доступ к
                    программному обеспечению «{projectName}» (далее — «Программное обеспечение»),
                    далее именуемым «Лицензиат».
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    Доступ к Программному обеспечению осуществляется на основании ограниченной
                    лицензии. Использование Программного обеспечения означает полное и
                    безоговорочное принятие условий настоящего Соглашения.
                  </p>
                </section>

                <section class="mb-8">
                  <h2 class="text-2xl font-bold mb-4 text-[var(--color-text)]">
                    2. Предмет лицензии
                  </h2>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    Лицензиар предоставляет Лицензиату право на использование Программного
                    обеспечения «{projectName}» в соответствии с условиями настоящего Соглашения.
                    Все права на Программное обеспечение, включая авторские права, права на товарные
                    знаки и иные интеллектуальные права, принадлежат Лицензиару.
                  </p>
                </section>

                <section class="mb-8">
                  <h2 class="text-2xl font-bold mb-4 text-[var(--color-text)]">
                    3. Ограничения и запреты
                  </h2>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    <strong class="text-[var(--color-text)]">3.1.</strong> Любое копирование
                    программного обеспечения полностью или частично строго запрещено.
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    <strong class="text-[var(--color-text)]">3.2.</strong> Запрещается копирование,
                    воспроизведение, распространение, публикация, передача третьим лицам или
                    использование любым иным способом:
                  </p>
                  <ul class="list-disc list-inside mb-4 ml-4 text-[var(--color-text-secondary)] space-y-2">
                    <li>исходного кода Программного обеспечения;</li>
                    <li>собранного (скомпилированного) кода;</li>
                    <li>
                      любых материалов, документов, инструкций, связанных с Программным
                      обеспечением;
                    </li>
                    <li>
                      любых наработок, конфигураций, кастомизаций, расширений, созданных на основе
                      или с использованием Программного обеспечения.
                    </li>
                  </ul>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    <strong class="text-[var(--color-text)]">3.3.</strong> Запрещается
                    реверс-инжиниринг, декомпиляция, дизассемблирование или любое иное
                    преобразование Программного обеспечения.
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    <strong class="text-[var(--color-text)]">3.4.</strong> Запрещается создание
                    производных произведений на основе Программного обеспечения.
                  </p>
                </section>

                <section class="mb-8">
                  <h2 class="text-2xl font-bold mb-4 text-[var(--color-text)]">
                    4. Ответственность
                  </h2>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    За нарушение условий настоящего Соглашения, включая незаконное копирование,
                    распространение или использование Программного обеспечения, Лицензиат несёт
                    ответственность в соответствии с действующим законодательством Российской
                    Федерации об интеллектуальной собственности.
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    Лицензиар вправе требовать возмещения ущерба, причинённого нарушением настоящего
                    Соглашения, включая упущенную выгоду.
                  </p>
                </section>

                <section class="mb-8">
                  <h2 class="text-2xl font-bold mb-4 text-[var(--color-text)]">
                    5. Используемые технологии и сторонние ресурсы
                  </h2>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    Программное обеспечение разработано с использованием технологий и ресурсов
                    сторонних компаний. Все права на используемые технологии и платформы принадлежат
                    их правообладателям.
                  </p>

                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    <strong class="text-[var(--color-text)]">5.1. Chatium</strong>
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed ml-4">
                    Программное обеспечение разработано на платформе Chatium — российской low-code
                    платформе для создания и управления веб-приложениями и мобильными приложениями.
                    Chatium предоставляет инфраструктуру, фреймворки и инструменты разработки.
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed ml-4">
                    <strong class="text-[var(--color-text)]">Правообладатель:</strong> ООО «ЧАТИУМ»
                    <br />
                    <strong class="text-[var(--color-text)]">ИНН:</strong> 9704246293
                    <br />
                    <strong class="text-[var(--color-text)]">ОГРН:</strong> 1247700499342
                    <br />
                    <strong class="text-[var(--color-text)]">Адрес:</strong> г. Москва, Столярный
                    пер., д. 3, корп. 20, пом. 2/2
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed ml-4">
                    Все права на технологии, инструменты и инфраструктуру платформы Chatium
                    принадлежат ООО «ЧАТИУМ». Лицензиат признаёт и соглашается, что использование
                    платформы Chatium регулируется соответствующими лицензионными соглашениями и
                    условиями использования платформы.
                  </p>

                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    <strong class="text-[var(--color-text)]">5.2. GetCourse</strong>
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed ml-4">
                    Программное обеспечение интегрировано с платформой GetCourse — российской
                    SaaS-платформой для запуска, продажи и проведения онлайн-курсов. GetCourse
                    предоставляет источник данных (источник истины) для событий, а также владеет и
                    управляет сервером ClickHouse, используемым для хранения и анализа данных.
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed ml-4">
                    <strong class="text-[var(--color-text)]">Правообладатель:</strong> ООО «СИСТЕМА
                    ГЕТКУРС»
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed ml-4">
                    Все права на технологии, платформу GetCourse, данные, хранящиеся в системе
                    GetCourse, а также на сервер ClickHouse принадлежат ООО «СИСТЕМА ГЕТКУРС» или
                    его правообладателям. Лицензиат признаёт и соглашается, что доступ к данным и
                    использование сервисов GetCourse регулируется соответствующими лицензионными
                    соглашениями и условиями использования платформы GetCourse.
                  </p>

                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    <strong class="text-[var(--color-text)]">5.3. Ограничения использования</strong>
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    Лицензиат признаёт, что любые копирование, воспроизведение, распространение или
                    использование технологий Chatium и GetCourse без соответствующего разрешения
                    правообладателей строго запрещено. Лицензиат не имеет права заявлять права
                    собственности на технологии, платформы или инструменты, предоставляемые Chatium
                    и GetCourse.
                  </p>
                </section>

                <section class="mb-8">
                  <h2 class="text-2xl font-bold mb-4 text-[var(--color-text)]">
                    6. Конфиденциальность
                  </h2>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    Лицензиат обязуется сохранять конфиденциальность в отношении Программного
                    обеспечения, его функциональности, структуры, алгоритмов работы и любой другой
                    информации, связанной с Программным обеспечением.
                  </p>
                </section>

                <section class="mb-8">
                  <h2 class="text-2xl font-bold mb-4 text-[var(--color-text)]">
                    7. Заключительные положения
                  </h2>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    <strong class="text-[var(--color-text)]">7.1.</strong> Лицензиар оставляет за
                    собой право изменять условия настоящего Соглашения. Изменения вступают в силу с
                    момента их публикации.
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    <strong class="text-[var(--color-text)]">7.2.</strong> Все споры, возникающие из
                    настоящего Соглашения или в связи с ним, подлежат разрешению в соответствии с
                    законодательством Российской Федерации.
                  </p>
                  <p class="mb-4 text-[var(--color-text-secondary)] leading-relaxed">
                    <strong class="text-[var(--color-text)]">7.3.</strong> Лицензиар вправе в любое
                    время прекратить действие лицензии в случае нарушения Лицензиатом условий
                    настоящего Соглашения.
                  </p>
                </section>

                <section
                  class="mb-8 p-6 rounded-lg border-2"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-primary)'
                  }}
                >
                  <div class="flex items-start gap-4">
                    <div class="text-2xl" style={{ color: 'var(--color-primary)' }}>
                      <i class="fas fa-info-circle"></i>
                    </div>
                    <div>
                      <h3 class="text-lg font-bold mb-2 text-[var(--color-text)]">
                        Информация о лицензиаре
                      </h3>
                      <p class="text-[var(--color-text-secondary)] mb-1">
                        <strong class="text-[var(--color-text)]">
                          Индивидуальный предприниматель:
                        </strong>{' '}
                        Худолей Андрей Германович
                      </p>
                      <p class="text-[var(--color-text-secondary)]">
                        <strong class="text-[var(--color-text)]">ИНН:</strong> 1234567890
                      </p>
                    </div>
                  </div>
                </section>

                <div
                  class="text-center pt-6 border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p class="text-sm text-[var(--color-text-tertiary)]">
                    Дата последнего обновления:{' '}
                    {new Date().toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <Footer licenseUrl={licensePageRoute.url()} />
        </div>
      </body>
    </html>
  )
})

export default licensePageRoute
