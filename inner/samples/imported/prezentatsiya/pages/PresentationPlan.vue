<template>
  <div class="plan-root">
    <!-- Floating nav -->
    <nav class="side-nav" :class="{ open: navOpen }">
      <button class="nav-toggle" @click="navOpen = !navOpen">
        <i class="fas" :class="navOpen ? 'fa-times' : 'fa-bars'"></i>
      </button>
      <div class="nav-links">
        <a
          v-for="s in sections"
          :key="s.id"
          :href="'#' + s.id"
          @click="navOpen = false"
          :class="{ active: activeSection === s.id }"
        >
          <span class="nav-num">{{ s.num }}</span>
          <span class="nav-label">{{ s.label }}</span>
        </a>
      </div>
    </nav>

    <!-- Header -->
    <header class="hero" id="top">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-badge">ПЛАН ПРЕЗЕНТАЦИИ</div>
        <h1>
          Chatium<br /><span class="hero-sub">Операционная система<br />для бизнеса</span>
        </h1>
        <div class="hero-meta">
          <div class="meta-item"><i class="fas fa-video"></i> Вебинар</div>
          <div class="meta-item"><i class="fas fa-users"></i> Предприниматели, маркетологи</div>
          <div class="meta-item"><i class="fas fa-clock"></i> ~60 мин</div>
        </div>
        <div class="hero-tagline">
          Два продукта — <strong>Ботан</strong> + <strong>Леночка</strong> — заменяют десятки
          сотрудников и сервисов
        </div>
      </div>
    </header>

    <!-- Timeline overview -->
    <section class="timeline-section" id="overview">
      <div class="container">
        <h2 class="section-title"><span class="title-accent">⏱</span> Структура</h2>
        <div class="timeline">
          <div
            v-for="(item, i) in timeline"
            :key="i"
            class="timeline-item"
            :style="{ '--delay': i * 0.08 + 's' }"
          >
            <div class="tl-num">{{ item.num }}</div>
            <div class="tl-body">
              <div class="tl-title">{{ item.title }}</div>
              <div class="tl-time">{{ item.time }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PART 1 -->
    <section class="content-section dark" id="part1">
      <div class="container">
        <div class="part-header">
          <span class="part-num">01</span>
          <h2>Вступление</h2>
          <span class="part-time">~5 мин</span>
        </div>

        <div class="quote-block accent">
          <p><strong>Chatium — это операционная система для бизнеса.</strong></p>
          <p>
            Не конструктор сайтов. Не CRM. Не ИИ-чат.<br />
            Это полноценная среда, в которой можно создать ЛЮБОЙ цифровой сервис, и этими сервисами
            будут управлять ИИ-агенты.
          </p>
        </div>

        <div class="recommendation">
          <div class="rec-badge"><i class="fas fa-lightbulb"></i> Рекомендация по подаче</div>
          <p>
            Начать с боли:
            <em
              >«Сколько сервисов вы используете в своём бизнесе? CRM, рассылки, конструктор сайтов,
              платежи, боты, аналитика... 5? 10? 15 разных сервисов?</em
            >
          </p>
          <p>
            <em
              >А теперь представьте, что всё это — одна платформа. И вместо 15 подписок — одна.
              Вместо 15 интеграций, которые ломаются — единая среда. Вместо команды из 10
              специалистов — два ИИ-продукта, которые делают работу за них.»</em
            >
          </p>
        </div>
      </div>
    </section>

    <!-- PART 2 -->
    <section class="content-section" id="part2">
      <div class="container">
        <div class="part-header">
          <span class="part-num">02</span>
          <h2>Инфраструктура</h2>
          <span class="part-time">~10–15 мин</span>
        </div>

        <div class="quote-block">
          <p>
            <strong>Инфраструктура — это то, чего не видно, но без чего ничего не работает.</strong>
          </p>
          <p>
            Это как фундамент здания: его никто не фотографирует, но именно он определяет, какой
            небоскрёб на нём можно построить.
          </p>
        </div>

        <div class="recommendation">
          <div class="rec-badge"><i class="fas fa-lightbulb"></i> Начать с провокации</div>
          <p>
            <em
              >«Почему вы не можете просто взять ChatGPT и заменить им свой бизнес? Потому что у
              ChatGPT нет инфраструктуры. Он не знает ваших клиентов, не может принять оплату, не
              может отправить письмо, не может записать в базу данных. Он — мозг без тела. А Chatium
              — это и мозг, и тело.»</em
            >
          </p>
        </div>

        <!-- 2.1 Modules -->
        <h3 class="sub-title">2.1 Что такое инфраструктура Chatium</h3>
        <p class="desc">16+ модулей, которые покрывают все потребности бизнеса из коробки:</p>

        <div class="modules-grid">
          <div v-for="m in modules" :key="m.name" class="module-card">
            <div class="module-icon"><i :class="m.icon"></i></div>
            <div class="module-name">{{ m.name }}</div>
            <div class="module-desc">{{ m.desc }}</div>
            <div class="module-business">💼 {{ m.business }}</div>
            <div class="module-replaces">
              <i class="fas fa-arrow-right"></i> Заменяет: {{ m.replaces }}
            </div>
          </div>
        </div>

        <div class="recommendation">
          <div class="rec-badge"><i class="fas fa-lightbulb"></i> Рекомендация</div>
          <p>
            Показать схему:
            <em>«Вот столько сервисов нужно бизнесу. А вот это всё — уже внутри Chatium.»</em>
            Эффект «ВАУ».
          </p>
        </div>

        <!-- 2.2 Russia -->
        <h3 class="sub-title">2.2 Почему это подходит для России</h3>

        <div class="cards-row">
          <div class="info-card">
            <h4><i class="fas fa-gavel"></i> Юридическое</h4>
            <ul>
              <li>✅ 152-ФЗ — данные в российских дата-центрах</li>
              <li>✅ 54-ФЗ — авто-чеки при оплате</li>
              <li>✅ Нет риска блокировок</li>
            </ul>
          </div>
          <div class="info-card">
            <h4><i class="fas fa-credit-card"></i> Платежи РФ</h4>
            <ul>
              <li>✅ ЮКасса, CloudPayments</li>
              <li>✅ МИР, Visa РФ, MasterCard РФ</li>
              <li>✅ СБП (Быстрые Платежи)</li>
              <li>✅ Рекуррентные, оплата в 1 клик</li>
            </ul>
          </div>
          <div class="info-card">
            <h4><i class="fas fa-plug"></i> Интеграции РФ</h4>
            <ul>
              <li>✅ GetCourse, AmoCRM, Bitrix24</li>
              <li>✅ VK API, Telegram Bot API</li>
              <li>✅ Российские SMS-шлюзы</li>
              <li>✅ Оплата в рублях</li>
            </ul>
          </div>
        </div>

        <div class="callout">
          <strong>Акцент:</strong> «Для бизнеса в России — это единственный вариант, где ВСЁ
          работает из коробки без костылей.»
        </div>

        <!-- 2.3 Team -->
        <h3 class="sub-title">2.3 Команда</h3>

        <div class="quote-block accent">
          <p>
            <strong>За Chatium стоят 8 лет разработки</strong> и команда, которая создала Геткурс,
            Мегаплан и Финолог.<br />
            Это не стартап-однодневка. Это люди, которые уже построили продукты с миллионами
            пользователей.
          </p>
        </div>

        <p class="desc">
          Упомянутые: <strong>Тимур Каримбаев, Артур, Давид, Александр, Ратмир</strong> — их
          описания и фото из воркспейса /plani-2026.
        </p>

        <div class="recommendation">
          <div class="rec-badge"><i class="fas fa-lightbulb"></i> Подача</div>
          <p>
            <em
              >«Представьте, вы нанимаете команду из 20+ инженеров на 8 лет. Это примерно
              <strong>500 млн рублей</strong> минимум. И вы получаете инфраструктуру, которая УЖЕ
              готова. Вам не нужно её строить — она создана. Вы просто заходите и пользуетесь.»</em
            >
          </p>
        </div>

        <h4 class="sub-title sm">Стоимость создания с нуля</h4>
        <div class="cost-table">
          <div class="cost-row" v-for="c in costs" :key="c.label">
            <span class="cost-label">{{ c.label }}</span>
            <span class="cost-value">{{ c.value }}</span>
          </div>
          <div class="cost-row total">
            <span class="cost-label">ИТОГО</span>
            <span class="cost-value">~500–800 млн ₽ / 5–8 лет</span>
          </div>
        </div>

        <div class="callout highlight">
          «Когда вы подключаетесь к Chatium — вы получаете инфраструктуру стоимостью в
          <strong>полмиллиарда рублей</strong>. За подписку.»
        </div>
      </div>
    </section>

    <!-- PART 3 -->
    <section class="content-section dark" id="part3">
      <div class="container">
        <div class="part-header">
          <span class="part-num">03</span>
          <h2>Ботан <span class="part-sub">Вайбкодинг</span></h2>
          <span class="part-time">~10–15 мин</span>
        </div>

        <div class="quote-block accent">
          <p>
            <strong
              >Вайбкодинг — это создание полноценных цифровых продуктов с помощью ИИ, просто
              описывая словами то, что ты хочешь.</strong
            >
          </p>
          <p>Не нужно быть программистом. Не нужно знать код. Ты говоришь — Ботан делает.</p>
        </div>

        <h3 class="sub-title light">Что такое Ботан</h3>
        <div class="features-list">
          <div class="feature" v-for="f in botanFeatures" :key="f.icon">
            <i :class="f.icon"></i>
            <div>
              <strong>{{ f.title }}</strong>
              <p>{{ f.desc }}</p>
            </div>
          </div>
        </div>

        <h3 class="sub-title light">Почему Ботан ≠ «ChatGPT для кода»</h3>
        <div class="callout light">
          <strong>Ботан живёт ВНУТРИ инфраструктуры Chatium.</strong> Он знает все 16+ модулей, как
          подключить платежи, рассылки, CRM. Он ходит по другим проектам и видит вашу бизнес-логику.
          У него есть доступ к вашим данным.
        </div>

        <h3 class="sub-title light">Что может создать</h3>
        <div class="tags-cloud">
          <span v-for="t in botanCreates" :key="t" class="tag">{{ t }}</span>
        </div>

        <div class="demo-block">
          <div class="demo-badge"><i class="fas fa-tv"></i> МЕСТО ДЛЯ ДЕМОНСТРАЦИИ</div>
          <ol>
            <li>Как выглядит интерфейс вайбкодинга</li>
            <li>Живой пример — Ботан создаёт что-то прямо на вебинаре</li>
            <li>Кейс клиента <strong>EMI Online</strong></li>
          </ol>
        </div>

        <div class="callout light">
          <strong>Акцент:</strong> «Ботан — это не инструмент для программистов. Это инструмент для
          бизнеса. Вы описываете задачу — получаете готовое решение. С базой данных, авторизацией,
          платежами и ИИ-агентами.»
        </div>
      </div>
    </section>

    <!-- PART 4 -->
    <section class="content-section" id="part4">
      <div class="container">
        <div class="part-header">
          <span class="part-num">04</span>
          <h2>Леночка <span class="part-sub">Процессные AI-агенты</span></h2>
          <span class="part-time">~10–15 мин</span>
        </div>

        <div class="quote-block accent">
          <p>
            <strong>Процессный ИИ-агент — это цифровой сотрудник, который работает 24/7.</strong>
          </p>
          <p>
            Он не просто отвечает на вопросы. Он выполняет реальные бизнес-задачи: продаёт,
            консультирует, обрабатывает заявки, ведёт переписку, достигает целей.
          </p>
        </div>

        <h3 class="sub-title">Архитектура агента</h3>
        <div class="arch-flow">
          <div class="arch-step" v-for="(s, i) in archSteps" :key="i">
            <div class="arch-icon"><i :class="s.icon"></i></div>
            <div class="arch-label">{{ s.label }}</div>
            <div class="arch-desc">{{ s.desc }}</div>
          </div>
        </div>

        <h3 class="sub-title">Чат-бот vs Процессный агент</h3>
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>Чат-бот (ChatGPT и аналоги)</th>
                <th>Процессный агент (Леночка)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in agentCompare" :key="r.left">
                <td class="dim">{{ r.left }}</td>
                <td class="bright">{{ r.right }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="sub-title">Что умеет Леночка</h3>
        <div class="cards-row three">
          <div class="info-card" v-for="a in lenAbilities" :key="a.title">
            <h4><i :class="a.icon"></i> {{ a.title }}</h4>
            <p>{{ a.desc }}</p>
          </div>
        </div>

        <h3 class="sub-title">Как создать агента</h3>
        <div class="callout highlight">
          Буквально сказать Ботану:
          <em
            >«Сделай мне агента-продавца для моего магазина электроники. Он должен помогать клиентам
            выбирать товары, оформлять заказы и отвечать на вопросы о доставке.»</em
          >
        </div>

        <h3 class="sub-title">Варианты применения</h3>
        <div class="use-cases-grid">
          <div v-for="u in useCases" :key="u.title" class="use-case">
            <i :class="u.icon"></i>
            <strong>{{ u.title }}</strong>
            <p>{{ u.desc }}</p>
          </div>
        </div>

        <div class="demo-block dark">
          <div class="demo-badge"><i class="fas fa-tv"></i> МЕСТО ДЛЯ ДЕМОНСТРАЦИИ</div>
          <ol>
            <li>Агент на <strong>Авито</strong> — Леночка переписывается с покупателями</li>
            <li>Другие примеры процессных агентов</li>
            <li>Интерфейс настройки агента</li>
          </ol>
        </div>

        <div class="quote-block accent">
          <p>
            «Леночка — это не нейронка. Это <strong>полноценный цифровой сотрудник</strong>, который
            живёт внутри вашей бизнес-инфраструктуры. 24 часа в сутки. Без выходных. Без
            больничных.»
          </p>
        </div>
      </div>
    </section>

    <!-- PART 5 -->
    <section class="content-section dark" id="part5">
      <div class="container">
        <div class="part-header">
          <span class="part-num">05</span>
          <h2>Замена сотрудников</h2>
          <span class="part-time">~5–7 мин</span>
        </div>

        <div class="quote-block accent">
          <p>
            <strong
              >Chatium — это не нейронка. Это инструмент для замены сотрудников и ускорения работы
              компании.</strong
            >
          </p>
        </div>

        <h3 class="sub-title light">Кого заменяет БОТАН</h3>
        <div class="replace-table-wrap">
          <table class="replace-table">
            <thead>
              <tr>
                <th>Роль</th>
                <th>Что делает Ботан</th>
                <th>Экономия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in botanReplaces" :key="r.role">
                <td>
                  <strong>{{ r.role }}</strong>
                </td>
                <td>{{ r.desc }}</td>
                <td class="money">{{ r.save }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>Итого</strong></td>
                <td class="money"><strong>960 тыс – 1.9 млн ₽/мес</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <h3 class="sub-title light">Кого заменяет ЛЕНОЧКА</h3>
        <div class="replace-table-wrap">
          <table class="replace-table">
            <thead>
              <tr>
                <th>Роль</th>
                <th>Что делает Леночка</th>
                <th>Экономия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in lenaReplaces" :key="r.role">
                <td>
                  <strong>{{ r.role }}</strong>
                </td>
                <td>{{ r.desc }}</td>
                <td class="money">{{ r.save }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>Итого (один агент)</strong></td>
                <td class="money"><strong>330–590 тыс ₽/мес</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <h3 class="sub-title light">Зачем это нужно</h3>
        <div class="benefits-row">
          <div v-for="b in benefits" :key="b.title" class="benefit">
            <i :class="b.icon"></i>
            <strong>{{ b.title }}</strong>
            <p>{{ b.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- PART 6 -->
    <section class="content-section" id="part6">
      <div class="container">
        <div class="part-header">
          <span class="part-num">06</span>
          <h2>Сравнение с конкурентами</h2>
          <span class="part-time">~10 мин</span>
        </div>

        <h3 class="sub-title">Метафора 1: Операционная система</h3>
        <div class="quote-block">
          <p>
            <strong>Chatium — это как Windows или macOS.</strong> Внутри живут программы (Ботан,
            Леночка), которые работают ВМЕСТЕ. Они видят файлы друг друга, пользуются одними
            устройствами (модулями), общаются между собой.
          </p>
          <p>
            Cursor, Claude Code, Lovable, n8n — это отдельные программы, скачанные с разных сайтов.
            Они не знают друг о друге. Чтобы заработали вместе — нужно САМОМУ писать тысячи строк
            кода.
          </p>
          <p>
            <em
              >Вы купили принтер, монитор, клавиатуру и мышь — но у вас НЕТ компьютера.
              <strong>Chatium — это компьютер.</strong></em
            >
          </p>
        </div>

        <h3 class="sub-title">Метафора 2: Город</h3>
        <div class="quote-block">
          <p>
            <strong>Chatium — это город.</strong> Дороги (инфраструктура), здания (сервисы), жители
            (агенты), полиция (авторизация), банк (платежи), почта (рассылки).
          </p>
          <p>
            Cursor, Lovable, n8n — это отдельные дома посреди поля. Без дорог. Без электричества.
            Без водопровода.
          </p>
        </div>

        <h3 class="sub-title">Сравнительная таблица</h3>
        <div class="compare-matrix-wrap">
          <table class="compare-matrix">
            <thead>
              <tr>
                <th>Критерий</th>
                <th class="hl">Chatium</th>
                <th>Lovable</th>
                <th>Cursor / Claude</th>
                <th>n8n</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in compMatrix" :key="r.criteria">
                <td>
                  <strong>{{ r.criteria }}</strong>
                </td>
                <td class="hl">{{ r.chatium }}</td>
                <td>{{ r.lovable }}</td>
                <td>{{ r.cursor }}</td>
                <td>{{ r.n8n }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="sub-title">Детальный разбор</h3>
        <div class="versus-cards">
          <div class="versus-card" v-for="v in versus" :key="v.name">
            <h4>Chatium vs {{ v.name }}</h4>
            <p class="vs-sum">{{ v.summary }}</p>
            <ul>
              <li v-for="p in v.points" :key="p">{{ p }}</li>
            </ul>
          </div>
        </div>

        <div class="callout highlight">
          <strong>«Вам не нужно 5 разных сервисов. Вам нужен один Chatium.»</strong>
          <p class="mt">
            Без Chatium: Cursor + VPS + Supabase + Stripe + n8n + SendGrid + AmoCRM + Telegram API =
            <strong>8 сервисов, $200–500/мес, месяцы на интеграцию</strong>
          </p>
          <p>С Chatium: <strong>1 платформа, всё из коробки, рубли</strong></p>
        </div>

        <h3 class="sub-title">Почему код из Cursor будет работать криво</h3>
        <div class="quote-block">
          <p>
            Код, написанный вне Chatium, не знает как работает файловый роутинг, Heap Tables,
            @sender, @pay, @crm, авторизация, WebSocket, Jobs, Storage.
          </p>
          <p><strong>Ботан ГОВОРИТ на языке Chatium. Cursor — нет.</strong></p>
        </div>
      </div>
    </section>

    <!-- PART 7 -->
    <section class="content-section dark" id="part7">
      <div class="container">
        <div class="part-header">
          <span class="part-num">07</span>
          <h2>Итоги</h2>
          <span class="part-time">~5 мин</span>
        </div>

        <div class="final-cards">
          <div class="final-card">
            <div class="fc-num">1</div>
            <h3>Инфраструктура</h3>
            <p>
              8 лет разработки. 16+ модулей. Инфраструктура стоимостью в полмиллиарда рублей. Вы
              получаете её готовой.
            </p>
          </div>
          <div class="final-card">
            <div class="fc-num">2</div>
            <h3>Два продукта</h3>
            <p>
              <strong>Ботан</strong> — создаёт любой цифровой продукт по описанию.<br /><strong
                >Леночка</strong
              >
              — работает с клиентами 24/7.
            </p>
          </div>
          <div class="final-card">
            <div class="fc-num">3</div>
            <h3>Уникальность</h3>
            <p>
              Такого нет нигде в мире. Инфраструктура + вайбкодинг + процессные ИИ-агенты в единой
              среде. Для бизнеса в РФ — единственное решение.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- QUESTIONS -->
    <section class="content-section questions-section" id="questions">
      <div class="container">
        <h2 class="section-title"><span class="title-accent">❓</span> Вопросы для обсуждения</h2>
        <div class="questions-list">
          <div v-for="(q, i) in questions" :key="i" class="question-item">
            <span class="q-num">{{ i + 1 }}</span>
            <p>{{ q }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- RECOMMENDATIONS -->
    <section class="content-section dark" id="recs">
      <div class="container">
        <h2 class="section-title light"><span class="title-accent">📌</span> Мои рекомендации</h2>
        <div class="recs-grid">
          <div v-for="r in recs" :key="r.title" class="rec-card">
            <i :class="r.icon"></i>
            <h4>{{ r.title }}</h4>
            <p>{{ r.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <footer class="plan-footer">
      <p>План презентации Chatium · Версия для обсуждения</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const navOpen = ref(false)
const activeSection = ref('top')

const sections = [
  { id: 'overview', num: '⏱', label: 'Структура' },
  { id: 'part1', num: '01', label: 'Вступление' },
  { id: 'part2', num: '02', label: 'Инфраструктура' },
  { id: 'part3', num: '03', label: 'Ботан' },
  { id: 'part4', num: '04', label: 'Леночка' },
  { id: 'part5', num: '05', label: 'Сотрудники' },
  { id: 'part6', num: '06', label: 'Сравнение' },
  { id: 'part7', num: '07', label: 'Итоги' },
  { id: 'questions', num: '❓', label: 'Вопросы' },
  { id: 'recs', num: '📌', label: 'Рекомендации' }
]

const timeline = [
  { num: '01', title: 'Вступление — Что такое Chatium', time: '5 мин' },
  { num: '02', title: 'Инфраструктура — Фундамент всего', time: '10–15 мин' },
  { num: '03', title: 'Ботан — Вайбкодинг', time: '10–15 мин' },
  { num: '04', title: 'Леночка — Процессные AI-агенты', time: '10–15 мин' },
  { num: '05', title: 'Замена сотрудников', time: '5–7 мин' },
  { num: '06', title: 'Сравнение с конкурентами', time: '10 мин' },
  { num: '07', title: 'Итоги и вопросы', time: '5 мин' }
]

const modules = [
  {
    name: 'Heap Tables',
    icon: 'fas fa-database',
    desc: 'База данных с ORM, полнотекстовый поиск по смыслам (embeddings), связи между таблицами',
    business:
      'Клиенты, заказы, товары, курсы — всё хранится безопасно и структурированно. Не нужны внешние БД.',
    replaces: 'Нужны программисты для настройки БД'
  },
  {
    name: '@sender',
    icon: 'fas fa-paper-plane',
    desc: '10+ каналов: Email, Telegram, VK, WhatsApp (Wazzup24), Viber, SMS, Instagram, Facebook, Авито, Мессенджер MAX',
    business:
      'Рассылки, чат-боты и AI-агенты работают во всех каналах. Персональные сообщения каждому клиенту.',
    replaces: 'Множество сервисов рассылок и чат-ботов'
  },
  {
    name: '@pay',
    icon: 'fas fa-ruble-sign',
    desc: 'CloudPayments, ЮКасса, Invoice, МИР, Visa/MC РФ, СБП, рекурренты, автосписания, оплата в 1 клик, автоматические чеки 54-ФЗ',
    business:
      'Принимайте оплату картами, через СБП, формируйте счета. Можно подключить свой платежный провайдер. Чеки отправляются автоматически.',
    replaces: 'Интеграция платежей и биллинг'
  },
  {
    name: '@crm',
    icon: 'fas fa-address-book',
    desc: 'Единая карточка клиента: контакты (телефон, email, Telegram), история действий, события, теги, UTM-метки, custom поля',
    business:
      'Вся информация о каждом клиенте в одном месте. Откуда пришёл, что купил, с кем общался — всё фиксируется.',
    replaces: 'Полноценная CRM-система'
  },
  {
    name: '@automations',
    icon: 'fas fa-robot',
    desc: 'Визуальный конструктор автоматизаций: событие → проверка условий → действие → задержка → следующее действие',
    business:
      'Автоматические воронки, авторассылки, автоматизация процессов без программиста. Как в n8n, но встроенное.',
    replaces: 'Сложные автоматизации и интеграции'
  },
  {
    name: '@ai-agents',
    icon: 'fas fa-brain',
    desc: 'Процессные ИИ-агенты: инструкции, база знаний, инструменты (БД, API, CRM), цепочки диалогов, многоканальность',
    business:
      'Леночка — ваш цифровой сотрудник. Продаёт, консультирует, обрабатывает заявки 24/7 в любом канале.',
    replaces: 'Такого нет нигде в мире'
  },
  {
    name: '@start',
    icon: 'fas fa-wand-magic-sparkles',
    desc: 'ИИ-генерация: GPT-4.1, Claude Sonnet 4, тексты, изображения (DALL-E, Midjourney), распознавание речи',
    business:
      'Создавайте контент, генерируйте тексты и картинки, автоматизируйте коммуникации силами ИИ.',
    replaces: 'Подключение OpenAI API и разработка'
  },
  {
    name: '@app/auth',
    icon: 'fas fa-shield-halved',
    desc: 'Авторизация через Email, Phone, Telegram, Username/Password. Роли: Admin, Staff, User. Гибкие права доступа.',
    business:
      'Личный кабинет для клиентов, разграничение прав для сотрудников. Безопасно и просто.',
    replaces: 'Система авторизации и управления доступом'
  },
  {
    name: '@app/storage',
    icon: 'fas fa-cloud-arrow-up',
    desc: 'Файловое хранилище с CDN: загрузка файлов, автоматические thumbnails для изображений, видео, аудио',
    business:
      'Загружайте фото, видео, документы. Система автоматически оптимизирует и быстро доставляет файлы пользователям.',
    replaces: 'Облачное хранилище и CDN'
  },
  {
    name: '@app/socket',
    icon: 'fas fa-bolt',
    desc: 'WebSocket для real-time: мгновенные обновления данных без перезагрузки страницы',
    business: 'Чаты, уведомления, live-обновления заказов — всё мгновенно, без задержек.',
    replaces: 'WebSocket-сервер и его настройка'
  },
  {
    name: '@app/jobs',
    icon: 'fas fa-clock',
    desc: 'Отложенные задачи: запуск через N минут, в конкретное время, по расписанию (cron)',
    business:
      'Автоматические напоминания, отложенные рассылки, периодические отчёты — всё выполняется по расписанию.',
    replaces: 'Планировщик задач (cron) и очереди'
  },
  {
    name: '@app/request',
    icon: 'fas fa-globe',
    desc: 'HTTP-клиент для запросов к внешним API: GET, POST, PUT, DELETE с автоматической обработкой ошибок',
    business:
      'Интегрируйтесь с любыми внешними сервисами: оплата, доставка, аналитика, CRM — всё через API.',
    replaces: 'Библиотеки для HTTP-запросов'
  },
  {
    name: '@kinescope',
    icon: 'fas fa-video',
    desc: 'Полная платформа для видео: хостинг, live-трансляции, вебинары, комнаты для встреч, аналитика просмотров, защита контента',
    business:
      'Проводите вебинары, загружайте обучающие видео, стримьте в прямом эфире. Всё с аналитикой: кто, сколько и что смотрел.',
    replaces: 'Видеохостинг + платформа вебинаров'
  },
  {
    name: '@traffic',
    icon: 'fas fa-chart-line',
    desc: 'Аналитика на базе Clickhouse: события, воронки, когорты, поведение пользователей, источники трафика',
    business:
      'Полная картина: откуда пришли клиенты, что делали, где ушли. Стройте воронки, анализируйте конверсии.',
    replaces: 'Веб-аналитика и сбор событий'
  },
  {
    name: '@html',
    icon: 'fas fa-code',
    desc: 'Server-Side Rendering (SSR): мгновенная загрузка страниц, SEO-оптимизация, индексация поисковиками',
    business:
      'Ваши страницы быстро загружаются и отлично индексируются Google/Yandex. Больше трафика из поиска.',
    replaces: 'SSR-фреймворки (Next.js)'
  },
  {
    name: '@app/i18n',
    icon: 'fas fa-language',
    desc: 'Мультиязычность: перевод интерфейса, плюрализация, форматирование дат и валют под разные локали',
    business:
      'Делайте продукты для разных стран: русский, английский, любые языки. Интерфейс адаптируется автоматически.',
    replaces: 'Библиотеки локализации'
  }
]

const costs = [
  { label: 'Команда разработки (20 чел × 8 лет)', value: '300–500 млн ₽' },
  { label: 'Серверная инфраструктура', value: '50–100 млн ₽' },
  { label: 'Тестирование и QA', value: '30–50 млн ₽' },
  { label: 'Документация и обучение', value: '10–20 млн ₽' },
  { label: 'Поддержка и сопровождение', value: '50–80 млн ₽' }
]

const botanFeatures = [
  { icon: 'fas fa-brain', title: 'Пишет код', desc: 'Vue.js 3.5, TypeScript, API, базы данных' },
  {
    icon: 'fas fa-palette',
    title: 'Делает дизайн',
    desc: 'Адаптивные интерфейсы, Tailwind CSS, иконки, шрифты'
  },
  { icon: 'fas fa-pen-fancy', title: 'Пишет тексты', desc: 'Контент, описания, формулировки' },
  {
    icon: 'fas fa-server',
    title: 'Создаёт инфраструктуру',
    desc: 'Таблицы, роуты, авторизацию, платежи'
  },
  { icon: 'fas fa-robot', title: 'Создаёт ИИ-агентов', desc: 'Леночку для вашего бизнеса' },
  { icon: 'fas fa-list-check', title: 'Раздаёт задачи', desc: 'Управляет подчинёнными агентами' }
]

const botanCreates = [
  'Лендинги и сайты',
  'Веб-приложения',
  'Мобильные приложения',
  'Интернет-магазины',
  'Онлайн-школы',
  'Системы бронирования',
  'Чат-ботов',
  'Корпоративные порталы',
  'Процессных ИИ-агентов'
]

const archSteps = [
  { icon: 'fas fa-scroll', label: 'Инструкции', desc: 'Промпт на естественном языке' },
  { icon: 'fas fa-book', label: 'База знаний', desc: 'Документы, FAQ, каталоги' },
  { icon: 'fas fa-wrench', label: 'Инструменты', desc: 'Доступ к БД, API, CRM, рассылкам' },
  { icon: 'fas fa-comments', label: 'Цепочки', desc: 'Контекст каждого клиента' },
  { icon: 'fas fa-share-nodes', label: 'Каналы', desc: 'Telegram, WhatsApp, VK, email, Авито' }
]

const agentCompare = [
  { left: 'Отвечает на вопросы', right: 'Достигает целей' },
  { left: 'Не знает ваших клиентов', right: 'Видит историю, заказы, оплаты' },
  { left: 'Не может ничего сделать', right: 'Создаёт заказы, отправляет сообщения, обновляет CRM' },
  { left: 'Забывает контекст', right: 'Помнит всю историю переписки' },
  { left: 'Одинаковый для всех', right: 'Персонализированный под каждого' },
  { left: 'Работает в одном канале', right: 'Работает в 8+ каналах' },
  { left: 'Требует программиста', right: 'Создаётся Ботаном по описанию' }
]

const lenAbilities = [
  {
    icon: 'fas fa-bullseye',
    title: 'Достижение целей',
    desc: 'Понимает цель, строит стратегию общения, следит за прогрессом'
  },
  {
    icon: 'fas fa-toolbox',
    title: 'Инструменты',
    desc: 'Поиск по каталогу, создание заказов, проверка оплаты, CRM, рассылки'
  },
  {
    icon: 'fas fa-book-open',
    title: 'База знаний',
    desc: 'Документы, FAQ, каталоги — агент изучает и использует в ответах'
  },
  {
    icon: 'fas fa-file-lines',
    title: 'Инструкции',
    desc: 'Пишете на обычном языке — агент следует как живой сотрудник'
  },
  {
    icon: 'fas fa-link',
    title: 'Цепочки диалогов',
    desc: 'Каждый клиент — отдельная цепочка с полной историей и профилем'
  },
  {
    icon: 'fas fa-envelope-open-text',
    title: 'Персональные рассылки',
    desc: 'Индивидуальные сообщения каждому клиенту'
  }
]

const useCases = [
  {
    icon: 'fas fa-store',
    title: 'Продажи',
    desc: 'Консультирует, рекомендует, оформляет заказы, догоняет клиентов'
  },
  {
    icon: 'fas fa-headset',
    title: 'Клиентский сервис',
    desc: 'FAQ 24/7, статус заказа, решение проблем, эскалация'
  },
  {
    icon: 'fas fa-clipboard-list',
    title: 'Обработка заявок',
    desc: 'Приём из всех каналов, квалификация, CRM, уведомления'
  },
  {
    icon: 'fas fa-graduation-cap',
    title: 'Онлайн-образование',
    desc: 'Помощь ученикам, прогресс, дедлайны, персонализация'
  },
  {
    icon: 'fas fa-calendar-check',
    title: 'Бронирование',
    desc: 'Запись на услуги, расписание, напоминания, отмены'
  },
  {
    icon: 'fas fa-chart-pie',
    title: 'Аналитика',
    desc: 'Сбор данных, отчёты, ответы на вопросы о метриках'
  },
  {
    icon: 'fas fa-shopping-bag',
    title: 'Авито и маркетплейсы',
    desc: 'Переписка с покупателями, ответы о товарах, сделки'
  }
]

const botanReplaces = [
  { role: 'Веб-разработчик', desc: 'Сайты, лендинги, веб-приложения', save: '150–300 тыс ₽/мес' },
  {
    role: 'Мобильный разработчик',
    desc: 'iOS + Android из одного кода',
    save: '200–400 тыс ₽/мес'
  },
  { role: 'Бэкенд-разработчик', desc: 'API, БД, авторизация', save: '180–350 тыс ₽/мес' },
  { role: 'Верстальщик / Дизайнер', desc: 'Дизайн, адаптивная вёрстка', save: '80–150 тыс ₽/мес' },
  { role: 'Копирайтер', desc: 'Тексты для сайтов и страниц', save: '50–100 тыс ₽/мес' },
  { role: 'DevOps-инженер', desc: 'Серверы, деплой уже встроены', save: '200–400 тыс ₽/мес' },
  { role: 'Сисадмин', desc: 'Инфраструктура управляется платформой', save: '100–200 тыс ₽/мес' }
]

const lenaReplaces = [
  {
    role: 'Менеджер по продажам',
    desc: 'Консультирует, продаёт, оформляет в чате',
    save: '60–120 тыс ₽/мес'
  },
  { role: 'Оператор поддержки', desc: 'Отвечает 24/7', save: '50–80 тыс ₽/мес' },
  { role: 'SMM-менеджер', desc: 'Соцсети, общение с подписчиками', save: '40–80 тыс ₽/мес' },
  { role: 'Администратор записи', desc: 'Запись клиентов, расписание', save: '40–60 тыс ₽/мес' },
  {
    role: 'Обработчик заявок',
    desc: 'Приём, квалификация, распределение',
    save: '40–70 тыс ₽/мес'
  },
  { role: 'Email-маркетолог', desc: 'Персональные рассылки, follow-up', save: '50–100 тыс ₽/мес' },
  { role: 'Ассистент руководителя', desc: 'Сводки, отчёты, напоминания', save: '50–80 тыс ₽/мес' }
]

const benefits = [
  {
    icon: 'fas fa-arrow-up-right-dots',
    title: 'Масштабирование без найма',
    desc: 'Бизнес растёт — команда не раздувается'
  },
  { icon: 'fas fa-infinity', title: 'Работа 24/7', desc: 'Не спят, не болеют, не увольняются' },
  {
    icon: 'fas fa-gauge-high',
    title: 'Скорость',
    desc: 'Что сотрудник делает за день — за секунды'
  },
  {
    icon: 'fas fa-check-double',
    title: 'Качество',
    desc: 'Нет ошибок, забывчивости, плохого настроения'
  },
  { icon: 'fas fa-coins', title: 'Стоимость', desc: 'Подписка vs зарплаты 5–10 сотрудников' }
]

const compMatrix = [
  {
    criteria: 'Тип',
    chatium: '✅ ОС для бизнеса',
    lovable: 'Генератор React',
    cursor: 'AI-помощник кода',
    n8n: 'Автоматизация'
  },
  {
    criteria: 'Инфраструктура',
    chatium: '✅ 16+ модулей',
    lovable: '⚠️ Supabase',
    cursor: '❌ Нет',
    n8n: '❌ Нет'
  },
  {
    criteria: 'Хостинг',
    chatium: '✅ Включён (РФ)',
    lovable: '✅ США/EU',
    cursor: '❌ Свой',
    n8n: '❌ Свой'
  },
  {
    criteria: 'БД',
    chatium: '✅ Heap + embeddings',
    lovable: '✅ PostgreSQL',
    cursor: '❌ Своя',
    n8n: '❌ Своя'
  },
  { criteria: 'CRM', chatium: '✅ Встроенная', lovable: '❌', cursor: '❌', n8n: '❌' },
  {
    criteria: 'Платежи',
    chatium: '✅ ЮКасса, МИР, СБП',
    lovable: '❌ Stripe',
    cursor: '❌',
    n8n: '❌'
  },
  {
    criteria: 'Рассылки',
    chatium: '✅ 8 каналов',
    lovable: '❌',
    cursor: '❌',
    n8n: '⚠️ Интеграции'
  },
  { criteria: 'AI-агенты', chatium: '✅ Процессные', lovable: '❌', cursor: '❌', n8n: '❌' },
  {
    criteria: 'Автоматизации',
    chatium: '✅ Визуальные + код',
    lovable: '❌',
    cursor: '❌',
    n8n: '✅ Визуальные'
  },
  {
    criteria: 'Мобильные',
    chatium: '✅ iOS + Android',
    lovable: '❌ Веб',
    cursor: '❌',
    n8n: '❌'
  },
  {
    criteria: 'Вайбкодинг',
    chatium: '✅ Ботан',
    lovable: '✅ AI React',
    cursor: '✅ AI-код',
    n8n: '❌'
  },
  {
    criteria: 'Доступность РФ',
    chatium: '✅ Всегда',
    lovable: '⚠️ Риск',
    cursor: '⚠️ VPN',
    n8n: '✅ Self-hosted'
  },
  {
    criteria: 'Оплата',
    chatium: '✅ Рубли',
    lovable: '❌ $',
    cursor: '❌ $',
    n8n: '✅ Open-source'
  },
  { criteria: '152-ФЗ', chatium: '✅ Да', lovable: '❌', cursor: '❌', n8n: '⚠️ Self-hosted' }
]

const versus = [
  {
    name: 'Lovable',
    summary: 'Хороший генератор React для международного рынка, но...',
    points: [
      '❌ Только веб — нет мобильных',
      '❌ Нет российских платежей',
      '❌ Нет CRM, рассылок, автоматизаций',
      '❌ Нет процессных AI-агентов',
      '❌ Хостинг в США/EU (нарушение 152-ФЗ)',
      '❌ Оплата только в $',
      'Для бизнеса нужно ещё 5–9 сервисов → $150–300+/мес'
    ]
  },
  {
    name: 'Cursor / Claude Code',
    summary: 'Текстовые редакторы с ИИ. Помогают ПИСАТЬ код. Но...',
    points: [
      '❌ Нет инфраструктуры — где код будет работать?',
      '❌ Нужен свой сервер, БД, деплой, модули',
      '❌ Код работает КРИВО вне инфраструктуры',
      '❌ Не знают бизнес-логику, клиентов, данные',
      'Код без среды — чертёж без участка и строителей'
    ]
  },
  {
    name: 'n8n',
    summary: 'Отличный для автоматизаций, но только это.',
    points: [
      '❌ ТОЛЬКО автоматизации — нет сайтов, CRM, агентов',
      '❌ Нужен свой сервер для self-hosted',
      '❌ Нет контекста бизнеса',
      '❌ Нет ИИ-агентов для общения с клиентами'
    ]
  }
]

const questions = [
  'Тайминг — сколько минут на весь вебинар? От этого зависит глубина каждого раздела.',
  'Демо-кейсы — какие конкретные демонстрации покажем? Помимо EMI Online и агента Авито — есть ли ещё?',
  'Команда — нужно ли достать конкретные данные о Тимуре, Артуре, Давиде, Александре, Ратмире? Могу вытянуть из /plani-2026.',
  'Сравнение с n8n — в /sravnenie нет детального сравнения. Нужно проработать глубже?',
  'Метафора — ОС или Город? Или нужно ещё подумать?',
  'Формат — интерактивная презентация в браузере (Vue слайды)? Или HTML-страница?',
  'Стоимость Chatium — озвучивать конкретные цены? Какие тарифы?'
]

const recs = [
  {
    icon: 'fas fa-users',
    title: 'Социальное доказательство',
    desc: 'EMI Online — отлично. Если есть ещё 2–3 клиента с результатами — усилит в 10 раз.'
  },
  {
    icon: 'fas fa-play-circle',
    title: 'Живая демо > Слайды',
    desc: 'Минимум 30% времени — живые демонстрации. Люди хотят видеть, как это РАБОТАЕТ.'
  },
  {
    icon: 'fas fa-arrows-left-right',
    title: 'Было / Стало',
    desc: 'Самый сильный приём: ДО (10 сервисов, 5 сотрудников) vs ПОСЛЕ (1 платформа).'
  },
  {
    icon: 'fas fa-calculator',
    title: 'ROI-калькулятор',
    desc: 'Простой расчёт: сколько тратите сейчас vs сколько с Chatium.'
  },
  {
    icon: 'fas fa-rocket',
    title: 'Попробуй сейчас',
    desc: 'В конце: «Скажите Ботану: сделай мне лендинг. И посмотрите, что получится.»'
  },
  {
    icon: 'fas fa-repeat',
    title: 'Рефрен целостности',
    desc: '«Всё в одном месте. Всё связано. Всё работает вместе.» — повторять часто.'
  }
]

let scrollHandler
onMounted(() => {
  scrollHandler = () => {
    const ids = sections.map((s) => s.id)
    for (let i = ids.length - 1; i >= 0; i--) {
      const el = document.getElementById(ids[i])
      if (el && el.getBoundingClientRect().top <= 120) {
        activeSection.value = ids[i]
        break
      }
    }
  }
  window.addEventListener('scroll', scrollHandler, { passive: true })
})
onUnmounted(() => {
  if (scrollHandler) window.removeEventListener('scroll', scrollHandler)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500;600;700;800;900&display=swap');

.plan-root {
  --bg: #0a0a0f;
  --bg2: #12121a;
  --surface: #1a1a26;
  --surface2: #222233;
  --border: #2a2a3d;
  --text: #e8e8f0;
  --text2: #9999b3;
  --accent: #6c5ce7;
  --accent2: #a29bfe;
  --accent3: #00cec9;
  --green: #00b894;
  --orange: #fdcb6e;
  --red: #ff7675;
  --pink: #e84393;

  font-family: 'Onest', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  line-height: 1.7;
  scroll-behavior: smooth;
}

.plan-root *,
.plan-root *::before,
.plan-root *::after {
  box-sizing: border-box;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
}

/* NAV */
.side-nav {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  height: 100vh;
  width: 240px;
  background: rgba(10, 10, 15, 0.97);
  border-right: 1px solid var(--border);
  transform: translateX(-240px);
  transition: transform 0.3s ease;
  backdrop-filter: blur(20px);
}
.side-nav.open {
  transform: translateX(0);
}
.nav-toggle {
  position: absolute;
  top: 16px;
  right: -48px;
  width: 40px;
  height: 40px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.nav-toggle:hover {
  background: var(--accent);
}
.nav-links {
  padding: 72px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-links a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--text2);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
}
.nav-links a:hover,
.nav-links a.active {
  background: var(--surface2);
  color: var(--text);
}
.nav-links a.active {
  border-left: 3px solid var(--accent);
}
.nav-num {
  font-weight: 700;
  font-size: 12px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

/* HERO */
.hero {
  position: relative;
  padding: 100px 24px 80px;
  text-align: center;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(108, 92, 231, 0.15) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 80%, rgba(0, 206, 201, 0.08) 0%, transparent 50%);
}
.hero-content {
  position: relative;
  z-index: 1;
}
.hero-badge {
  display: inline-block;
  padding: 6px 20px;
  background: rgba(108, 92, 231, 0.15);
  border: 1px solid rgba(108, 92, 231, 0.3);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--accent2);
  margin-bottom: 32px;
}
.hero h1 {
  font-size: clamp(40px, 8vw, 72px);
  font-weight: 900;
  line-height: 1.05;
  margin: 0 0 24px;
  letter-spacing: -2px;
  background: linear-gradient(135deg, #fff 30%, var(--accent2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-sub {
  font-size: clamp(18px, 3.5vw, 32px);
  font-weight: 500;
  letter-spacing: 0;
  background: linear-gradient(135deg, var(--text2) 0%, var(--accent2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-meta {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 28px;
}
.meta-item {
  font-size: 14px;
  color: var(--text2);
  display: flex;
  align-items: center;
  gap: 8px;
}
.meta-item i {
  color: var(--accent);
}
.hero-tagline {
  font-size: 18px;
  color: var(--text2);
  max-width: 600px;
  margin: 0 auto;
}
.hero-tagline strong {
  color: var(--accent2);
}

/* SECTIONS */
.content-section {
  padding: 80px 0;
}
.content-section.dark {
  background: var(--bg2);
}
.content-section.questions-section {
  background: linear-gradient(180deg, var(--bg) 0%, #0d0d18 100%);
}

.section-title {
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 40px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.section-title.light {
  color: #fff;
}
.title-accent {
  font-size: 24px;
}

/* PART HEADERS */
.part-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}
.part-num {
  font-size: 56px;
  font-weight: 900;
  color: var(--accent);
  opacity: 0.4;
  line-height: 1;
}
.part-header h2 {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
  flex: 1;
}
.part-sub {
  font-size: 18px;
  font-weight: 400;
  color: var(--text2);
  display: block;
}
.part-time {
  font-size: 13px;
  color: var(--text2);
  background: var(--surface);
  padding: 4px 12px;
  border-radius: 100px;
  white-space: nowrap;
}

/* TIMELINE */
.timeline-section {
  padding: 60px 0;
  background: var(--bg2);
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.timeline-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--surface);
  border-radius: 12px;
  border: 1px solid var(--border);
  transition: all 0.3s ease;
  animation: fadeIn 0.5s ease both;
  animation-delay: var(--delay);
}
.timeline-item:hover {
  border-color: var(--accent);
  transform: translateX(4px);
}
.tl-num {
  font-size: 20px;
  font-weight: 900;
  color: var(--accent);
  width: 36px;
  text-align: center;
  flex-shrink: 0;
}
.tl-body {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.tl-title {
  font-weight: 600;
  font-size: 15px;
}
.tl-time {
  font-size: 13px;
  color: var(--text2);
  background: rgba(108, 92, 231, 0.1);
  padding: 3px 10px;
  border-radius: 100px;
  white-space: nowrap;
}

/* QUOTE BLOCKS */
.quote-block {
  padding: 24px 28px;
  border-left: 4px solid var(--accent);
  background: rgba(108, 92, 231, 0.06);
  border-radius: 0 12px 12px 0;
  margin-bottom: 32px;
}
.quote-block.accent {
  border-left-color: var(--accent3);
  background: rgba(0, 206, 201, 0.06);
}
.quote-block p {
  margin: 0 0 8px;
}
.quote-block p:last-child {
  margin: 0;
}

/* RECOMMENDATIONS */
.recommendation {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
}
.rec-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px;
  background: rgba(253, 203, 110, 0.1);
  border: 1px solid rgba(253, 203, 110, 0.2);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: var(--orange);
  margin-bottom: 12px;
}
.recommendation p {
  margin: 0 0 8px;
  color: var(--text2);
}
.recommendation em {
  color: var(--text);
}

/* SUB TITLES */
.sub-title {
  font-size: 22px;
  font-weight: 700;
  margin: 48px 0 20px;
}
.sub-title.light {
  color: #fff;
}
.sub-title.sm {
  font-size: 18px;
  margin-top: 32px;
}

.desc {
  color: var(--text2);
  margin-bottom: 24px;
}

/* MODULES GRID */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-bottom: 32px;
}
.module-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}
.module-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}
.module-icon {
  font-size: 20px;
  color: var(--accent2);
  margin-bottom: 10px;
}
.module-name {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 6px;
}
.module-desc {
  font-size: 13px;
  color: var(--text2);
  margin-bottom: 10px;
  line-height: 1.4;
}
.module-business {
  font-size: 13px;
  color: var(--accent3);
  margin-bottom: 10px;
  line-height: 1.5;
  padding: 8px 10px;
  background: rgba(0, 206, 201, 0.08);
  border-radius: 8px;
  border-left: 2px solid var(--accent3);
}
.module-replaces {
  font-size: 12px;
  color: var(--accent3);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* CARDS ROW */
.cards-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}
.cards-row.three {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
.info-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
}
.info-card h4 {
  margin: 0 0 12px;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.info-card h4 i {
  color: var(--accent2);
}
.info-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.info-card ul li {
  font-size: 14px;
  color: var(--text2);
  padding: 4px 0;
}
.info-card p {
  font-size: 14px;
  color: var(--text2);
  margin: 0;
}

/* CALLOUT */
.callout {
  padding: 20px 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin: 24px 0 32px;
  font-size: 15px;
}
.callout.highlight {
  border-color: var(--accent);
  background: rgba(108, 92, 231, 0.08);
}
.callout.light {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}
.callout .mt {
  margin-top: 12px;
}

/* COST TABLE */
.cost-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 24px;
}
.cost-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--surface);
  border-radius: 8px;
  font-size: 14px;
}
.cost-row.total {
  background: rgba(108, 92, 231, 0.15);
  border: 1px solid var(--accent);
  font-weight: 700;
  margin-top: 4px;
}
.cost-label {
  color: var(--text2);
}
.cost-value {
  font-weight: 600;
  color: var(--text);
}

/* FEATURES LIST */
.features-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}
.feature {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}
.feature i {
  font-size: 20px;
  color: var(--accent2);
  margin-top: 2px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}
.feature strong {
  display: block;
  margin-bottom: 2px;
}
.feature p {
  margin: 0;
  color: var(--text2);
  font-size: 14px;
}

/* TAGS */
.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 32px;
}
.tag {
  padding: 8px 16px;
  background: rgba(108, 92, 231, 0.1);
  border: 1px solid rgba(108, 92, 231, 0.2);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent2);
}

/* DEMO BLOCK */
.demo-block {
  padding: 24px;
  border: 2px dashed var(--accent);
  border-radius: 12px;
  margin: 32px 0;
  background: rgba(108, 92, 231, 0.04);
}
.demo-block.dark {
  border-color: var(--accent3);
  background: rgba(0, 206, 201, 0.04);
}
.demo-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px;
  background: rgba(108, 92, 231, 0.15);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent2);
  margin-bottom: 12px;
}
.demo-block ol {
  margin: 0;
  padding-left: 20px;
  color: var(--text2);
}
.demo-block li {
  padding: 4px 0;
  font-size: 14px;
}

/* ARCH FLOW */
.arch-flow {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.arch-step {
  flex: 1;
  min-width: 140px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
  position: relative;
}
.arch-step:not(:last-child)::after {
  content: '→';
  position: absolute;
  right: -14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--accent);
  font-weight: 700;
  font-size: 18px;
  z-index: 1;
}
.arch-icon {
  font-size: 24px;
  color: var(--accent2);
  margin-bottom: 10px;
}
.arch-label {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 4px;
}
.arch-desc {
  font-size: 12px;
  color: var(--text2);
}

/* COMPARE TABLE */
.compare-table-wrap {
  overflow-x: auto;
  margin-bottom: 32px;
}
.compare-table {
  width: 100%;
  border-collapse: collapse;
}
.compare-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 14px;
  font-weight: 700;
  border-bottom: 2px solid var(--border);
}
.compare-table td {
  padding: 12px 16px;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.compare-table .dim {
  color: var(--text2);
}
.compare-table .bright {
  color: var(--accent3);
  font-weight: 500;
}

/* USE CASES */
.use-cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-bottom: 32px;
}
.use-case {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}
.use-case i {
  font-size: 20px;
  color: var(--accent2);
  margin-bottom: 10px;
  display: block;
}
.use-case strong {
  display: block;
  margin-bottom: 6px;
  font-size: 15px;
}
.use-case p {
  margin: 0;
  font-size: 13px;
  color: var(--text2);
}

/* REPLACE TABLES */
.replace-table-wrap {
  overflow-x: auto;
  margin-bottom: 32px;
}
.replace-table {
  width: 100%;
  border-collapse: collapse;
}
.replace-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--text2);
  border-bottom: 2px solid var(--border);
}
.replace-table td {
  padding: 10px 14px;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.replace-table .money {
  color: var(--green);
  font-weight: 600;
  white-space: nowrap;
}
.replace-table tfoot td {
  border-top: 2px solid var(--accent);
  padding-top: 14px;
}

/* BENEFITS */
.benefits-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.benefit {
  text-align: center;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}
.benefit i {
  font-size: 24px;
  color: var(--accent2);
  margin-bottom: 10px;
  display: block;
}
.benefit strong {
  display: block;
  font-size: 14px;
  margin-bottom: 6px;
}
.benefit p {
  margin: 0;
  font-size: 12px;
  color: var(--text2);
}

/* COMPARE MATRIX */
.compare-matrix-wrap {
  overflow-x: auto;
  margin-bottom: 32px;
  -webkit-overflow-scrolling: touch;
}
.compare-matrix {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}
.compare-matrix th {
  padding: 10px 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  border-bottom: 2px solid var(--border);
  color: var(--text2);
  white-space: nowrap;
}
.compare-matrix th.hl {
  color: var(--accent2);
}
.compare-matrix td {
  padding: 10px 12px;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.compare-matrix td.hl {
  color: var(--green);
  font-weight: 600;
}

/* VERSUS CARDS */
.versus-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}
.versus-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
}
.versus-card h4 {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--text);
}
.vs-sum {
  font-size: 13px;
  color: var(--text2);
  margin: 0 0 12px;
}
.versus-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.versus-card li {
  font-size: 13px;
  color: var(--text2);
  padding: 3px 0;
}

/* FINAL CARDS */
.final-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}
.final-card {
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.12) 0%, rgba(0, 206, 201, 0.08) 100%);
  border: 1px solid rgba(108, 92, 231, 0.25);
  border-radius: 16px;
  padding: 32px 28px;
  text-align: center;
}
.fc-num {
  font-size: 40px;
  font-weight: 900;
  color: var(--accent);
  opacity: 0.5;
  margin-bottom: 12px;
}
.final-card h3 {
  margin: 0 0 12px;
  font-size: 20px;
}
.final-card p {
  margin: 0;
  font-size: 14px;
  color: var(--text2);
  line-height: 1.6;
}

/* QUESTIONS */
.questions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.question-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.q-num {
  font-size: 20px;
  font-weight: 900;
  color: var(--accent);
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}
.question-item p {
  margin: 0;
  font-size: 15px;
  color: var(--text2);
}

/* RECS */
.recs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.rec-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 24px;
}
.rec-card i {
  font-size: 24px;
  color: var(--orange);
  margin-bottom: 12px;
  display: block;
}
.rec-card h4 {
  margin: 0 0 8px;
  font-size: 16px;
}
.rec-card p {
  margin: 0;
  font-size: 13px;
  color: var(--text2);
}

/* FOOTER */
.plan-footer {
  padding: 40px 24px;
  text-align: center;
  color: var(--text2);
  font-size: 13px;
  border-top: 1px solid var(--border);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .arch-flow {
    flex-direction: column;
  }
  .arch-step:not(:last-child)::after {
    display: none;
  }
  .part-num {
    font-size: 40px;
  }
}
</style>
