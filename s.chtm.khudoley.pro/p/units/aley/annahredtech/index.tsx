import { jsx } from '@app/html-jsx'

const PAGE_TITLE = 'Андрей Германович | EdTech Tech Lead Portfolio'
const PAGE_DESCRIPTION =
  'Премиальное портфолио технического лида для EdTech: GetCourse, Chatium, платежи, аналитика, автоматизация и инфраструктура.'

type CaseStudy = {
  label: string
  title: string
  summary: string
  stats: string[]
  details: string[]
}

type Capability = {
  title: string
  text: string
}

type ProcessStep = {
  code: string
  title: string
  text: string
}

const CASES: CaseStudy[] = [
  {
    label: 'GetCourse / Payments',
    title: 'Платежная страница с понятной логикой способов оплаты',
    summary:
      'Разложил платежные методы по бизнес-логике: LifePay СБП, ОТП, зарубежная оплата, запасные банки и правило суммы заказа. Получился прототип, который удобно обсуждать с руководителем продаж и технической командой.',
    stats: ['0.4% комиссия СБП', '3 контура оплат', '1 понятная презентация'],
    details: [
      'карта LifePay, Lava Top, ОТП, Т-Банк и GetCourse Pay',
      'архитектура виджета и webhook-цепочки',
      'правило отображения способов оплаты по сумме заказа'
    ]
  },
  {
    label: 'Chatium / GetCourse',
    title: 'Gateway для устойчивой связки Chatium и GetCourse',
    summary:
      'Собрал концепцию тонкого клиента между Chatium и GetCourse: стабильный вызов op + args, каталог операций и gateway, который снижает зависимость клиентских сценариев от изменений API.',
    stats: ['7 сценариев', '4 ADR', '1 тонкий клиент'],
    details: [
      'лендинг и заявка в GetCourse',
      'квиз, таблица и CRM-след',
      'оплата в GC и реакция в Chatium'
    ]
  },
  {
    label: 'Analytics / Funnels',
    title: 'Продажная аналитика для нескольких воронок',
    summary:
      'Набросал схему продажной аналитики для стека GC + Chatium + Refunels: источники, оплаты, продажники, продукты и UTM. Акцент на данных, которые уже можно собирать в рабочем контуре.',
    stats: ['UTM', 'продажи', 'воронки'],
    details: [
      'разбор параллельных запусков и источников',
      'схема метрик для руководителя и маркетинга',
      'задел под регулярное обновление показателей'
    ]
  },
  {
    label: 'Automation / YClients',
    title: 'Ассистент записи с корректной работой по клиентам',
    summary:
      'Разделил задачу записи на диагностические сессии на диалоговый слой, интеграции, хранение состояния, уведомления и аналитику. Отдельно зафиксировал цепочку поиска client_id для отмен и переносов.',
    stats: ['YClients', 'GetCourse', 'лист ожидания'],
    details: [
      'создание, перенос, отмена и подтверждение записей',
      'лист ожидания и эскалация менеджеру',
      'постконсультационное сопровождение до оплаты'
    ]
  },
  {
    label: 'Second Brain / Infra',
    title: 'База знаний и инфраструктура для рабочих контекстов',
    summary:
      'Markdown-first база знаний с Obsidian, Git, поисковым интерфейсом и VDS-контуром. Репозиторий остается источником истины, а индексы и поисковые слои можно пересобрать из исходных заметок.',
    stats: ['Markdown', 'Git', 'Search API'],
    details: [
      'архитектура сервиса знаний и поискового слоя',
      'VDS, systemd, backup, CLI runner',
      'принцип: репозиторий как источник истины'
    ]
  },
  {
    label: 'Operations / Access',
    title: 'Контроль доступов с понятным визуальным статусом',
    summary:
      'Для школ с повторами, марафонами и накопленным GetCourse-состоянием полезен внешний слой: тестовый пользователь, цветовая индикация, отдельное хранение прогресса и понятный статус для команды.',
    stats: ['300+ учеников', 'iframe', 'status map'],
    details: [
      'обновление прогресса по понятным правилам',
      'сервисные проверки перед запуском потока',
      'панель подсказок для менеджеров и техспецов'
    ]
  }
]

const CAPABILITIES: Capability[] = [
  {
    title: 'Техническое лидерство',
    text: 'ЛПР получает варианты, риски, последствия и понятный порядок решений. Команда получает задачи с границами, критериями и ответственными.'
  },
  {
    title: 'Прикладная архитектура',
    text: 'Node.js, TypeScript, Chatium, GetCourse, Linux, Postgres и MongoDB. Проектирую, пишу код, настраиваю инфраструктуру и фиксирую рабочие ограничения.'
  },
  {
    title: 'Автоматизация и ассистенты',
    text: 'Корпоративные GPT, диалоговые сценарии, tools и рабочие подсказки для команды. Внедрение через границы процесса, логи, состояние и проверку результата.'
  },
  {
    title: 'Воронки и платежи',
    text: 'Интеграции, webhook, UTM, способы оплаты, SBP, LifePay, Lava, YClients, amoCRM и прикладные детали, от которых зависит запуск.'
  }
]

const PROCESS_STEPS: ProcessStep[] = [
  {
    code: '01 / Audit',
    title: 'Разобрать контур',
    text: 'Системы, доступы, роли, данные, платежи, воронки, текущие боли и молчаливые договоренности.'
  },
  {
    code: '02 / Leverage',
    title: 'Выбрать рычаги',
    text: 'Что даст деньги, что снимет риск, что нужно собственнику и что стоит отложить до следующего этапа.'
  },
  {
    code: '03 / Build',
    title: 'Собрать прототип',
    text: 'Chatium, Node.js, TypeScript, API, scripts и рабочие инструменты. Быстро, с проверкой, логами и rollback.'
  },
  {
    code: '04 / Operate',
    title: 'Передать в режим',
    text: 'Документация, регламенты, задачи техспецам, контрольные панели и список следующих улучшений.'
  }
]

const SYSTEMS = [
  ['GetCourse', 'revenue core'],
  ['Chatium', 'product layer'],
  ['amoCRM', 'sales memory'],
  ['Assistants', 'tool boundary'],
  ['Postgres', 'state'],
  ['Linux', 'runtime'],
  ['YClients', 'booking'],
  ['Owner', 'decision API']
]

const PAGE_CSS = `
  :root {
    color-scheme: light;
    --ink: #151714;
    --ink-soft: #242921;
    --paper: #f4efe4;
    --paper-strong: #fffaf0;
    --muted: #6e7568;
    --line: rgba(21, 23, 20, 0.14);
    --line-strong: rgba(21, 23, 20, 0.26);
    --champagne: #d5b16c;
    --sage: #7f9c7a;
    --teal: #2e6e73;
    --brick: #9c4d3f;
    --blue: #305f83;
    --white: #fffef8;
    --shadow-soft: 0 24px 70px rgba(21, 23, 20, 0.12);
    --shadow-deep: 0 34px 120px rgba(7, 11, 9, 0.34);
  }

  * {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    min-height: 100vh;
    overflow-x: hidden;
    color: var(--ink);
    background:
      linear-gradient(90deg, rgba(21, 23, 20, 0.035) 1px, transparent 1px),
      linear-gradient(180deg, rgba(21, 23, 20, 0.03) 1px, transparent 1px),
      var(--paper);
    background-size: 96px 96px, 96px 96px, auto;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    line-height: 1.5;
    text-rendering: geometricPrecision;
  }

  body::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(115deg, rgba(255, 250, 240, 0.92), rgba(244, 239, 228, 0.64) 42%, rgba(232, 224, 207, 0.84)),
      linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(21, 23, 20, 0.04));
    pointer-events: none;
  }

  body::after {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 1000;
    background:
      linear-gradient(90deg, transparent, rgba(213, 177, 108, 0.2), transparent),
      #151714;
    background-size: 220% 100%, auto;
    pointer-events: none;
    animation: loadingCurtain 980ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  a {
    color: inherit;
  }

  .shell {
    width: min(1180px, calc(100% - 48px));
    margin: 0 auto;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    border-bottom: 1px solid rgba(255, 250, 240, 0.14);
    background: rgba(21, 23, 20, 0.82);
    color: var(--white);
    backdrop-filter: blur(22px);
  }

  .topbar-inner {
    display: flex;
    min-height: 74px;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 13px;
    min-width: 0;
    font-weight: 780;
    letter-spacing: 0;
  }

  .brand-mark {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid rgba(213, 177, 108, 0.7);
    border-radius: 6px;
    background: linear-gradient(180deg, rgba(213, 177, 108, 0.24), rgba(213, 177, 108, 0.06));
    color: var(--champagne);
    font-size: 13px;
    font-weight: 860;
  }

  .nav {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 254, 248, 0.68);
    font-size: 13px;
    font-weight: 680;
  }

  .nav a {
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 8px 11px;
    text-decoration: none;
  }

  .nav a:hover {
    border-color: rgba(255, 250, 240, 0.18);
    color: var(--white);
    background: rgba(255, 250, 240, 0.07);
  }

  .hero {
    position: relative;
    overflow: hidden;
    min-height: 780px;
    padding: 92px 0 86px;
    background:
      linear-gradient(90deg, rgba(255, 250, 240, 0.055) 1px, transparent 1px),
      linear-gradient(180deg, rgba(255, 250, 240, 0.048) 1px, transparent 1px),
      linear-gradient(135deg, #11140f 0%, #1b2119 48%, #101614 100%);
    background-size: 72px 72px, 72px 72px, auto;
    color: var(--white);
  }

  .hero::after {
    content: "";
    position: absolute;
    inset: auto 0 0;
    height: 160px;
    background: linear-gradient(180deg, transparent, rgba(244, 239, 228, 0.92));
    pointer-events: none;
  }

  .hero-grid {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(420px, 0.86fr);
    gap: 54px;
    align-items: center;
    animation: riseIn 760ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 22px;
    color: var(--champagne);
    font-size: 12px;
    font-weight: 820;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .eyebrow::before {
    content: "";
    width: 34px;
    height: 1px;
    background: currentColor;
  }

  h1,
  h2,
  h3,
  p {
    margin-top: 0;
  }

  h1 {
    max-width: 780px;
    margin-bottom: 24px;
    font-size: 72px;
    line-height: 0.98;
    letter-spacing: 0;
  }

  .lead {
    max-width: 660px;
    margin-bottom: 34px;
    color: rgba(255, 254, 248, 0.76);
    font-size: 21px;
    line-height: 1.48;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 44px;
  }

  .button {
    display: inline-flex;
    min-height: 50px;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 1px solid var(--ink);
    border-radius: 6px;
    padding: 0 18px;
    background: var(--ink);
    color: var(--white);
    font-size: 14px;
    font-weight: 780;
    text-decoration: none;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease,
      background 160ms ease,
      color 160ms ease;
  }

  .hero .button {
    border-color: var(--champagne);
    background: var(--champagne);
    color: #15130e;
  }

  .button.secondary,
  .hero .button.secondary {
    border-color: rgba(255, 254, 248, 0.28);
    background: transparent;
    color: var(--white);
  }

  .button:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 32px rgba(21, 23, 20, 0.18);
  }

  .button.secondary:hover {
    border-color: var(--champagne);
    color: var(--champagne);
  }

  .hero-proof {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    max-width: 760px;
    border: 1px solid rgba(255, 254, 248, 0.13);
    background: rgba(255, 254, 248, 0.045);
  }

  .fact {
    min-height: 116px;
    padding: 18px;
    border-right: 1px solid rgba(255, 254, 248, 0.13);
  }

  .fact:last-child {
    border-right: 0;
  }

  .fact strong {
    display: block;
    margin-bottom: 9px;
    color: var(--champagne);
    font-size: 30px;
    line-height: 1;
  }

  .fact span {
    display: block;
    color: rgba(255, 254, 248, 0.66);
    font-size: 13px;
    font-weight: 640;
    line-height: 1.36;
  }

  .audit-visual {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 254, 248, 0.18);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(255, 254, 248, 0.1), rgba(255, 254, 248, 0.04)),
      #151915;
    box-shadow: var(--shadow-deep);
    animation: riseIn 820ms cubic-bezier(0.22, 1, 0.36, 1) 220ms both;
  }

  .audit-visual::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(213, 177, 108, 0.11), transparent 34%, rgba(46, 110, 115, 0.12)),
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 44%);
    pointer-events: none;
  }

  .visual-head,
  .visual-body,
  .visual-footer {
    position: relative;
  }

  .visual-head {
    display: flex;
    min-height: 62px;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid rgba(255, 254, 248, 0.12);
    padding: 16px 18px;
  }

  .visual-title {
    display: grid;
    gap: 2px;
  }

  .visual-title strong {
    color: var(--white);
    font-size: 15px;
  }

  .visual-title span {
    color: rgba(255, 254, 248, 0.48);
    font-size: 12px;
    font-weight: 650;
  }

  .signal {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(127, 156, 122, 0.42);
    border-radius: 999px;
    padding: 7px 10px;
    color: #b9d5ad;
    background: rgba(127, 156, 122, 0.09);
    font-size: 12px;
    font-weight: 760;
    animation: signalPulse 2200ms ease-in-out infinite;
  }

  .signal::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 99px;
    background: #b9d5ad;
  }

  .visual-body {
    display: grid;
    grid-template-columns: minmax(0, 1.04fr) minmax(154px, 0.56fr);
    gap: 1px;
    background: rgba(255, 254, 248, 0.1);
  }

  .system-board,
  .risk-rail,
  .visual-footer {
    background: rgba(18, 22, 19, 0.86);
  }

  .system-board {
    min-height: 390px;
    padding: 18px;
  }

  .panel-kicker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    color: rgba(255, 254, 248, 0.54);
    font-size: 12px;
    font-weight: 760;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .map-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .system-node {
    position: relative;
    min-height: 86px;
    border: 1px solid rgba(255, 254, 248, 0.12);
    border-radius: 6px;
    padding: 14px;
    background:
      linear-gradient(145deg, rgba(255, 254, 248, 0.08), rgba(255, 254, 248, 0.025)),
      rgba(255, 254, 248, 0.03);
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      background 180ms ease;
  }

  .system-node:nth-child(3n + 1) {
    border-color: rgba(213, 177, 108, 0.32);
  }

  .system-node:nth-child(3n + 2) {
    border-color: rgba(46, 110, 115, 0.38);
  }

  .system-node strong {
    display: block;
    margin-bottom: 9px;
    color: var(--white);
    font-size: 15px;
  }

  .system-node:hover {
    transform: translateY(-2px);
    border-color: rgba(213, 177, 108, 0.7);
    background:
      linear-gradient(145deg, rgba(213, 177, 108, 0.14), rgba(255, 254, 248, 0.04)),
      rgba(255, 254, 248, 0.04);
  }

  .system-node span {
    display: inline-flex;
    border: 1px solid rgba(255, 254, 248, 0.12);
    border-radius: 999px;
    padding: 4px 7px;
    color: rgba(255, 254, 248, 0.55);
    font-size: 11px;
    font-weight: 700;
  }

  .risk-rail {
    display: grid;
    align-content: stretch;
    gap: 1px;
  }

  .risk-item {
    display: grid;
    align-content: center;
    min-height: 130px;
    padding: 16px;
    background: rgba(255, 254, 248, 0.035);
  }

  .risk-item small {
    display: block;
    margin-bottom: 9px;
    color: rgba(213, 177, 108, 0.88);
    font-size: 11px;
    font-weight: 820;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .risk-item b {
    display: block;
    margin-bottom: 6px;
    color: var(--white);
    font-size: 24px;
    line-height: 1;
  }

  .risk-item span {
    color: rgba(255, 254, 248, 0.58);
    font-size: 12px;
    font-weight: 620;
  }

  .visual-footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    border-top: 1px solid rgba(255, 254, 248, 0.1);
  }

  .visual-note {
    min-height: 110px;
    padding: 18px;
    background: rgba(255, 254, 248, 0.035);
  }

  .visual-note small {
    display: block;
    margin-bottom: 9px;
    color: rgba(255, 254, 248, 0.46);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .visual-note b {
    display: block;
    color: rgba(255, 254, 248, 0.88);
    font-size: 17px;
    line-height: 1.25;
  }

  .intro-band {
    margin-top: -34px;
    padding: 0 0 74px;
  }

  .brief {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    border: 1px solid rgba(21, 23, 20, 0.12);
    border-radius: 8px;
    overflow: hidden;
    background: var(--paper-strong);
    box-shadow: var(--shadow-soft);
    animation: riseIn 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .brief-panel {
    padding: 34px;
  }

  .brief-panel.dark {
    background: linear-gradient(135deg, #171b16, #232a20);
    color: var(--white);
  }

  .brief-panel .eyebrow {
    margin-bottom: 18px;
  }

  .brief-panel h2 {
    margin-bottom: 18px;
    font-size: 40px;
    line-height: 1.05;
    letter-spacing: 0;
  }

  .brief-panel p {
    margin-bottom: 0;
    color: rgba(255, 254, 248, 0.72);
    font-size: 16px;
  }

  .brief-list {
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .brief-list li {
    display: grid;
    grid-template-columns: 30px 1fr;
    gap: 12px;
    align-items: start;
    color: #384135;
    font-weight: 660;
  }

  .brief-list li::before {
    content: "✓";
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    border-radius: 6px;
    background: rgba(213, 177, 108, 0.2);
    color: #6f5520;
    font-size: 14px;
    font-weight: 900;
  }

  section {
    padding: 76px 0;
  }

  .section-head {
    display: grid;
    grid-template-columns: minmax(0, 0.88fr) minmax(280px, 0.48fr);
    gap: 32px;
    align-items: end;
    margin-bottom: 34px;
  }

  .section-head h2 {
    margin-bottom: 0;
    font-size: 48px;
    line-height: 1.04;
    letter-spacing: 0;
  }

  .section-head p {
    margin-bottom: 0;
    color: var(--muted);
    font-size: 16px;
  }

  .case-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .case-card {
    position: relative;
    display: flex;
    min-height: 500px;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(21, 23, 20, 0.13);
    border-radius: 8px;
    background: var(--paper-strong);
    box-shadow: 0 18px 48px rgba(21, 23, 20, 0.08);
    transition:
      transform 180ms ease,
      box-shadow 180ms ease,
      border-color 180ms ease;
  }

  .case-card::before {
    content: "";
    height: 7px;
    background: linear-gradient(90deg, var(--champagne), var(--teal), var(--brick));
    background-size: 180% 100%;
    transition: background-position 240ms ease;
  }

  .case-card:hover {
    transform: translateY(-5px);
    border-color: rgba(21, 23, 20, 0.24);
    box-shadow: 0 28px 74px rgba(21, 23, 20, 0.14);
  }

  .case-card:hover::before {
    background-position: 100% 0;
  }

  .case-top {
    border-bottom: 1px solid var(--line);
    padding: 22px 22px 18px;
  }

  .case-label {
    display: inline-flex;
    margin-bottom: 15px;
    border: 1px solid rgba(156, 77, 63, 0.22);
    border-radius: 999px;
    padding: 6px 9px;
    color: var(--brick);
    background: rgba(156, 77, 63, 0.06);
    font-size: 11px;
    font-weight: 840;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .case-card h3 {
    margin-bottom: 0;
    font-size: 25px;
    line-height: 1.1;
    letter-spacing: 0;
  }

  .case-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 22px;
  }

  .case-body p {
    color: #394238;
    font-size: 15px;
  }

  .stat-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 10px 0 20px;
  }

  .stat-pill {
    display: grid;
    min-height: 58px;
    place-items: center;
    border: 1px solid rgba(48, 95, 131, 0.22);
    border-radius: 6px;
    padding: 7px;
    color: var(--blue);
    background: rgba(48, 95, 131, 0.055);
    font-size: 12px;
    font-weight: 820;
    line-height: 1.2;
    text-align: center;
  }

  .case-details {
    display: grid;
    gap: 10px;
    margin: auto 0 0;
    padding: 0;
    list-style: none;
  }

  .case-details li {
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: 9px;
    color: #4c5549;
    font-size: 14px;
  }

  .case-details li::before {
    content: "";
    width: 8px;
    height: 8px;
    margin-top: 7px;
    border-radius: 2px;
    background: var(--sage);
  }

  .capability-band {
    background:
      linear-gradient(180deg, rgba(21, 23, 20, 0.03), rgba(21, 23, 20, 0.07)),
      rgba(255, 250, 240, 0.42);
  }

  .capability-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1px;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--line);
  }

  .capability {
    min-height: 285px;
    padding: 24px;
    background: rgba(255, 250, 240, 0.9);
    transition:
      background 160ms ease,
      transform 160ms ease;
  }

  .capability::before {
    content: "";
    display: block;
    width: 42px;
    height: 6px;
    margin-bottom: 22px;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--champagne), var(--teal));
    transition: width 180ms ease;
  }

  .capability:hover {
    transform: translateY(-2px);
    background: var(--paper-strong);
  }

  .capability:hover::before {
    width: 62px;
  }

  .capability h3 {
    margin-bottom: 15px;
    font-size: 23px;
    line-height: 1.12;
    letter-spacing: 0;
  }

  .capability p {
    margin-bottom: 0;
    color: #596255;
  }

  .process {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    background: var(--paper-strong);
  }

  .step {
    min-height: 282px;
    padding: 24px;
    border-right: 1px solid var(--line);
    transition:
      background 160ms ease,
      color 160ms ease;
  }

  .step:last-child {
    border-right: 0;
  }

  .step:hover {
    background: rgba(213, 177, 108, 0.12);
  }

  .step strong {
    display: inline-flex;
    margin-bottom: 48px;
    color: var(--teal);
    font-size: 12px;
    font-weight: 840;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .step h3 {
    margin-bottom: 12px;
    font-size: 23px;
    letter-spacing: 0;
  }

  .step p {
    margin-bottom: 0;
    color: var(--muted);
    font-size: 15px;
  }

  .closing {
    padding: 20px 0 86px;
  }

  .closing-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 28px;
    align-items: center;
    overflow: hidden;
    border-radius: 8px;
    padding: 34px;
    background:
      linear-gradient(90deg, rgba(213, 177, 108, 0.16) 1px, transparent 1px),
      linear-gradient(180deg, rgba(213, 177, 108, 0.12) 1px, transparent 1px),
      #151714;
    background-size: 60px 60px, 60px 60px, auto;
    color: var(--white);
    box-shadow: var(--shadow-soft);
  }

  .closing-panel h2 {
    margin-bottom: 10px;
    font-size: 42px;
    line-height: 1.05;
    letter-spacing: 0;
  }

  .closing-panel p {
    max-width: 790px;
    margin-bottom: 0;
    color: rgba(255, 254, 248, 0.7);
  }

  .footer {
    border-top: 1px solid var(--line);
    padding: 24px 0 34px;
    color: var(--muted);
    font-size: 13px;
  }

  @keyframes loadingCurtain {
    0% {
      opacity: 1;
      background-position: -120% 0, 0 0;
    }

    56% {
      opacity: 1;
      background-position: 120% 0, 0 0;
    }

    99% {
      opacity: 0;
      visibility: visible;
    }

    100% {
      opacity: 0;
      visibility: hidden;
    }
  }

  @keyframes riseIn {
    from {
      opacity: 0;
      transform: translateY(18px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes signalPulse {
    0%,
    100% {
      border-color: rgba(127, 156, 122, 0.32);
    }

    50% {
      border-color: rgba(185, 213, 173, 0.78);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 1ms !important;
    }
  }

  @media (max-width: 1080px) {
    .hero {
      min-height: auto;
      padding: 74px 0 84px;
    }

    .hero-grid,
    .section-head,
    .brief,
    .closing-panel {
      grid-template-columns: 1fr;
    }

    .audit-visual {
      max-width: 760px;
    }

    .case-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .capability-grid,
    .process {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .step:nth-child(2n),
    .capability:nth-child(2n) {
      border-right: 0;
    }
  }

  @media (max-width: 720px) {
    .shell {
      width: min(100% - 32px, 1180px);
    }

    .topbar-inner {
      min-height: 64px;
    }

    .brand {
      font-size: 14px;
    }

    .brand-mark {
      width: 34px;
      height: 34px;
    }

    .nav {
      display: none;
    }

    .hero {
      padding: 44px 0 56px;
    }

    .hero-grid {
      gap: 30px;
    }

    h1 {
      font-size: 38px;
      line-height: 1.02;
    }

    .lead {
      font-size: 16px;
    }

    .hero-actions {
      align-items: stretch;
      margin-bottom: 28px;
    }

    .button {
      width: 100%;
    }

    .visual-body,
    .visual-footer,
    .case-grid,
    .capability-grid,
    .process,
    .stat-row {
      grid-template-columns: 1fr;
    }

    .hero-proof,
    .map-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .fact {
      min-height: 98px;
      padding: 14px;
      border-right: 1px solid rgba(255, 254, 248, 0.13);
      border-bottom: 1px solid rgba(255, 254, 248, 0.13);
    }

    .fact:nth-child(2n) {
      border-right: 0;
    }

    .fact:last-child {
      grid-column: 1 / -1;
      border-bottom: 0;
    }

    .fact strong {
      font-size: 24px;
    }

    .fact span {
      font-size: 12px;
    }

    .visual-head {
      align-items: flex-start;
      flex-direction: column;
      min-height: auto;
      padding: 14px;
    }

    .system-board {
      min-height: auto;
      padding: 14px;
    }

    .system-node {
      min-height: 72px;
      padding: 11px;
    }

    .system-node:nth-child(n + 5) {
      display: none;
    }

    .risk-rail {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .risk-item,
    .visual-note {
      min-height: auto;
      padding: 12px;
    }

    .risk-item b {
      font-size: 18px;
    }

    .risk-item span {
      display: none;
    }

    .visual-footer {
      display: none;
    }

    .intro-band {
      margin-top: -24px;
      padding-bottom: 54px;
    }

    .brief-panel,
    .case-top,
    .case-body,
    .capability,
    .step,
    .closing-panel {
      padding: 22px;
    }

    section {
      padding: 56px 0;
    }

    .section-head {
      gap: 16px;
      margin-bottom: 24px;
    }

    .section-head h2,
    .brief-panel h2,
    .closing-panel h2 {
      font-size: 32px;
      line-height: 1.08;
    }

    .case-card,
    .capability,
    .step {
      min-height: auto;
    }

    .step {
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }

    .step:last-child {
      border-bottom: 0;
    }

    .step strong {
      margin-bottom: 22px;
    }
  }

  @media (max-width: 420px) {
    .shell {
      width: min(100% - 28px, 1180px);
    }

    h1 {
      font-size: 36px;
    }

    .eyebrow {
      align-items: flex-start;
      font-size: 11px;
    }

    .case-card h3 {
      font-size: 22px;
    }
  }
`

function renderCaseCard(item: CaseStudy, index: number) {
  return (
    <article class="case-card">
      <div class="case-top">
        <span class="case-label">
          {String(index + 1).padStart(2, '0')} · {item.label}
        </span>
        <h3>{item.title}</h3>
      </div>
      <div class="case-body">
        <p>{item.summary}</p>
        <div class="stat-row">
          {item.stats.map((stat) => (
            <span class="stat-pill">{stat}</span>
          ))}
        </div>
        <ul class="case-details">
          {item.details.map((detail) => (
            <li>{detail}</li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function renderCapability(item: Capability) {
  return (
    <article class="capability">
      <h3>{item.title}</h3>
      <p>{item.text}</p>
    </article>
  )
}

function renderProcessStep(item: ProcessStep) {
  return (
    <article class="step">
      <strong>{item.code}</strong>
      <h3>{item.title}</h3>
      <p>{item.text}</p>
    </article>
  )
}

export const indexPageRoute = app.html('/', async (_ctx, _req) => {
  return (
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style>{PAGE_CSS}</style>
      </head>
      <body>
        <header class="topbar">
          <div class="shell topbar-inner">
            <div class="brand">
              <span class="brand-mark">AG</span>
              <span>Андрей Германович</span>
            </div>
            <nav class="nav" aria-label="Главная навигация">
              <a href="#brief">Бриф</a>
              <a href="#cases">Кейсы</a>
              <a href="#stack">Стек</a>
              <a href="#format">Формат</a>
            </nav>
          </div>
        </header>

        <main>
          <section class="hero">
            <div class="shell hero-grid">
              <div>
                <p class="eyebrow">Tech Lead / EdTech / Automation</p>
                <h1>Техническая инфраструктура онлайн-школы в рабочем порядке</h1>
                <p class="lead">
                  Разбираю GetCourse, Chatium, CRM, платежи, ассистентов и внутренние платформы как
                  единую систему. Затем довожу контур до понятной ежедневной эксплуатации.
                </p>
                <div class="hero-actions">
                  <a class="button" href="#cases">
                    Смотреть кейсы
                  </a>
                  <a class="button secondary" href="#format">
                    Обсудить формат
                  </a>
                </div>
                <div class="hero-proof" aria-label="Ключевые факты">
                  <div class="fact">
                    <strong>15+</strong>
                    <span>статус pro в GetCourse-среде и проекты вокруг нее</span>
                  </div>
                  <div class="fact">
                    <strong>20 мин</strong>
                    <span>чтобы собрать витрину кейсов, если есть нормальные заметки</span>
                  </div>
                  <div class="fact">
                    <strong>0</strong>
                    <span>внедрений автоматизации с потерянным владельцем процесса</span>
                  </div>
                </div>
              </div>

              <aside class="audit-visual" aria-label="Карта аудита рабочих систем">
                <div class="visual-head">
                  <div class="visual-title">
                    <strong>Executive systems map</strong>
                    <span>live audit surface · Chatium / GC / automation</span>
                  </div>
                  <span class="signal">ready for call</span>
                </div>
                <div class="visual-body">
                  <div class="system-board">
                    <div class="panel-kicker">
                      <span>Operational contour</span>
                      <span>8 nodes</span>
                    </div>
                    <div class="map-grid">
                      {SYSTEMS.map(([system, label]) => (
                        <div class="system-node">
                          <strong>{system}</strong>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div class="risk-rail">
                    <div class="risk-item">
                      <small>Risk</small>
                      <b>API drift</b>
                      <span>gateway absorbs changes</span>
                    </div>
                    <div class="risk-item">
                      <small>Signal</small>
                      <b>Owner</b>
                      <span>decision path is explicit</span>
                    </div>
                    <div class="risk-item">
                      <small>Move</small>
                      <b>Prototype</b>
                      <span>fast, logged, reversible</span>
                    </div>
                  </div>
                </div>
                <div class="visual-footer">
                  <div class="visual-note">
                    <small>current bottleneck</small>
                    <b>ТЗ есть, но оно живет в чате за апрель</b>
                  </div>
                  <div class="visual-note">
                    <small>recommended move</small>
                    <b>Аудит, карта рисков, быстрый прототип, потом штатная рутина</b>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section id="brief" class="intro-band">
            <div class="shell brief">
              <div class="brief-panel dark">
                <p class="eyebrow">Brief decoded</p>
                <h2>Технический контур для роста школы</h2>
                <p>
                  Вводная понятна: своя платформа в разработке, GetCourse и CRM в боевом контуре,
                  автоматизация уже используется отделами, собственник принимает архитектурные
                  решения. Задача технического лидера: собрать форму, ритм и ответственность.
                </p>
              </div>
              <div class="brief-panel">
                <ul class="brief-list">
                  <li>Сначала карта систем, точек отказа, владельцев и договоренностей.</li>
                  <li>
                    Потом быстрые изменения там, где они дают эффект и снижают операционный риск.
                  </li>
                  <li>
                    Автоматизация внедряется как часть процесса: state, tools, escalation, logs,
                    acceptance.
                  </li>
                  <li>Команда техспецов получает понятные границы и критерии готовности.</li>
                  <li>Собственник получает решения с последствиями, бюджетом и сроком жизни.</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="cases">
            <div class="shell">
              <div class="section-head">
                <h2>Кейсы из технического контура</h2>
                <p>
                  Несколько типовых задач из EdTech-контура: платежи, связка платформ, аналитика,
                  запись клиентов, база знаний и контроль доступов.
                </p>
              </div>
              <div class="case-grid">{CASES.map(renderCaseCard)}</div>
            </div>
          </section>

          <section id="stack" class="capability-band">
            <div class="shell">
              <div class="section-head">
                <h2>Что именно закрываю</h2>
                <p>
                  Роль на стыке архитектуры, продуктовой логики и прикладной разработки. Когда
                  "нужно просто автоматизировать" уже означает четыре API, один webhook и человека,
                  который ушел в отпуск.
                </p>
              </div>
              <div class="capability-grid">{CAPABILITIES.map(renderCapability)}</div>
            </div>
          </section>

          <section id="format">
            <div class="shell">
              <div class="section-head">
                <h2>Формат входа в проект</h2>
                <p>
                  Сначала делаю систему видимой, затем выбираю ручные правки, автоматизацию и зоны
                  для следующего этапа.
                </p>
              </div>
              <div class="process">{PROCESS_STEPS.map(renderProcessStep)}</div>
            </div>
          </section>

          <section class="closing">
            <div class="shell closing-panel">
              <div>
                <h2>Кейсы помогают быстрее перейти к предметному разговору.</h2>
                <p>
                  Для точной вилки нужны контур платформы, команда, зона ответственности, критичные
                  дедлайны и то, кто на самом деле говорит "да" архитектурным решениям.
                </p>
              </div>
              <a class="button secondary" href="https://t.me/andrey_khudoley">
                Написать в Telegram
              </a>
            </div>
          </section>
        </main>

        <footer class="footer">
          <div class="shell">
            © 2026 Андрей Худолей. Техническое лидерство для EdTech, платформ, воронок и
            автоматизации.
          </div>
        </footer>
      </body>
    </html>
  )
})

export default indexPageRoute
