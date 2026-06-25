export const decoCss = `
/* === ДЕКОРАТИВНАЯ СИСТЕМА === */
[data-deco]{position:relative;}
[data-deco] > *{position:relative;z-index:1;}

/* акцентная сетка, маска верхний-правый угол */
[data-deco~=grid]::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background-image:linear-gradient(var(--accent-soft) 1px,transparent 1px),linear-gradient(90deg,var(--accent-soft) 1px,transparent 1px);
  background-size:58px 58px;background-position:-1px -1px;opacity:.8;
  -webkit-mask-image:radial-gradient(130% 130% at 92% 4%,#000,transparent 60%);mask-image:radial-gradient(130% 130% at 92% 4%,#000,transparent 60%);}

/* нейтральная сетка, маска слева */
[data-deco~=gridL]::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:26px 26px;background-position:-1px -1px;opacity:.9;
  -webkit-mask-image:linear-gradient(90deg,#000,transparent 42%);mask-image:linear-gradient(90deg,#000,transparent 42%);}

/* точечная сетка снизу */
[data-deco~=dots]::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background-image:radial-gradient(var(--line-2) 1px,transparent 1.5px);background-size:16px 16px;opacity:.45;
  -webkit-mask-image:linear-gradient(180deg,transparent 35%,#000);mask-image:linear-gradient(180deg,transparent 35%,#000);}

/* угловые скобки-маркеры (HUD) */
[data-deco~=corner]::after{content:'';position:absolute;left:0;top:0;width:14px;height:14px;
  border-top:1.5px solid var(--accent);border-left:1.5px solid var(--accent);opacity:.6;pointer-events:none;z-index:3;}
[data-deco~=corner2]::before{content:'';position:absolute;right:0;bottom:0;width:14px;height:14px;
  border-bottom:1.5px solid var(--line-2);border-right:1.5px solid var(--line-2);opacity:.85;pointer-events:none;z-index:3;}

/* верхняя «сканлиния»-метка */
[data-deco~=scan]::after{content:'';position:absolute;left:0;top:0;height:2px;width:34px;background:var(--accent);opacity:.7;pointer-events:none;z-index:3;}

/* моно-лейбл секции */
.deco-label{display:flex;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--fg3);}
.deco-label > .n{color:var(--accent);}
.deco-label > .r{width:22px;height:1px;background:var(--line-2);flex:none;}

/* вертикальный акцент-бар слева от заголовка */
.deco-rail{width:3px;height:15px;border-radius:2px;background:var(--accent);flex:none;}
.deco-rail > i{display:none;}

/* карточка с гаттер-полем слева */
.gcard{position:relative;overflow:hidden;padding-left:calc(40px + var(--pad)) !important;}
.gcard > .gut{position:absolute;left:0;top:0;bottom:0;width:40px;border-right:1px solid var(--line);background:var(--surface-2);
  background-image:repeating-linear-gradient(0deg,transparent 0 13px,var(--line) 13px 14px);
  display:flex;justify-content:center;padding-top:16px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:var(--accent);}

/* крупное числовое значение */
.deco-val{font-family:'Space Grotesk',sans-serif;font-weight:600;line-height:.85;letter-spacing:-.02em;font-variant-numeric:tabular-nums;}

/* подпись-сноска под значением */
.deco-foot{border-top:1px dashed var(--line);padding-top:9px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.02em;line-height:1.4;}
`
