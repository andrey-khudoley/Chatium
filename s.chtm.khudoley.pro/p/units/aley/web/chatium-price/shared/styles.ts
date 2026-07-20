/**
 * CSS прайс-листа chatium-price.
 *
 * Дизайн снят с chatium.ru/pricing: шрифт Inter, белые карточки со скруглением
 * и мягкой тенью, зелёные галочки в списке фич. Акцентная карточка «Макс»
 * получает градиентное свечение (как в макете). Всё инлайнится в <style> на
 * сервере — внешних зависимостей, кроме шрифта Inter, нет.
 */
export const SITE_CSS = `
:root {
  --ink: #0f172a;
  --ink-soft: #374151;
  --muted: #6b7280;
  --muted-2: #9ca3af;
  --line: rgba(15, 23, 42, 0.08);
  --card-bg: #ffffff;
  --page-bg: #ffffff;
  --primary: #1e1b4b;
  --primary-hover: #2a2660;
  --secondary-bg: #f3f4f6;
  --secondary-bg-hover: #e5e7eb;
  --secondary-text: #4b5563;
  --check: #22c55e;
  --accent: #0066cc;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--page-bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 56px 20px 24px;
}

/* --- Заголовок --- */
.head {
  text-align: center;
  margin-bottom: 40px;
}
.promo {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 7px 16px 7px 14px;
  border-radius: 999px;
  background: rgba(0, 102, 204, 0.08);
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 20px;
}
.promo__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 0 rgba(0, 102, 204, 0.45);
  animation: promo-pulse 2s ease-out infinite;
}
@keyframes promo-pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 102, 204, 0.45); }
  70% { box-shadow: 0 0 0 7px rgba(0, 102, 204, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 102, 204, 0); }
}
.head__title {
  font-size: 34px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 10px;
  letter-spacing: -0.01em;
}
.head__subtitle {
  font-size: 16px;
  font-weight: 400;
  color: var(--muted);
  margin: 0;
}
.head__cta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 26px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 26px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.btn--primary {
  background: var(--primary);
  color: #ffffff;
}
.btn--primary:hover {
  background: var(--primary-hover);
}
.btn--ghost {
  background: #ffffff;
  color: var(--primary);
  border-color: rgba(30, 27, 75, 0.22);
}
.btn--ghost:hover {
  border-color: var(--primary);
  background: #f8f8fc;
}

/* --- Сетка карточек --- */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  align-items: start;
}

/* --- Карточка --- */
.card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 28px 26px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}
.card > * {
  position: relative;
  z-index: 1;
}
.card--featured {
  border-color: rgba(99, 102, 241, 0.25);
  box-shadow: 0 12px 32px rgba(79, 70, 229, 0.12);
}
/* Градиентное свечение выделенной карточки */
.card--featured::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: -50px;
  right: -50px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle at center, rgba(56, 189, 248, 0.40), rgba(56, 189, 248, 0) 68%);
  pointer-events: none;
}
.card--featured::after {
  content: '';
  position: absolute;
  z-index: 0;
  bottom: -70px;
  left: -40px;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle at center, rgba(139, 92, 246, 0.22), rgba(139, 92, 246, 0) 70%);
  pointer-events: none;
}

.card__name {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 22px;
}

/* --- Цена --- */
.price {
  margin-bottom: 22px;
}
.price__now {
  font-size: 44px;
  font-weight: 800;
  color: var(--ink);
  line-height: 1.05;
  letter-spacing: -0.02em;
}
.price__old {
  display: block;
  margin-top: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--muted-2);
  text-decoration: line-through;
}
.price__period {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

/* --- Кнопка --- */
.cta {
  display: block;
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
  margin-bottom: 24px;
}
.cta--primary {
  background: var(--primary);
  color: #ffffff;
}
.cta--primary:hover {
  background: var(--primary-hover);
}
.cta--secondary {
  background: var(--secondary-bg);
  color: var(--secondary-text);
}
.cta--secondary:hover {
  background: var(--secondary-bg-hover);
}

/* --- Список фич --- */
.features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 13px;
}
.features li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 15px;
  line-height: 1.4;
  color: var(--ink-soft);
}
.features__check {
  flex-shrink: 0;
  color: var(--check);
  font-weight: 700;
  margin-top: 1px;
}

/* --- Футер --- */
.foot {
  max-width: 1200px;
  margin: 56px auto 0;
  padding: 32px 20px 48px;
  border-top: 1px solid #eef0f3;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}
.foot__copy {
  margin: 0;
  color: var(--muted-2);
}

/* --- Адаптив --- */
@media (max-width: 1080px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 620px) {
  .grid { grid-template-columns: 1fr; }
  .wrap { padding: 36px 16px 16px; }
  .head__title { font-size: 28px; }
  .price__now { font-size: 40px; }
}
`
