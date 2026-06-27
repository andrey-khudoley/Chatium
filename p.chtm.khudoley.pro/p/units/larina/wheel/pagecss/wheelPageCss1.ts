// @shared
export const wheelPageCss1 = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    font-family: 'Jost', sans-serif;
    background: radial-gradient(120% 80% at 50% -8%, #221a10 0%, #120d08 42%, #0a0807 78%);
    color: #e9e2d4;
    min-height: 100vh;
  }
  :root {
    --gold: #c9a24a;
    --gold-light: #f3dd9b;
    --gold-mid: #d9b65f;
    --bg-dark: #0a0807;
    --text: #e9e2d4;
    --text-muted: #a59a83;
  }
  .wheel-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100svh;
    padding: 2rem 1rem 3rem;
    gap: 1.25rem;
  }
  .logo-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-bottom: 0.25rem;
  }
  .logo-circle {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(140deg, #f3dd9b, #c79a3f);
    box-shadow: 0 4px 18px rgba(199,154,63,.35);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1a1408;
    letter-spacing: .5px;
  }
  .logo-subtitle {
    font-size: 0.6875rem;
    letter-spacing: 3.4px;
    text-transform: uppercase;
    color: #9c9078;
    font-weight: 400;
  }
  .wheel-title {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 600;
    font-size: clamp(34px, 9vw, 46px);
    line-height: 1.04;
    text-align: center;
    color: #f2e7cf;
    margin: 0;
  }
  .wheel-subtitle {
    text-align: center;
    font-size: 15px;
    line-height: 1.5;
    color: #a59a83;
    margin: 0;
    max-width: 300px;
  }
  .wheel-outer {
    position: relative;
    width: min(82vw, 358px);
    aspect-ratio: 1;
    margin-bottom: 0.5rem;
  }
  .wheel-glow {
    position: absolute;
    inset: -16%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(217,182,95,.30) 0%, rgba(217,182,95,0) 62%);
    animation: spin-glow 4.6s ease-in-out infinite;
    z-index: 0;
    pointer-events: none;
  }
  .pointer-wrap {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 8;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,.5));
    animation: pointer-nudge 2.4s ease-in-out infinite;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .pointer-triangle {
    width: 0;
    height: 0;
    border-left: 15px solid transparent;
    border-right: 15px solid transparent;
    border-top: 26px solid #f3dd9b;
  }
  .pointer-dot {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: linear-gradient(140deg, #f6e2a6, #c79a3f);
    box-shadow: inset 0 1px 2px rgba(255,255,255,.6);
    margin-top: -8px;
  }
  .wheel-rim {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: linear-gradient(150deg, #f3dd9b, #b8923f 46%, #8a6a2c 70%, #e8c87f);
    padding: 9px;
    box-shadow: 0 22px 50px rgba(0,0,0,.6), inset 0 2px 6px rgba(255,255,255,.45), inset 0 -3px 8px rgba(0,0,0,.4);
    z-index: 1;
  }
  .wheel-inner {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #0d0a06;
    overflow: hidden;
    box-shadow: inset 0 0 0 3px rgba(20,14,7,.9);
  }
  .wheel-face {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(from -30deg, #c9a24a 0deg 60deg, #14100a 60deg 120deg, #c9a24a 120deg 180deg, #14100a 180deg 240deg, #c9a24a 240deg 300deg, #14100a 300deg 360deg);
  }
  .wheel-dividers {
    position: absolute;
    inset: 0;
    border-radius: 50%;
  }
  .wheel-divider {
    position: absolute;
    left: 50%;
    top: 0;
    width: 1.5px;
    height: 50%;
    background: rgba(232,205,134,.55);
    transform-origin: bottom center;
  }
  .wheel-segment {
    position: absolute;
    inset: 0;
  }
  .seg-content {
    position: absolute;
    top: 8.5%;
    left: 50%;
    width: 78px;
    transform: translateX(-50%);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  .seg-icon {
    font-size: 15px;
    line-height: 1;
    opacity: .9;
  }
  .seg-label {
    font-family: 'Jost', sans-serif;
    font-weight: 500;
    font-size: 12px;
    line-height: 1.18;
    letter-spacing: .2px;
    white-space: pre-line;
  }
  .wheel-rim-dot {
    position: absolute;
    inset: 3%;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px rgba(232,205,134,.35);
    pointer-events: none;
  }
  .wheel-hub {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    width: 27%;
    height: 27%;
    border-radius: 50%;
    border: 3px solid #0d0a06;
    cursor: pointer;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    background: linear-gradient(140deg, #f6e2a6, #c79a3f 60%, #a6802f);
    box-shadow: 0 6px 16px rgba(0,0,0,.5), inset 0 2px 4px rgba(255,255,255,.55), inset 0 -3px 6px rgba(0,0,0,.35);
    z-index: 5;
    animation: hub-pulse 2.6s ease-in-out infinite;
  }
  .wheel-hub:disabled {
    cursor: default;
    animation: none;
    opacity: 0.75;
  }
  .hub-arrow {
    font-size: clamp(14px, 4vw, 18px);
    line-height: 1;
    color: #1a1408;
  }
  .hub-label {
    font-family: 'Jost', sans-serif;
    font-weight: 600;
    font-size: clamp(9px, 2.4vw, 11px);
    letter-spacing: .8px;
    text-transform: uppercase;
    color: #1a1408;
  }
  .spin-btn {
    position: relative;
    overflow: hidden;
    margin-top: 4px;
    width: 100%;
    max-width: 320px;
    padding: 19px 24px;
    border-radius: 100px;
    border: none;
    cursor: pointer;
    font-family: 'Jost', sans-serif;
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: #1a1408;
    background: linear-gradient(135deg, #f6e2a6, #d9b65f 50%, #c79a3f);
    box-shadow: 0 14px 34px rgba(199,154,63,.42), inset 0 1px 2px rgba(255,255,255,.6);
    transition: opacity .3s, transform .15s;
  }
  .spin-btn:disabled {
    cursor: default;
    opacity: 0.55;
  }
  .btn-sheen {
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent);
    animation: sheen 2.6s ease-in-out infinite;
    z-index: 1;
  }
  .btn-label {
    position: relative;
    z-index: 2;
  }
  .spin-notice {
    font-size: 11.5px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #6e6552;
    margin: 0;
  }
`
