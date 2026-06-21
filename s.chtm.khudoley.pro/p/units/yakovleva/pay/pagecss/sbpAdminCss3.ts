// @shared
export const sbpAdminCss3 = `
/* ── BUTTONS ── */
.ap-btn {
  padding: 0.42rem 0.8rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx);
  font-family: inherit;
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  letter-spacing: 0.03em;
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 2px,
    2px 2px,
    2px 0,
    calc(100% - 2px) 0,
    calc(100% - 2px) 2px,
    100% 2px,
    100% calc(100% - 2px),
    calc(100% - 2px) calc(100% - 2px),
    calc(100% - 2px) 100%,
    2px 100%,
    2px calc(100% - 2px),
    0 calc(100% - 2px)
  );
}
.ap-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.04) 0px,
    rgba(0, 0, 0, 0.04) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
}
.ap-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--c-red);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s ease;
}
.ap-btn:hover {
  border-color: var(--c-bdr-hi);
  background: rgba(24, 22, 28, 0.98);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
}
.ap-btn:hover::after {
  transform: scaleX(1);
}
.ap-btn:active {
  transform: translateY(0);
  box-shadow: none;
}
.ap-btn i {
  font-size: 0.62rem;
}
.ap-btn--sm {
  padding: 0.28rem 0.55rem;
  font-size: 0.68rem;
}
.ap-btn--sm i {
  font-size: 0.58rem;
}
.ap-btn--danger {
  border-color: rgba(217, 122, 138, 0.3);
  color: #ecc8cf;
  background: rgba(45, 14, 22, 0.9);
}
.ap-btn--danger::after {
  background: var(--c-alert);
}
.ap-btn--danger:hover {
  border-color: rgba(217, 122, 138, 0.5);
  background: rgba(60, 20, 30, 0.95);
}

/* ── BADGES ── */
.ap-badge {
  font-size: 0.63rem;
  padding: 0.1rem 0.4rem;
  border: 1px solid;
  font-weight: 700;
  letter-spacing: 0.06em;
  position: relative;
  z-index: 1;
  animation: ap-badge-flash 0.4s ease-out;
}
.ap-badge i {
  font-size: 0.55rem;
  margin-right: 0.1rem;
}
@keyframes ap-badge-flash {
  0% {
    opacity: 0;
    transform: scale(0.85);
  }
  50% {
    transform: scale(1.04);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.ap-badge--ok {
  color: var(--c-ok);
  border-color: rgba(106, 175, 126, 0.4);
}
.ap-badge--err {
  color: var(--c-alert);
  border-color: rgba(217, 122, 138, 0.4);
}

.ap-err {
  margin: 0.4rem 0 0;
  color: var(--c-alert);
  font-size: 0.76rem;
  position: relative;
  z-index: 1;
}
.ap-err i {
  margin-right: 0.2rem;
  font-size: 0.65rem;
}
`
