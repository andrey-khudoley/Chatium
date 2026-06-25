export const bootCss = `
:root {
  --bg: #0E1422;
  --surface: #141B2D;
  --surface-2: #1A2238;
  --elevated: #222C44;
  --line: rgba(180,200,255,0.10);
  --line-2: rgba(180,200,255,0.20);
  --fg: #EBF0FF;
  --fg2: rgba(235,240,255,0.62);
  --fg3: rgba(235,240,255,0.40);
  --accent: #F74E53;
  --accent-fg: #ffffff;
  --accent-soft: rgba(247,78,83,0.16);
  --accent-line: rgba(247,78,83,0.42);
  --ok: #34D399;
  --warn: #E0A042;
  --pad: 18px;
  --base: 13.5px;
}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;background:var(--bg);color:var(--fg);font-family:'Inter','Space Grotesk',system-ui,sans-serif;font-size:var(--base);-webkit-font-smoothing:antialiased;}
`
