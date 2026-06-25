export const shellCss = `
/* === LAYOUT SHELL === */
[data-role=appbg]{position:fixed;inset:0;z-index:-1;pointer-events:none;background-color:var(--bg);
  background-image:linear-gradient(rgba(180,200,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(180,200,255,0.035) 1px,transparent 1px);
  background-size:34px 34px;}
[data-role=appbg]::after{content:'';position:absolute;inset:0;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity:0.045;mix-blend-mode:overlay;}
[data-role=appbg]::before{content:'';position:absolute;inset:0;
  background-image:radial-gradient(820px 480px at 80% -6%, var(--accent-soft, rgba(247,78,83,0.16)), transparent 58%),
    radial-gradient(680px 560px at 4% 106%, rgba(120,150,255,0.06), transparent 60%);}

/* статусная плитка с HUD-углами и hover */
.statcard{transition:border-color .16s,transform .16s,box-shadow .16s;will-change:transform;}
.statcard:hover{border-color:var(--accent-line) !important;transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.30);}

/* кликабельная карточка-модуль */
.liftcard{transition:border-color .16s,transform .16s,box-shadow .16s;}
.liftcard:hover{border-color:var(--accent-line) !important;transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.26);}

/* скроллбар */
::-webkit-scrollbar{width:10px;height:10px;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.10);border:3px solid transparent;background-clip:padding-box;border-radius:3px;}
::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.20);background-clip:padding-box;}
::-webkit-scrollbar-track{background:transparent;}
input::placeholder{color:rgba(236,238,243,0.30);}
::selection{background:rgba(225,29,72,0.30);color:#fff;}
`
