/* ===== gamma mobile layer ===== */
.gamma-mobile { display: none; }
@media (max-width: 768px) {
  .gamma-desktop { display: none !important; }
  .gamma-mobile { display: block !important; }
}
.gamma-mobile {
  /* palette (overridden per page by build-gamma.cjs from the captured theme colors) */
  --gm-accent:#e7bf6a; --gm-accent-rgb:231,191,106; --gm-accent-deep:#b98b3e;
  --gm-btn-grad:linear-gradient(45deg,#da9b49 0%,#f3e38a 99%); --gm-btn-text:#3a2a08; --gm-on-accent:#2a1f0a;
  --gm-ink:#2c2926; --gm-soft:#5d564d; --gm-heading:#2c2926;
  --gm-line:rgba(120,92,40,.22); --gm-paper:#f6f1e7; --gm-card:#fffdf8;
  --gm-shadow:rgba(60,40,10,.07); --gm-shadow-strong:rgba(60,40,10,.22);
  --gm-serif:"Bricolage Grotesque",Georgia,"Times New Roman",serif;
  --gm-sans:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
  color:var(--gm-ink); font-family:var(--gm-sans); font-size:16px; line-height:1.62;
  -webkit-font-smoothing:antialiased;
  background:radial-gradient(120% 60% at 50% 0%, rgba(var(--gm-accent-rgb),.22), transparent 60%), var(--gm-paper);
}
.gamma-mobile * { box-sizing:border-box; }
.gamma-mobile img { display:block; max-width:100%; }
.gm-wrap { width:100%; max-width:520px; margin:0 auto; padding:0 20px; }
.gm-section { padding:38px 0; }
.gm-section + .gm-section { border-top:1px solid var(--gm-line); }
.gamma-mobile h1,.gamma-mobile h2,.gamma-mobile h3 { font-family:var(--gm-serif); color:var(--gm-heading); font-weight:700; margin:0; letter-spacing:-.01em; }
.gamma-mobile h1 { font-size:34px; line-height:1.14; }
.gamma-mobile h2 { font-size:25px; line-height:1.2; }
.gamma-mobile h3 { font-size:18px; line-height:1.25; }
.gamma-mobile p { margin:0; color:var(--gm-soft); }
.gm-lead { color:var(--gm-soft); font-size:16.5px; }
.gm-em { color:var(--gm-accent-deep); font-weight:600; }
.gm-stack > * + * { margin-top:14px; }
.gm-hero { padding:30px 0 34px; text-align:center; }
.gm-logo { height:40px; width:auto; margin:0 auto 22px; }
.gm-hero h1 { font-size:36px; }
.gm-hero .gm-lead { margin:16px auto 24px; max-width:30em; }
.gm-hero-img { width:100%; height:300px; object-fit:cover; border-radius:22px; margin-top:26px; box-shadow:0 22px 50px var(--gm-shadow-strong); border:1px solid rgba(255,255,255,.5); }
.gm-btn { display:inline-block; text-decoration:none; cursor:pointer; font-family:var(--gm-sans); font-weight:700; font-size:16px; color:var(--gm-btn-text); padding:15px 26px; border-radius:999px; border:0; background:var(--gm-btn-grad); box-shadow:0 12px 26px rgba(var(--gm-accent-rgb),.42); }
.gm-btn.ghost { background:transparent; color:var(--gm-accent-deep); border:1.5px solid var(--gm-accent); box-shadow:none; }
.gm-btn.block { display:block; width:100%; text-align:center; }
.gm-btns { display:flex; flex-direction:column; gap:12px; margin-top:8px; }
.gm-card { background:var(--gm-card); border:1px solid var(--gm-line); border-radius:18px; padding:20px; box-shadow:0 10px 26px var(--gm-shadow); }
.gm-card h3 { margin-bottom:8px; }
.gm-card p { font-size:15.5px; }
.gm-stats { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.gm-stat { background:var(--gm-card); border:1px solid var(--gm-line); border-radius:16px; padding:16px; text-align:center; }
.gm-stat .num { font-family:var(--gm-serif); font-weight:700; font-size:30px; color:var(--gm-accent-deep); line-height:1; }
.gm-stat .label { margin-top:6px; font-size:13px; color:var(--gm-soft); }
.gm-mediacard { overflow:hidden; padding:0; }
.gm-mediacard img { width:100%; height:190px; object-fit:cover; }
.gm-mediacard .gm-body { padding:18px 20px 22px; }
.gm-num { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
.gm-num .n { flex:0 0 auto; width:38px; height:38px; border-radius:50%; display:grid; place-items:center; font-family:var(--gm-serif); font-weight:700; color:var(--gm-accent-deep); background:rgba(var(--gm-accent-rgb),.18); border:1px solid var(--gm-accent); font-size:18px; }
.gm-callout { background:rgba(var(--gm-accent-rgb),.28); border:1px solid var(--gm-accent); border-radius:16px; padding:18px 20px; color:var(--gm-ink); font-weight:500; }
.gm-callout.solid { background:linear-gradient(160deg, rgba(var(--gm-accent-rgb),.95), rgba(var(--gm-accent-rgb),.78)); border-color:rgba(var(--gm-accent-rgb),.55); color:var(--gm-on-accent); }
.gm-callout.green { background:rgba(120,170,110,.18); border-color:rgba(90,140,80,.5); color:#234a1e; }
.gm-callout.dark { background:linear-gradient(160deg,#2a2420,#1c1814); border-color:rgba(var(--gm-accent-rgb),.4); color:#f0e6d2; }
.gm-callout h3 { margin-bottom:8px; }
.gm-callout.dark h3 { color:#f3e38a; }
.gm-bullets { margin:12px 0 0; padding:0; list-style:none; }
.gm-bullets li { position:relative; padding-left:22px; margin-top:9px; font-size:15.5px; color:inherit; }
.gm-bullets li::before { content:""; position:absolute; left:4px; top:9px; width:8px; height:8px; border-radius:50%; background:var(--gm-accent-deep); }
.gm-step { display:flex; gap:14px; align-items:flex-start; }
.gm-step .num { flex:0 0 auto; width:44px; height:44px; border-radius:50%; display:grid; place-items:center; border:2px solid var(--gm-accent); color:var(--gm-accent-deep); font-family:var(--gm-serif); font-weight:700; font-size:19px; background:rgba(var(--gm-accent-rgb),.12); }
.gm-step h3 { margin:6px 0 4px; }
.gm-head h2 { margin-bottom:12px; }
.gm-head .gm-lead { margin-bottom:18px; }
.gm-banner { width:100%; height:240px; object-fit:cover; border-radius:18px; }
.gm-footer { padding:30px 0 44px; text-align:center; color:var(--gm-soft); font-size:13px; }
