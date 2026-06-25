export const animCss = `
/* === АНИМАЦИИ === */
@keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
@keyframes softpulse{0%,100%{opacity:1;}50%{opacity:.4;}}
@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}

.anim-fadein{animation:fadeUp .3s ease;}
.anim-pulse{animation:softpulse 2.2s infinite;}

/* адаптивность */
@media(max-width:880px){
  [data-role=sidebar]{position:fixed;top:0;left:0;bottom:0;z-index:60;width:266px !important;
    transform:translateX(-100%);transition:transform .26s cubic-bezier(.4,0,.2,1);box-shadow:24px 0 64px rgba(0,0,0,.55);}
  [data-role=sidebar][data-open="true"]{transform:translateX(0);}
  [data-role=backdrop]{position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.5);backdrop-filter:blur(1px);animation:fadeUp .18s ease;}
  [data-role=backdrop][data-open="true"]{display:block !important;}
  [data-role=menubtn]{display:flex !important;}
  [data-role=metrics]{grid-template-columns:1fr 1fr !important;}
  [data-role=homegrid]{grid-template-columns:1fr !important;}
  [data-role=dlg]{grid-template-columns:1fr !important;grid-template-rows:minmax(128px,32vh) 1fr !important;}
  [data-role=threadlist]{border-right:none !important;border-bottom:1px solid var(--line) !important;}
  [data-role=gtd]{grid-template-columns:1fr !important;}
  [data-role=topsearch]{display:none !important;}
}
@media(max-width:560px){
  [data-role=metrics]{grid-template-columns:1fr !important;}
  [data-role=topbar]{padding:0 14px !important;gap:10px !important;}
  [data-role=screenpad]{padding:18px 16px !important;}
  [data-role=tasktoolbar]{padding:13px 16px !important;}
  [data-role=tablepad]{padding:16px 14px !important;}
  [data-role=boardpad]{padding:16px 16px !important;}
  [data-role=herorow]{flex-direction:column;align-items:flex-start;gap:16px;}
  [data-role=herohud]{width:100%;justify-content:space-between;}
}
`
