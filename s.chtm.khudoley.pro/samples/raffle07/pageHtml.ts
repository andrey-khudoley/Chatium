/* eslint-disable */
// Порт дизайна Claude Design «Розыгрыш призов.dc.html» на self-contained vanilla-JS страницу.
// Исходник — на фреймворке DCLogic (React + support.js); здесь он переписан без внешних зависимостей,
// визуал / анимация / логика розыгрыша воспроизведены 1:1.
//
// Данные участников — ВЫМЫШЛЕННЫЙ список (42 человека), захардкожен ниже.
// Это sample-копия: все имена, id и email придуманы, совпадения с реальными людьми случайны.
// Email замаскированы по схеме дизайна (первые 2 символа + '**@**' + последние 5 доменa).
//
// Победители заданы жёстко в WINNER_INDICES (0-based индексы в USERS):
//   15 = Аглая Снегирёва (#369919263)        -> 1 место
//   25 = Устинья Верещагина (#372157144)     -> 2 место
// Чтобы сменить победителей — поменяйте два числа в WINNER_INDICES.
//
// Анимация (как в дизайне): двухэтапный отбор. Этап 1 — три столбца перебираются одновременно
// и каждый останавливается на своём финалисте (столбец победителя — на победителе). Этап 2 —
// перебор трёх финалистов и остановка на победителе, затем reveal.
export const PAGE_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Розыгрыш призов</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;height:100%;background:#0e0b06}
  a{color:#E7C066;text-decoration:none}
  a:hover{color:#F6DE9A}
  ::selection{background:rgba(231,192,102,.3)}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes spotIn{0%{opacity:0;transform:scale(.82) translateY(18px)}60%{opacity:1}100%{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes spotBg{0%{opacity:0}100%{opacity:1}}
  @keyframes cardIn{0%{opacity:0;transform:translateY(34px) scale(.9)}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes ringPulse{0%,100%{box-shadow:0 0 0 0 rgba(231,192,102,.5)}50%{box-shadow:0 0 0 14px rgba(231,192,102,0)}}
  @keyframes floatGlow{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes slotIn{0%{opacity:0;transform:scale(.9)}100%{opacity:1;transform:scale(1)}}
  @keyframes idleIn{0%{opacity:0}100%{opacity:1}}
  @keyframes idleCardIn{0%{opacity:0;transform:translateY(24px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes idleOut{0%{opacity:1}100%{opacity:0;visibility:hidden}}
  @keyframes btnSheen{0%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(320%) skewX(-18deg)}}
  .rz-start-btn:hover{transform:translateY(-2px)!important;box-shadow:0 22px 56px rgba(231,192,102,.5)!important;filter:brightness(1.05)!important}
  .rz-start-btn:active{transform:translateY(0) scale(.98)!important}
  /* Сетка участников всегда 3 столбца — анимация идёт параллельно по трём столбцам */
  @media (max-width:900px){
    .rz-root{padding:22px 16px 30px!important}
    .rz-main{grid-template-columns:1fr!important;gap:16px!important}
    .rz-aside{position:static!important}
    .rz-aside-slots{flex-direction:row!important}
    .rz-slot{flex:1 1 0!important}
    .rz-list{gap:6px!important}
    .rz-list>div{padding:6px 7px!important}
    .rz-list>div>span:nth-child(3){font-size:9.5px!important}
    .rz-finale{gap:16px!important}
    .rz-finale-overlay{justify-content:flex-start!important;overflow-y:auto!important;padding:28px 16px!important;gap:26px!important}
    .rz-card{width:min(90vw,340px)!important;min-height:auto!important;padding:26px 22px!important}
    .rz-reveal-card{padding:34px 28px!important;max-width:90vw!important}
  }
  @media (max-width:560px){
    .rz-list{gap:4px!important}
    .rz-list>div{padding:5px 6px!important;gap:5px!important;border-radius:8px!important;flex-wrap:wrap!important}
    .rz-list>div>span:nth-child(1){font-size:9px!important;padding:2px 4px!important}
    .rz-list>div>span:nth-child(2){font-size:10px!important}
    .rz-list>div>span:nth-child(3){display:none!important}
    .rz-aside-slots{flex-direction:column!important}
    .rz-card{width:100%!important;max-width:340px!important}
  }
</style>
</head>
<body>
<div id="rf-root" class="rz-root" style="position:relative;width:100vw;min-height:100vh;overflow:hidden;background:radial-gradient(1200px 700px at 78% -8%,rgba(231,192,102,.10),transparent 60%),radial-gradient(1000px 600px at 8% 108%,rgba(231,192,102,.07),transparent 60%),#0e0b06;font-family:'Manrope',sans-serif;color:#EDE6D6;padding:32px 40px 40px;display:flex;flex-direction:column;">

  <canvas id="rf-canvas" style="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90;"></canvas>

  <header style="display:flex;flex-direction:column;align-items:center;gap:10px;flex:0 0 auto;margin-bottom:22px;text-align:center;">
    <div style="font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(30px,3.4vw,52px);letter-spacing:.14em;text-transform:uppercase;background:linear-gradient(100deg,#C99A3B 0%,#F6DE9A 25%,#FBEEC8 50%,#F6DE9A 75%,#C99A3B 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 5s linear infinite;">Розыгрыш призов</div>
    <div style="display:flex;align-items:center;gap:12px;min-height:26px;">
      <span style="width:8px;height:8px;border-radius:50%;background:#E7C066;box-shadow:0 0 12px #E7C066;animation:ringPulse 1.6s ease-out infinite;"></span>
      <span id="rf-status" style="font-size:15px;font-weight:600;letter-spacing:.02em;color:#D8C89C;"></span>
    </div>
  </header>

  <main class="rz-main" style="flex:1 1 auto;display:grid;grid-template-columns:1fr 356px;gap:26px;min-height:0;align-items:start;">

    <section style="background:rgba(255,255,255,.02);border:1px solid rgba(231,192,102,.12);border-radius:18px;padding:16px;backdrop-filter:blur(4px);">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:2px 6px 14px;">
        <span style="font-family:'Oswald',sans-serif;font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:#9a8f6f;">Участники</span>
        <span id="rf-total" style="font-size:13px;font-weight:700;color:#E7C066;"></span>
      </div>
      <div id="rf-grid" class="rz-list" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;"></div>
    </section>

    <aside class="rz-aside" style="display:flex;flex-direction:column;gap:16px;position:sticky;top:0;">
      <div style="font-family:'Oswald',sans-serif;font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:#9a8f6f;padding-left:4px;">Победители</div>
      <div class="rz-aside-slots" style="display:flex;flex-direction:column;gap:16px;">
        <div id="rf-slot0" class="rz-slot"></div>
        <div id="rf-slot1" class="rz-slot"></div>
      </div>
    </aside>
  </main>
</div>

<script>
(function(){
  'use strict';

  // === Вымышленные участники (42 чел., все имена/id/email придуманы). ===
  var USERS = [
    { id: '310004527', name: 'Татьяна Ветрова', email: 've**@**ex.ru' },
    { id: '310558291', name: 'Мария Соловьёва', email: 'ma**@**il.ru' },
    { id: '331207834', name: 'Ольга Викторовна Крапивина', email: 'kr**@**il.ru' },
    { id: '333918466', name: 'Наталья Андреевна Лебедева', email: 'na**@**bk.ru' },
    { id: '348020193', name: 'Полина Ежова', email: 'pj**@**l.com' },
    { id: '356114272', name: 'Дарья Павловна Клюева', email: 'kl**@**ex.ru' },
    { id: '361228357', name: 'Алина Тополева', email: 'al**@**il.ru' },
    { id: '363090441', name: 'Вера Ручьёва', email: 've**@**il.ru' },
    { id: '364111586', name: 'Софья Заречная', email: 'so**@**ex.ru' },
    { id: '365056629', name: 'Милана Ковалёва', email: 'mi**@**st.ru' },
    { id: '365303715', name: 'Оксана Дмитриевна Полозова', email: 'ok**@**il.ru' },
    { id: '368939808', name: 'Инга Валерьевна Морозова', email: 'in**@**l.com' },
    { id: '369078993', name: 'Яна Викторовна Черемушкина', email: 'ya**@**ex.ru' },
    { id: '369530052', name: 'Регина Юрьевна Ласточкина', email: 're**@**l.com' },
    { id: '369673148', name: 'Тамара Геннадьевна Ёлкина', email: 'ta**@**il.ru' },
    { id: '369919263', name: 'Аглая Снегирёва', email: 'ag**@**ex.ru' },
    { id: '370055177', name: 'Кира Владимировна Синицына', email: 'ki**@**il.ru' },
    { id: '371111094', name: 'Злата Евгеньевна Панкратова', email: 'zl**@**l.com' },
    { id: '371333385', name: 'Лада Юрьевна Ким', email: 'la**@**l.com' },
    { id: '371384122', name: 'Эльвира Ахматшина', email: 'el**@**l.com' },
    { id: '371403617', name: 'Марина Голубева', email: 'ma**@**il.ru' },
    { id: '371475936', name: 'Алла Игоревна Перепёлкина', email: 'pe**@**ex.ru' },
    { id: '371523408', name: 'Василиса Журбина', email: 'Va**@**ex.ru' },
    { id: '371802251', name: 'Евгения Павловна Шмелёва', email: 'sh**@**l.com' },
    { id: '371814379', name: 'Карина Осокина', email: 'os**@**il.ru' },
    { id: '372157144', name: 'Устинья Леонидовна Верещагина', email: 'us**@**ex.ru' },
    { id: '372189652', name: 'Динара Маратовна Юлдашева', email: 'Di**@**ex.ru' },
    { id: '372382907', name: 'Антонина Сергеевна Пчёлкина', email: 'Pc**@**il.ru' },
    { id: '372553431', name: 'Ангелина Крутова', email: 'an**@**il.ru' },
    { id: '372604286', name: 'Виолетта Викторовна Огнева', email: 'og**@**l.com' },
    { id: '372742619', name: 'Роза Шварцман', email: 'sc**@**bk.ru' },
    { id: '372945233', name: 'Клавдия Лопухова', email: 'Kl**@**il.ru' },
    { id: '373196678', name: 'Есения Романовна Свиридова', email: 'sv**@**ex.ru' },
    { id: '373256924', name: 'Снежана Пестрякова', email: 'sn**@**l.com' },
    { id: '373277561', name: 'Христина Сергеевна Мельник', email: 'hr**@**l.com' },
    { id: '373345492', name: 'Стефания Сергеевна Зорина', email: '79**@**ex.ru' },
    { id: '373350126', name: 'Лилия Сергеевна Ливнева', email: 'li**@**l.com' },
    { id: '373439685', name: 'Лидия Чегодаева', email: 'ch**@**il.ru' },
    { id: '373465568', name: 'Нонна Жаворонкова', email: 'Zh**@**d.com' },
    { id: '373641082', name: 'Жанна Маратовна Мустафина', email: 'ZH**@**il.ru' },
    { id: '373992975', name: 'Любовь Геннадьевна Сомова', email: 's_**@**il.ru' },
    { id: '374043107', name: 'Ада Аркадьевна Метелица', email: 'ad**@**l.com' }
  ];

  // === Победители (0-based индексы в USERS) — поменяйте, чтобы выбрать других ===
  var WINNER_INDICES = [15, 25];

  var PRIZES = [
    { place: '1 место', title: 'Квартира' },
    { place: '2 место', title: 'Автомобиль' }
  ];
  var CONSOLATION = { place: 'Всем участникам', title: '2000 бонусных рублей' };

  var CONF_COLORS = ['#E7C066', '#F6DE9A', '#C99A3B', '#FBEEC8', '#FFFFFF'];

  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }
  function plural(n, forms){
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return forms[0];
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
    return forms[2];
  }

  // === Состояние ===
  var state = { phase: 'idle', starting: false, highlight: null, drawIndex: 0, captured: [], reveal: null, finalists: [], finalRound: false, colHi: [null, null, null] };
  var wonSet = {};

  // === Ссылки на DOM ===
  var root = document.getElementById('rf-root');
  var statusEl = document.getElementById('rf-status');
  var totalEl = document.getElementById('rf-total');
  var grid = document.getElementById('rf-grid');
  var slotEls = [document.getElementById('rf-slot0'), document.getElementById('rf-slot1')];
  var cv = document.getElementById('rf-canvas');

  // === Стиль ячейки участника из состояния (порт renderVals дизайна) ===
  function computeCell(i){
    var won = !!wonSet[i];
    var active = (state.highlight === i) || (state.colHi.indexOf(i) >= 0);
    var isFinalist = state.finalists.indexOf(i) >= 0;
    var v = { bg:'rgba(255,255,255,.028)', bd:'rgba(231,192,102,.10)', op:'1', tf:'none', gl:'none', idBg:'rgba(231,192,102,.12)', idC:'#E7C066', nameC:'#EDE6D6', mailC:'#8b8674' };
    if (won){ v.op='0.34'; v.bd='rgba(231,192,102,.4)'; v.bg='rgba(231,192,102,.07)'; }
    if (state.finalRound && !isFinalist && !active){ v.op='0.16'; }
    if (isFinalist && !active){ v.bg='rgba(231,192,102,.12)'; v.bd='rgba(246,222,154,.7)'; v.gl='0 0 0 1px rgba(246,222,154,.5),0 6px 20px rgba(231,192,102,.22)'; v.op='1'; }
    if (active){ v.bg='linear-gradient(100deg,#F6DE9A,#E7C066)'; v.bd='#F6DE9A'; v.tf='scale(1.055)'; v.gl='0 10px 32px rgba(231,192,102,.45)'; v.idBg='rgba(0,0,0,.16)'; v.idC='#3a2c08'; v.nameC='#241a04'; v.mailC='#4a3808'; v.op='1'; }
    return v;
  }
  function applyCellV(refs, v){
    refs.root.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:11px;background:' + v.bg + ';border:1px solid ' + v.bd + ';opacity:' + v.op + ';transform:' + v.tf + ';box-shadow:' + v.gl + ';transition:all .16s ease;min-width:0;';
    refs.idEl.style.cssText = 'font:700 10px/1 Manrope,sans-serif;padding:3px 6px;border-radius:6px;background:' + v.idBg + ';color:' + v.idC + ';white-space:nowrap;flex:0 0 auto;';
    refs.nameEl.style.cssText = 'font:700 12.5px/1.15 Manrope,sans-serif;color:' + v.nameC + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 auto;min-width:0;';
    refs.mailEl.style.cssText = 'font:500 10.5px/1 ui-monospace,monospace;color:' + v.mailC + ';white-space:nowrap;flex:0 0 auto;';
  }

  var cellEls = [];
  function buildCells(){
    for (var i = 0; i < USERS.length; i++){
      var u = USERS[i];
      var cellRoot = document.createElement('div');
      var idEl = document.createElement('span'); idEl.textContent = '#' + u.id;
      var nameEl = document.createElement('span'); nameEl.textContent = u.name;
      var mailEl = document.createElement('span'); mailEl.textContent = u.email;
      cellRoot.appendChild(idEl); cellRoot.appendChild(nameEl); cellRoot.appendChild(mailEl);
      grid.appendChild(cellRoot);
      cellEls.push({ root: cellRoot, idEl: idEl, nameEl: nameEl, mailEl: mailEl });
    }
  }
  function renderCells(){
    for (var i = 0; i < cellEls.length; i++) applyCellV(cellEls[i], computeCell(i));
  }

  // === Слоты победителей ===
  function slotWrap(filled){
    var base = 'padding:18px;border-radius:16px;min-height:132px;display:flex;flex-direction:column;justify-content:center;';
    return base + (filled
      ? 'background:linear-gradient(180deg,rgba(231,192,102,.14),rgba(231,192,102,.04));border:1px solid rgba(231,192,102,.5);box-shadow:0 12px 34px rgba(231,192,102,.14);'
      : 'background:rgba(255,255,255,.015);border:1px dashed rgba(231,192,102,.28);');
  }
  function renderSlot(i){
    var box = slotEls[i];
    var c = state.captured[i];
    box.style.cssText = slotWrap(!!c);
    if (c){
      box.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:6px;animation:slotIn .5s ease both;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-family:\\'Oswald\\',sans-serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#3a2c08;background:linear-gradient(100deg,#F6DE9A,#E7C066);padding:3px 9px;border-radius:20px;">' + esc(PRIZES[i].place) + '</span>' +
            '<span style="font-size:12px;font-family:ui-monospace,monospace;color:#b6a980;">#' + esc(c.user.id) + '</span>' +
          '</div>' +
          '<div style="font-size:21px;font-weight:800;color:#FBEEC8;line-height:1.15;">' + esc(c.user.name) + '</div>' +
          '<div style="font-size:12px;font-family:ui-monospace,monospace;color:#a89c78;">' + esc(c.user.email) + '</div>' +
          '<div style="margin-top:6px;font-size:13px;font-weight:600;color:#E7C066;border-top:1px solid rgba(231,192,102,.2);padding-top:8px;line-height:1.3;">' + esc(PRIZES[i].title) + '</div>' +
        '</div>';
    } else {
      box.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<div style="font-family:\\'Oswald\\',sans-serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#8a7f60;">' + esc(PRIZES[i].place) + '</div>' +
          '<div style="font-size:15px;font-weight:700;color:#b6a980;line-height:1.3;">' + esc(PRIZES[i].title) + '</div>' +
          '<div style="font-size:12px;color:#6f6650;margin-top:4px;">Ожидает розыгрыша…</div>' +
        '</div>';
    }
  }

  // === Оверлеи (reveal / results) ===
  var revealEl = document.createElement('div');
  revealEl.style.cssText = 'position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:radial-gradient(700px 500px at 50% 42%,rgba(231,192,102,.14),transparent 65%),rgba(8,6,3,.74);backdrop-filter:blur(6px);animation:spotBg .4s ease both;';
  root.appendChild(revealEl);

  var resultsEl = document.createElement('div');
  resultsEl.className = 'rz-finale-overlay';
  resultsEl.style.cssText = 'position:fixed;inset:0;z-index:60;display:none;flex-direction:column;align-items:center;justify-content:center;gap:40px;padding:40px;background:radial-gradient(900px 620px at 50% 30%,rgba(231,192,102,.12),transparent 65%),rgba(8,6,3,.9);backdrop-filter:blur(8px);animation:spotBg .5s ease both;';
  root.appendChild(resultsEl);

  // === Idle-оверлей (стартовый экран с кнопкой) ===
  var idleEl = document.createElement('div');
  root.appendChild(idleEl);
  function idleOverlayCss(starting){
    return 'position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;background:radial-gradient(820px 560px at 50% 34%,rgba(231,192,102,.16),transparent 62%),rgba(9,7,3,.82);backdrop-filter:blur(9px);' +
      (starting ? 'animation:idleOut .45s ease forwards;pointer-events:none;' : 'animation:idleIn .5s ease both;');
  }
  function buildIdleOverlay(){
    var total = USERS.length + ' ' + plural(USERS.length, ['человек', 'человека', 'человек']);
    var chips = PRIZES.map(function(p, i){
      return '<div style="animation-delay:' + (0.12 + i * 0.09) + 's;display:flex;flex-direction:column;gap:3px;align-items:flex-start;text-align:left;padding:12px 18px;border-radius:14px;background:rgba(231,192,102,.06);border:1px solid rgba(231,192,102,.24);animation:idleCardIn .7s cubic-bezier(.2,.8,.2,1) both;">' +
        '<span style="font-family:\\'Oswald\\',sans-serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#E7C066;">' + esc(p.place) + '</span>' +
        '<span style="font-size:14px;font-weight:700;color:#EDE6D6;">' + esc(p.title) + '</span>' +
      '</div>';
    }).join('');
    idleEl.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;gap:28px;max-width:720px;animation:idleCardIn .7s cubic-bezier(.2,.8,.2,1) both;">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<span style="width:34px;height:1px;background:linear-gradient(90deg,transparent,#E7C066);"></span>' +
          '<span style="font-family:\\'Oswald\\',sans-serif;font-size:14px;letter-spacing:.34em;text-transform:uppercase;color:#E7C066;">Готовы?</span>' +
          '<span style="width:34px;height:1px;background:linear-gradient(90deg,#E7C066,transparent);"></span>' +
        '</div>' +
        '<div style="font-family:\\'Oswald\\',sans-serif;font-weight:700;font-size:clamp(34px,4.6vw,62px);line-height:1.02;letter-spacing:.06em;text-transform:uppercase;background:linear-gradient(100deg,#C99A3B,#F6DE9A,#FBEEC8,#F6DE9A,#C99A3B);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 5s linear infinite;">Розыгрыш призов</div>' +
        '<div style="font-size:16px;line-height:1.5;color:#c9bd97;max-width:520px;text-wrap:pretty;">В розыгрыше участвует <b style="color:#F6DE9A;">' + esc(total) + '</b>. Победители определяются случайным образом. Нажмите кнопку, чтобы запустить розыгрыш.</div>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">' + chips + '</div>' +
        '<button type="button" class="rz-start-btn" style="position:relative;overflow:hidden;margin-top:6px;font-family:\\'Oswald\\',sans-serif;font-weight:700;font-size:20px;letter-spacing:.16em;text-transform:uppercase;color:#2a1f06;background:linear-gradient(100deg,#FBEEC8,#E7C066);border:none;padding:18px 52px;border-radius:48px;cursor:pointer;box-shadow:0 16px 44px rgba(231,192,102,.42);transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;">' +
          '<span style="position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:btnSheen 2.6s ease-in-out infinite;"></span>' +
          '<span style="position:relative;">Запустить розыгрыш</span>' +
        '</button>';
    idleEl.querySelector('.rz-start-btn').addEventListener('click', start);
  }
  function start(){
    if (state.phase !== 'idle' || state.starting) return;
    state.starting = true;
    idleEl.style.cssText = idleOverlayCss(true);
    setTimeout(function(){
      state.starting = false;
      idleEl.style.display = 'none';
      setPhase('intro');
      setTimeout(function(){ runDraw(0); }, 700);
    }, 460);
  }

  function showRevealOverlay(item){
    revealEl.innerHTML =
      '<div class="rz-reveal-card" style="position:relative;text-align:center;padding:48px 64px;border-radius:26px;background:linear-gradient(180deg,rgba(28,23,12,.96),rgba(18,14,7,.96));border:1px solid rgba(231,192,102,.4);box-shadow:0 30px 90px rgba(0,0,0,.6),0 0 0 1px rgba(231,192,102,.12) inset;animation:spotIn .7s cubic-bezier(.2,.8,.2,1) both;max-width:640px;">' +
        '<div style="font-family:\\'Oswald\\',sans-serif;font-size:15px;letter-spacing:.28em;text-transform:uppercase;color:#E7C066;margin-bottom:8px;">Победитель · ' + esc(item.prize.place) + '</div>' +
        '<div style="font-size:clamp(38px,4.6vw,62px);font-weight:800;line-height:1.05;color:#FBEEC8;letter-spacing:-.01em;">' + esc(item.user.name) + '</div>' +
        '<div style="font-size:14px;font-family:ui-monospace,monospace;color:#a89c78;margin-top:12px;">' + esc(item.user.email) + ' · #' + esc(item.user.id) + '</div>' +
        '<div style="margin-top:26px;display:inline-block;font-size:17px;font-weight:700;color:#2a1f06;background:linear-gradient(100deg,#F6DE9A,#E7C066);padding:12px 26px;border-radius:40px;box-shadow:0 12px 34px rgba(231,192,102,.35);animation:floatGlow 2.4s ease-in-out infinite;">' + esc(item.prize.title) + '</div>' +
      '</div>';
    revealEl.style.display = 'flex';
  }
  function hideRevealOverlay(){ revealEl.style.display = 'none'; }

  function finaleCard(medal, medalStyle, place, name, nameStyle, email, prize, cardStyle){
    return '<div class="rz-card" style="' + cardStyle + '">' +
      '<div style="' + medalStyle + '">' + medal + '</div>' +
      '<div style="font-family:\\'Oswald\\',sans-serif;font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:#E7C066;margin-top:16px;">' + esc(place) + '</div>' +
      '<div style="' + nameStyle + '">' + esc(name) + '</div>' +
      '<div style="font-size:12px;font-family:ui-monospace,monospace;color:#a89c78;min-height:16px;">' + esc(email) + '</div>' +
      '<div style="margin-top:auto;padding-top:18px;border-top:1px solid rgba(231,192,102,.22);font-size:16px;font-weight:700;color:#FBEEC8;line-height:1.3;">' + esc(prize) + '</div>' +
    '</div>';
  }
  function buildResultsOverlay(){
    var c0 = state.captured[0], c1 = state.captured[1];
    var goldCard = 'position:relative;width:300px;min-height:320px;display:flex;flex-direction:column;align-items:center;text-align:center;padding:32px 26px;border-radius:22px;background:linear-gradient(180deg,rgba(30,24,13,.96),rgba(18,14,7,.96));border:1px solid rgba(231,192,102,.45);box-shadow:0 26px 70px rgba(0,0,0,.5);animation:cardIn .7s cubic-bezier(.2,.8,.2,1) both;';
    var medalGold = 'width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:\\'Oswald\\',sans-serif;font-weight:700;font-size:30px;color:#2a1f06;background:linear-gradient(135deg,#FBEEC8,#E7C066);box-shadow:0 8px 24px rgba(231,192,102,.4);';
    var medalCons = 'width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:\\'Oswald\\',sans-serif;font-weight:700;font-size:30px;color:#E7C066;background:rgba(231,192,102,.1);border:1px solid rgba(231,192,102,.4);';
    var nameBig = 'font-size:26px;font-weight:800;color:#FBEEC8;margin-top:14px;line-height:1.15;';

    var cards =
      finaleCard('1', medalGold, PRIZES[0].place, c0 ? c0.user.name : '', nameBig, c0 ? c0.user.email : '', PRIZES[0].title, goldCard + 'animation-delay:.05s;') +
      finaleCard('2', medalGold, PRIZES[1].place, c1 ? c1.user.name : '', nameBig, c1 ? c1.user.email : '', PRIZES[1].title, goldCard + 'animation-delay:.2s;') +
      finaleCard('★', medalCons, CONSOLATION.place, 'Все остальные участники', nameBig + 'color:#EDE6D6;', '', CONSOLATION.title, goldCard + 'animation-delay:.35s;border-color:rgba(231,192,102,.28);');

    resultsEl.innerHTML =
      '<div style="text-align:center;">' +
        '<div style="font-family:\\'Oswald\\',sans-serif;font-weight:700;font-size:clamp(30px,3.6vw,54px);letter-spacing:.16em;text-transform:uppercase;background:linear-gradient(100deg,#C99A3B,#F6DE9A,#FBEEC8,#F6DE9A,#C99A3B);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 5s linear infinite;">Итоги розыгрыша</div>' +
        '<div style="font-size:15px;color:#b6a980;margin-top:8px;letter-spacing:.02em;">Поздравляем победителей — и всех участников!</div>' +
      '</div>' +
      '<div class="rz-finale" style="display:flex;gap:26px;flex-wrap:wrap;justify-content:center;align-items:stretch;max-width:1180px;">' + cards + '</div>';
    resultsEl.style.display = 'flex';
  }

  // === Статус / фаза ===
  function updateStatus(){
    var s = 'Приготовьтесь к розыгрышу…';
    if (state.phase === 'idle') s = 'Всё готово — нажмите кнопку, чтобы начать';
    else if (state.phase === 'draw') s = state.finalRound
      ? 'Финал: определяем победителя из трёх финалистов'
      : 'Разыгрываем: ' + PRIZES[state.drawIndex].title + ' — отбор финалистов';
    else if (state.phase === 'reveal') s = 'Есть победитель!';
    else if (state.phase === 'results') s = 'Розыгрыш завершён';
    statusEl.textContent = s;
  }
  function setPhase(p){
    state.phase = p;
    cv.style.zIndex = (p === 'results') ? '50' : '90';
    updateStatus();
  }

  // === Конфетти (canvas) ===
  var ctxc = cv.getContext('2d');
  var dpr = 1, particles = [], frame = 0, rain = false;
  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = window.innerWidth * dpr;
    cv.height = window.innerHeight * dpr;
  }
  function mkP(x, y, vx, vy){
    return { x:x, y:y, vx:vx*dpr, vy:vy*dpr, rot:Math.random()*6, vr:(Math.random()-0.5)*0.35,
      w:(4+Math.random()*5)*dpr, h:(6+Math.random()*8)*dpr,
      color:CONF_COLORS[Math.floor(Math.random()*CONF_COLORS.length)] };
  }
  function burstAt(fx, fy, n){
    var x = fx*cv.width, y = fy*cv.height;
    for (var i = 0; i < n; i++){
      var a = Math.random()*Math.PI*2, sp = 3+Math.random()*8;
      particles.push(mkP(x, y, Math.cos(a)*sp, Math.sin(a)*sp-4));
    }
  }
  function loop(){
    var w = cv.width, h = cv.height;
    ctxc.clearRect(0, 0, w, h);
    if (rain && frame % 5 === 0){
      for (var k = 0; k < 3; k++){
        var pt = mkP(Math.random()*w, -12, (Math.random()-0.5)*1.2, Math.random()*0.8+0.5);
        pt.rain = true; pt.sway = (Math.random()*0.6+0.3); pt.phase = Math.random()*6;
        particles.push(pt);
      }
    }
    var g = 0.14*dpr;
    var next = [];
    for (var i = 0; i < particles.length; i++){
      var p = particles[i];
      if (p.rain){
        p.phase += 0.03; p.vy = Math.min(p.vy + 0.02*dpr, 1.6*dpr);
        p.x += p.vx + Math.sin(p.phase)*p.sway*dpr; p.y += p.vy; p.rot += p.vr;
        if (p.y > h+30) continue;
        ctxc.save(); ctxc.translate(p.x, p.y); ctxc.rotate(p.rot);
        ctxc.fillStyle = p.color; ctxc.globalAlpha = 0.9;
        ctxc.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctxc.restore();
        next.push(p);
      } else {
        p.vy += g; p.vx *= 0.995; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > h+30) continue;
        ctxc.save(); ctxc.translate(p.x, p.y); ctxc.rotate(p.rot);
        ctxc.fillStyle = p.color; ctxc.globalAlpha = 0.95;
        ctxc.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctxc.restore();
        next.push(p);
      }
    }
    particles = next;
    frame++;
    requestAnimationFrame(loop);
  }

  // === Розыгрыш ===
  // Порядковый проход по seq, замедляясь и останавливаясь на target (общий сканер).
  function scanSeq(seq, target, d0, dMax, factor, endPause, onDone){
    var tpos = seq.indexOf(target);
    var delays = []; var d = d0; while (d < dMax){ delays.push(d); d *= factor; }
    var steps = delays.length;
    var cur = ((tpos - steps) % seq.length + seq.length) % seq.length;
    var step = 0;
    function tick(){
      state.highlight = seq[cur];
      renderCells();
      if (step < steps){ var dl = delays[step]; step++; cur = (cur + 1) % seq.length; setTimeout(tick, dl); }
      else { setTimeout(onDone, endPause); }
    }
    setTimeout(tick, 140);
  }

  // Одновременный проход по одному столбцу c, замедляясь к его финалисту.
  function scanCol(c, seq, target, onDone){
    var tpos = seq.indexOf(target);
    var delays = []; var d = 45; while (d < 360){ delays.push(d); d *= 1.15; }
    var steps = delays.length;
    var cur = ((tpos - steps) % seq.length + seq.length) % seq.length;
    var step = 0;
    function tick(){
      state.colHi[c] = seq[cur];
      renderCells();
      if (step < steps){ var dl = delays[step]; step++; cur = (cur + 1) % seq.length; setTimeout(tick, dl); }
      else {
        setTimeout(function(){
          state.colHi[c] = null;
          state.finalists.push(target);
          renderCells();
          onDone();
        }, 320);
      }
    }
    setTimeout(tick, 140);
  }

  function runDraw(i){
    state.drawIndex = i;
    state.highlight = null;
    state.finalists = [];
    state.finalRound = false;
    state.colHi = [null, null, null];
    setPhase('draw');
    renderCells();
    var winner = WINNER_INDICES[i];
    var winnerCol = winner % 3;
    var taken = state.captured.map(function(c){ return c.userIndex; });
    var av = [];
    for (var idx = 0; idx < USERS.length; idx++){ if (taken.indexOf(idx) < 0) av.push(idx); }
    // Этап 1: три анимации одновременно — по финалисту из каждого столбца
    var plan = []; var chosen = [];
    for (var c = 0; c < 3; c++){
      var col = c;
      var colSeq = av.filter(function(x){ return x % 3 === col; });
      var tgt;
      if (c === winnerCol){ tgt = winner; }
      else {
        var pool = colSeq.filter(function(x){ return x !== winner && chosen.indexOf(x) < 0; });
        var src = pool.length ? pool : colSeq;
        tgt = src[Math.floor(Math.random() * src.length)];
      }
      chosen.push(tgt); plan.push({ seq: colSeq, tgt: tgt });
    }
    var done = 0;
    function finish(){ if (++done === 3){ setTimeout(function(){ runFinal(i, winner, chosen); }, 640); } }
    setTimeout(function(){
      for (var cc = 0; cc < 3; cc++) scanCol(cc, plan[cc].seq, plan[cc].tgt, finish);
    }, 260);
  }

  // Этап 2: выбор победителя раунда среди трёх финалистов
  function runFinal(i, winner, seq){
    state.finalRound = true;
    state.highlight = null;
    renderCells();
    updateStatus();
    setTimeout(function(){
      scanSeq(seq.slice(), winner, 90, 640, 1.2, 820, function(){ capture(i, winner); });
    }, 460);
  }

  function capture(i, winner){
    var item = { userIndex: winner, user: USERS[winner], prize: PRIZES[i] };
    state.captured.push(item);
    wonSet[winner] = true;
    renderSlot(i);
    renderCells();
    state.reveal = item;
    setPhase('reveal');
    showRevealOverlay(item);
    burstAt(0.5, 0.42, 150);
    setTimeout(function(){ burstAt(0.3, 0.5, 60); }, 260);
    setTimeout(function(){ burstAt(0.7, 0.5, 60); }, 480);
    setTimeout(function(){
      state.reveal = null;
      hideRevealOverlay();
      setTimeout(function(){
        if (i + 1 < WINNER_INDICES.length) runDraw(i + 1);
        else showResults();
      }, 760);
    }, 2700);
  }

  function showResults(){
    state.highlight = null;
    state.finalRound = false;
    state.finalists = [];
    state.colHi = [null, null, null];
    setPhase('results');
    renderCells();
    rain = true;
    buildResultsOverlay();
    burstAt(0.5, 0.3, 220);
    setTimeout(function(){ burstAt(0.25, 0.35, 120); }, 300);
    setTimeout(function(){ burstAt(0.75, 0.35, 120); }, 600);
  }

  // === Инициализация ===
  function init(){
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(loop);
    buildCells();
    renderCells();
    totalEl.textContent = USERS.length + ' ' + plural(USERS.length, ['человек', 'человека', 'человек']);
    renderSlot(0);
    renderSlot(1);
    buildIdleOverlay();
    idleEl.style.cssText = idleOverlayCss(false);
    setPhase('idle');
    // Розыгрыш запускается по кнопке на idle-экране (см. start()).
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
</script>
</body>
</html>`
