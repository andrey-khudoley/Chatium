// Глобальный CSS дизайна FLOW (BPM Терминал).
// Шрифты Manrope + JetBrains Mono подключаются <link>'ом в роуте (index.tsx).
// Здесь — базовые сбросы, скроллбар, плейсхолдеры, выделение, keyframes, hover/focus-утилиты
// (замена style-hover/style-focus исходного фреймворка x-dc) и адаптив ≤880px по data-role.
export const flowCss = `
  *{box-sizing:border-box;}
  html,body{margin:0;height:100%;background:#0E1014;}
  body{font-family:'Manrope',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:10px;height:10px;}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.10);border:3px solid transparent;background-clip:padding-box;border-radius:8px;}
  ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.20);background-clip:padding-box;}
  ::-webkit-scrollbar-track{background:transparent;}
  input::placeholder{color:rgba(236,238,243,0.30);}
  ::selection{background:rgba(225,29,72,0.28);color:#fff;}
  ::-moz-selection{background:rgba(225,29,72,0.28);color:#fff;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
  @keyframes softpulse{0%,100%{opacity:1;}50%{opacity:.4;}}

  /* hover/focus утилиты — заменяют style-hover/style-focus из исходного дизайна */
  .fl-hov-surface2:hover{background:var(--surface-2);}
  .fl-hov-line2:hover{border-color:var(--line-2);}
  .fl-hov-accent:hover{border-color:var(--accent-line);background:var(--accent-soft);}
  .fl-hov-accent-line:hover{border-color:var(--accent-line);}
  .fl-hov-accent-text:hover{color:var(--accent);border-color:var(--accent-line);}
  .fl-hov-bright:hover{filter:brightness(1.08);}
  .fl-hov-bright15:hover{filter:brightness(1.15);}
  .fl-hov-fg:hover{color:var(--fg);}
  .fl-hov-fg2:hover{color:var(--fg2);}
  .fl-row-hover:hover{background:var(--surface-2);}
  .fl-focus:focus{border-color:var(--accent-line);}
  .fl-focus-within:focus-within{border-color:var(--accent-line);}

  @media(max-width:880px){
    [data-role=sidebar]{width:60px !important;}
    [data-role=navlabel]{display:none !important;}
    [data-role=brandtext]{display:none !important;}
    [data-role=metrics]{grid-template-columns:1fr 1fr !important;}
    [data-role=homegrid]{grid-template-columns:1fr !important;}
    [data-role=dlg]{grid-template-columns:220px 1fr !important;}
    [data-role=gtd]{grid-template-columns:1fr !important;}
    [data-role=topsearch]{display:none !important;}
  }
`
