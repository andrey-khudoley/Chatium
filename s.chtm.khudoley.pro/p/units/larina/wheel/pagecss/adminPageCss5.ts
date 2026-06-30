// @shared
/*
 * Админ-скоуп: модернизация общей оболочки (хедер/футер/декорации) ТОЛЬКО на страницах
 * админки — через класс .ap-admin на корне .app-layout. Компоненты Header/AppFooter общие
 * (используются и на публичной странице колеса), но там класса .ap-admin нет — их вид не
 * меняется. Селекторы .ap-admin .header* имеют большую специфичность, чем базовые .header*,
 * поэтому переопределяют их; для scoped-стилей футера и анимаций нужен !important.
 */
export const adminPageCss5 = `
/* ── HEADER ── */
.ap-admin .header {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  padding: 0.85rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.ap-admin .header::before,
.ap-admin .header::after {
  display: none;
}
.ap-admin .header-logo-link::before {
  display: none;
}
.ap-admin .header-logo {
  filter: none;
  height: 2.1rem;
}
.ap-admin .header-logo-and-title:hover .header-logo {
  filter: none;
  animation: none !important;
}
.ap-admin .header-title {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight: 500;
  font-size: 1.05rem;
  letter-spacing: 0;
  text-shadow: none;
  color: #ececf1;
}
.ap-admin .header-title::after {
  display: none;
}
.ap-admin .header-logo-and-title:hover .header-title {
  filter: none;
  animation: none !important;
}

/* ── HEADER CLOCK ── */
.ap-admin .header-clock {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: #9b9ba6;
  text-shadow: none;
  background: #0e0e11;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  box-shadow: none;
  clip-path: none;
  image-rendering: auto;
  -webkit-font-smoothing: antialiased;
  padding: 0.32rem 0.7rem;
}
.ap-admin .header-clock:hover {
  color: #ececf1;
  background: #16161a;
  border-color: rgba(255, 255, 255, 0.13);
  text-shadow: none;
}
.ap-admin .clock-time {
  font-family: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
}

/* ── HEADER ACTION BUTTONS ── */
.ap-admin .header-action-btn {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 8px;
  background: #16161a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
  clip-path: none;
  color: #c9c9d2;
  font-size: 0.85rem;
}
.ap-admin .header-action-btn::before,
.ap-admin .header-action-btn::after {
  display: none;
}
.ap-admin .header-action-btn:hover {
  background: #232329;
  border-color: rgba(255, 255, 255, 0.2);
  transform: none;
  box-shadow: none;
  color: #fff;
}
.ap-admin .header-action-btn:active {
  transform: scale(0.97);
  box-shadow: none;
}

/* ── FOOTER (scoped-стили компонента → !important) ── */
.ap-admin .app-footer {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
  padding: 1rem 0;
}
.ap-admin .app-footer::before,
.ap-admin .app-footer::after {
  display: none !important;
}
.ap-admin .footer-content {
  color: #65656f !important;
  letter-spacing: 0 !important;
  font-size: 0.8rem;
}
.ap-admin .footer-left,
.ap-admin .footer-center {
  color: #65656f !important;
}
.ap-admin .footer-link {
  color: #9b9ba6 !important;
}
.ap-admin .footer-left:hover,
.ap-admin .footer-center:hover,
.ap-admin .footer-link:hover {
  color: #ececf1 !important;
  animation: none !important;
  text-shadow: none !important;
}
.ap-admin .footer-heart {
  color: #e24b58;
}
`
