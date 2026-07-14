/**
 * Дизайн-CSS сайта КП «Ipsen». Инжектится строкой в <style> внутри index.tsx.
 * Светлая «документная» тема с красным акцентом как в фирменном КП.
 * Все классы с префиксом kp- — глобальные, коллизий нет (единственная страница).
 */
export const SITE_CSS = `
:root {
  --bg: #f6f4f1;
  --surface: #ffffff;
  --surface-2: #faf8f5;
  --ink: #1b1a19;
  --ink-soft: #46423e;
  --muted: #8c867e;
  --line: #e8e3dc;
  --line-strong: #d9d3ca;
  --accent: #c4213f;
  --accent-ink: #9a1730;
  --accent-soft: #f7dce1;
  --accent-wash: #fbeef0;
  --ok: #2f7d5b;
  --shadow: 0 1px 2px rgba(27,26,25,.04), 0 8px 30px rgba(27,26,25,.06);
  --radius: 16px;
  --shell-pad: 24px;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Manrope', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-wrap: break-word;
}
h1, h2, h3 { font-family: 'Lora', Georgia, 'Times New Roman', serif; font-weight: 600; letter-spacing: -.01em; line-height: 1.15; margin: 0; }
a { color: var(--accent-ink); text-decoration: none; }

/* Боковые отступы учитывают вырез/скругления экрана (ландшафт на iPhone). */
.kp-shell {
  max-width: 1080px; margin: 0 auto;
  padding-left: max(var(--shell-pad), env(safe-area-inset-left));
  padding-right: max(var(--shell-pad), env(safe-area-inset-right));
}

/* ── header / tabs ── */
.kp-header {
  position: sticky; top: 0; z-index: 20;
  background: rgba(246,244,241,.82);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--line);
}
.kp-header-in { display: flex; align-items: center; gap: 20px; height: 64px; }
.kp-brand { display: flex; align-items: center; gap: 12px; font-weight: 700; letter-spacing: -.01em; }
.kp-brand-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px var(--accent-wash); }
.kp-brand-name { font-size: 15px; }
.kp-tabs { display: flex; gap: 4px; margin-left: auto; }
.kp-tab {
  appearance: none; border: 0; cursor: pointer; background: transparent;
  font: inherit; font-weight: 600; font-size: 14px; color: var(--ink-soft);
  padding: 8px 14px; border-radius: 999px; transition: all .15s ease; white-space: nowrap;
}
@media (hover: hover) { .kp-tab:hover { background: var(--surface); color: var(--ink); } }
.kp-tab.is-active { background: var(--ink); color: #fff; }

/* ── language switcher ── */
.kp-langs { display: flex; align-items: center; gap: 2px; margin-left: 14px; padding-left: 14px; border-left: 1px solid var(--line-strong); }
.kp-lang {
  appearance: none; border: 0; cursor: pointer; background: transparent;
  font: inherit; font-weight: 700; font-size: 12px; letter-spacing: .05em; color: var(--muted);
  padding: 6px 8px; border-radius: 8px; transition: all .15s ease;
}
@media (hover: hover) { .kp-lang:hover { background: var(--surface); color: var(--ink); } }
.kp-lang.is-active { background: var(--accent-wash); color: var(--accent-ink); }

/* ── hero ── */
.kp-hero { padding: 56px 0 40px; border-bottom: 1px solid var(--line); }
.kp-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--accent-ink); }
.kp-eyebrow::before { content: ''; width: 26px; height: 2px; background: var(--accent); display: inline-block; }
.kp-hero h1 { font-size: clamp(30px, 5vw, 48px); margin: 18px 0 0; max-width: 22ch; text-wrap: balance; }

/* ── generic section ── */
.kp-view { padding: 40px 0 72px; animation: kp-fade .35s ease both; }
@keyframes kp-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.kp-section-head { margin-bottom: 26px; }
.kp-section-head h2 { font-size: clamp(22px, 3.4vw, 30px); }
.kp-section-head p { color: var(--ink-soft); margin: 10px 0 0; max-width: 66ch; }
.kp-lead { display: grid; gap: 12px; margin-bottom: 30px; }
.kp-lead p { margin: 0; color: var(--ink-soft); max-width: 72ch; }

/* ── architecture layers ── */
.kp-layer { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 26px; margin-bottom: 18px; box-shadow: var(--shadow); position: relative; overflow: hidden; }
.kp-layer::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(var(--accent), var(--accent-ink)); opacity: .85; }
.kp-layer-top { display: flex; align-items: baseline; gap: 16px; margin-bottom: 6px; }
.kp-layer-idx { font-family: 'Lora', serif; font-size: 30px; color: var(--accent); line-height: 1; font-weight: 600; min-width: 46px; }
.kp-layer-top h3 { font-size: 21px; }
.kp-layer-sub { color: var(--muted); font-size: 14px; margin: 2px 0 0; padding-left: 62px; }
.kp-agents { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; margin-top: 20px; }
.kp-agent { border: 1px solid var(--line); border-radius: 12px; padding: 14px 15px; background: var(--surface-2); transition: border-color .15s ease, transform .15s ease; }
@media (hover: hover) { .kp-agent:hover { border-color: var(--line-strong); transform: translateY(-2px); } }
.kp-agent-head { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.kp-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; font-weight: 700; color: var(--accent-ink); background: var(--accent-wash); border: 1px solid var(--accent-soft); padding: 2px 7px; border-radius: 6px; }
.kp-agent-name { font-weight: 700; font-size: 14.5px; }
.kp-agent-desc { font-size: 13px; color: var(--ink-soft); line-height: 1.5; }
.kp-kind { margin-left: auto; font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.kp-kind.async { color: #9a6b12; }
.kp-kind.sync { color: #2f6d7d; }
.kp-group-title { font-size: 12.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin: 22px 0 2px; }
.kp-note { display: flex; gap: 10px; margin-top: 18px; padding: 12px 14px; background: var(--accent-wash); border: 1px solid var(--accent-soft); border-radius: 10px; font-size: 13px; color: var(--accent-ink); }
.kp-note::before { content: '!'; font-weight: 800; color: #fff; background: var(--accent); width: 18px; height: 18px; min-width: 18px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; margin-top: 1px; }

/* ── КП sections ── */
.kp-kpsec { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 24px 26px; margin-bottom: 16px; box-shadow: var(--shadow); }
.kp-kpsec-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 14px; }
.kp-kpsec-n { font-family: 'Lora', serif; font-weight: 600; color: #fff; background: var(--ink); width: 34px; height: 34px; min-width: 34px; border-radius: 9px; display: grid; place-items: center; font-size: 16px; }
.kp-kpsec-head h3 { font-size: 20px; }
.kp-kpsec p { margin: 0 0 10px; color: var(--ink-soft); }
.kp-kpsec p:last-child { margin-bottom: 0; }
.kp-ilist { list-style: none; padding: 0; margin: 6px 0; display: grid; gap: 8px; }
.kp-ilist li { position: relative; color: var(--ink-soft); font-size: 14.5px; }
.kp-ilist.plain li { padding-left: 28px; }
.kp-ilist.plain li::before { content: '—'; position: absolute; left: 0; top: 0; color: var(--muted); }
.kp-kpnote { margin: 8px 0 0; padding: 11px 14px; border-left: 3px solid var(--accent); background: var(--accent-wash); border-radius: 0 8px 8px 0; font-weight: 600; color: var(--accent-ink); font-size: 14px; }
.kp-kpsec.is-locked { background: var(--surface-2); border-style: dashed; border-color: var(--line-strong); box-shadow: none; }
.kp-kpsec.is-locked .kp-kpsec-n { background: var(--muted); }
.kp-kpsec.is-locked h3 { color: var(--muted); }
.kp-kpsec-lock { color: var(--muted); margin-left: auto; flex-shrink: 0; }
.kp-kpsec-locked-note { color: var(--muted); font-size: 13.5px; font-style: italic; }

/* ── questions ── */
.kp-qblock { margin-bottom: 30px; }
.kp-qblock-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.kp-qletter { font-family: 'Lora', serif; font-weight: 600; font-size: 18px; color: var(--accent); background: var(--accent-wash); border: 1px solid var(--accent-soft); width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; }
.kp-qblock-head h3 { font-size: 19px; }
.kp-q { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; margin-bottom: 12px; box-shadow: var(--shadow); overflow: hidden; }
.kp-q-top { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px; cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; }
@media (hover: hover) { .kp-q-top:hover { background: var(--surface-2); } }
.kp-q-text { flex: 1; }
.kp-q-code { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; color: var(--accent-ink); }
.kp-q-body { font-size: 15px; color: var(--ink); margin-top: 3px; }
.kp-q-feeds { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; color: var(--muted); }
.kp-q-feeds::before { content: '→'; color: var(--accent); font-weight: 700; }
.kp-q-count { font-size: 12px; font-weight: 700; color: var(--ink-soft); background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px; white-space: nowrap; }
.kp-q-count.has { color: var(--accent-ink); background: var(--accent-wash); border-color: var(--accent-soft); }
.kp-caret { color: var(--muted); transition: transform .2s ease; margin-top: 2px; }
.kp-q.open .kp-caret { transform: rotate(90deg); }
.kp-q-panel { border-top: 1px solid var(--line); padding: 18px 20px; background: var(--surface-2); }

.kp-answers { display: grid; gap: 10px; margin-bottom: 18px; }
.kp-answer { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
.kp-answer-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 12.5px; }
.kp-answer-name { font-weight: 700; color: var(--ink); }
.kp-answer-badge { font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 1px 7px; }
.kp-answer-date { color: var(--muted); margin-left: auto; font-size: 12px; }
.kp-answer-text { font-size: 14.5px; color: var(--ink-soft); white-space: pre-wrap; word-break: break-word; }
.kp-empty { font-size: 13.5px; color: var(--muted); font-style: italic; margin-bottom: 16px; }

.kp-form { display: grid; gap: 10px; }
.kp-textarea {
  width: 100%; font: inherit; color: var(--ink); background: var(--surface);
  border: 1px solid var(--line-strong); border-radius: 10px; padding: 11px 13px; transition: border-color .15s ease, box-shadow .15s ease;
}
.kp-textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-wash); }
.kp-textarea { resize: vertical; min-height: 84px; }
.kp-form-foot { display: flex; align-items: center; gap: 14px; }
.kp-btn {
  appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 700; font-size: 14px;
  color: #fff; background: var(--accent); padding: 11px 22px; border-radius: 10px; transition: background .15s ease, transform .05s ease;
}
@media (hover: hover) { .kp-btn:hover { background: var(--accent-ink); } }
.kp-btn:active { transform: translateY(1px); }
.kp-btn:disabled { opacity: .55; cursor: default; }
.kp-form-msg { font-size: 13px; font-weight: 600; }
.kp-form-msg.ok { color: var(--ok); }
.kp-form-msg.err { color: var(--accent); }

/* ── footer ── */
.kp-footer { border-top: 1px solid var(--line); padding: 26px 0 40px; color: var(--muted); font-size: 13px; }
.kp-footer b { color: var(--ink-soft); }

/* ═══════════════  ШАПКА: УЗКИЕ ЭКРАНЫ  ═══════════════
   Однорядной шапке нужно ~924px (бренд 215 + вкладки 510 + языки 117 + отступы).
   Ниже этого перестраиваем в два ряда, иначе контент уезжает за экран. */
@media (max-width: 940px) {
  .kp-header-in { height: auto; flex-wrap: wrap; gap: 8px 10px; padding-top: 9px; padding-bottom: 9px; }
  .kp-brand { flex: 1 1 auto; min-width: 0; gap: 9px; }
  .kp-brand-dot { flex-shrink: 0; }
  .kp-brand-name { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kp-langs { margin-left: auto; padding-left: 10px; flex-shrink: 0; }
  .kp-lang { min-height: 36px; display: inline-flex; align-items: center; }

  /* Вкладки — горизонтальная лента от края до края (компенсируем padding шелла),
     со скрытым скроллбаром и снапом. Полные подписи сохраняются. */
  .kp-tabs {
    order: 3; flex: 1 0 100%; gap: 6px;
    overflow-x: auto; overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    scrollbar-width: none; -ms-overflow-style: none;
    margin-left: calc(-1 * max(var(--shell-pad), env(safe-area-inset-left)));
    margin-right: calc(-1 * max(var(--shell-pad), env(safe-area-inset-right)));
    padding-left: max(var(--shell-pad), env(safe-area-inset-left));
    padding-right: max(var(--shell-pad), env(safe-area-inset-right));
  }
  .kp-tabs::-webkit-scrollbar { display: none; }
  .kp-tab {
    flex: 0 0 auto; scroll-snap-align: start;
    min-height: 38px; display: inline-flex; align-items: center;
  }
}

/* ═══════════════  МОБИЛЬНЫЕ  ═══════════════ */
@media (max-width: 720px) {
  :root { --shell-pad: 16px; }

  .kp-brand-dot { width: 8px; height: 8px; box-shadow: 0 0 0 3px var(--accent-wash); }
  .kp-brand-name { font-size: 13.5px; }
  .kp-lang { padding: 8px; font-size: 11.5px; }
  .kp-tab { padding: 9px 13px; font-size: 13px; }

  /* Hero */
  .kp-hero { padding: 30px 0 24px; }
  .kp-eyebrow { font-size: 11px; }
  .kp-eyebrow::before { width: 20px; }
  .kp-hero h1 { font-size: clamp(26px, 8vw, 34px); margin-top: 14px; max-width: none; }

  /* Секции */
  .kp-view { padding: 26px 0 52px; }
  .kp-section-head { margin-bottom: 20px; }
  .kp-section-head h2 { font-size: clamp(21px, 5.6vw, 26px); }
  .kp-lead { margin-bottom: 22px; }

  /* Архитектура */
  .kp-layer { padding: 18px 16px; border-radius: 14px; margin-bottom: 14px; }
  .kp-layer-top { gap: 12px; margin-bottom: 4px; }
  .kp-layer-idx { font-size: 24px; min-width: 30px; }
  .kp-layer-top h3 { font-size: 18px; }
  .kp-layer-sub { padding-left: 0; }
  .kp-agents { grid-template-columns: 1fr; gap: 10px; margin-top: 16px; }
  .kp-agent-head { align-items: flex-start; gap: 8px; }
  .kp-agent-name { flex: 1 1 auto; min-width: 0; }
  .kp-code, .kp-kind { flex-shrink: 0; }
  .kp-group-title { margin-top: 18px; }

  /* КП */
  .kp-kpsec { padding: 18px 16px; border-radius: 14px; }
  .kp-kpsec-head { gap: 10px; margin-bottom: 12px; }
  .kp-kpsec-n { width: 30px; height: 30px; min-width: 30px; font-size: 15px; border-radius: 8px; }
  .kp-kpsec-head h3 { font-size: 17.5px; }

  /* Вопросы */
  .kp-qblock { margin-bottom: 24px; }
  .kp-qblock-head { gap: 10px; }
  .kp-qletter { width: 32px; height: 32px; min-width: 32px; font-size: 16px; }
  .kp-qblock-head h3 { font-size: 17px; }
  .kp-q-top { padding: 14px; gap: 10px; }
  .kp-q-body { font-size: 14.5px; }
  .kp-q-count { font-size: 11px; padding: 2px 8px; }
  .kp-q-panel { padding: 14px; }
  .kp-answer-meta { flex-wrap: wrap; gap: 6px; }
  .kp-answer-date { margin-left: 0; }

  /* Форма: кнопка на всю ширину, палец попадает гарантированно.
     font-size 16px обязателен — иначе iOS Safari зумит страницу при фокусе. */
  .kp-textarea { min-height: 96px; font-size: 16px; }
  .kp-form-foot { flex-direction: column; align-items: stretch; gap: 10px; }
  .kp-btn { width: 100%; min-height: 46px; font-size: 15px; }
  .kp-form-msg { text-align: center; }

  .kp-footer { padding: 22px 0 max(32px, env(safe-area-inset-bottom)); }
}

/* Ландшафт телефона: экран низкий, и двухрядная липкая шапка съедает четверть
   высоты. Поджимаем её и вертикальные отступы, чтобы осталось место контенту. */
@media (max-width: 940px) and (max-height: 500px) {
  .kp-header-in { padding-top: 5px; padding-bottom: 5px; gap: 5px 10px; }
  .kp-tab { min-height: 32px; padding-top: 5px; padding-bottom: 5px; }
  .kp-lang { min-height: 30px; padding-top: 5px; padding-bottom: 5px; }
  .kp-hero { padding: 20px 0 16px; }
  .kp-hero h1 { margin-top: 10px; }
  .kp-view { padding: 18px 0 40px; }
}

/* Узкие телефоны (iPhone SE и подобные).
   Поджимаем бренд и языки так, чтобы они оставались в одном ряду:
   иначе языки уезжают на третий ряд и шапка съедает ~23% экрана. */
@media (max-width: 380px) {
  .kp-header-in { gap: 8px; }
  .kp-brand { gap: 7px; }
  .kp-brand-name { font-size: 12px; letter-spacing: -.02em; }
  .kp-langs { margin-left: auto; padding-left: 7px; gap: 0; }
  .kp-lang { padding: 8px 5px; font-size: 10.5px; letter-spacing: .02em; }
  .kp-tab { padding: 9px 11px; font-size: 12.5px; }
  .kp-layer, .kp-kpsec { padding: 16px 14px; }
}
`
