// @shared
export const wheelPageCss2 = `
  .wheel-toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 22px;
    border-radius: 100px;
    background: rgba(217,182,95,.12);
    border: 1px solid rgba(217,182,95,.4);
    color: #f0d99a;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: .3px;
    animation: toast-in .4s ease-out;
    backdrop-filter: blur(4px);
    z-index: 50;
    white-space: nowrap;
  }
  .result-state {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-top: 26px;
    animation: rise-in .7s cubic-bezier(.16,1,.3,1);
  }
  .result-prize-icon-wrap {
    position: relative;
    width: 96px;
    height: 96px;
    margin-bottom: 26px;
  }
  .result-glow {
    position: absolute;
    inset: -20%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(217,182,95,.4) 0%, rgba(217,182,95,0) 65%);
    animation: spin-glow 3.4s ease-in-out infinite;
  }
  .result-prize-icon-circle {
    position: relative;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(140deg, #f6e2a6, #c79a3f 60%, #a6802f);
    box-shadow: 0 14px 34px rgba(199,154,63,.4), inset 0 2px 5px rgba(255,255,255,.5);
    font-size: 44px;
    line-height: 1;
  }
  .result-tag {
    font-size: 12px;
    letter-spacing: 3.4px;
    text-transform: uppercase;
    color: #c79a3f;
    font-weight: 500;
    margin-bottom: 12px;
  }
  .result-title {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 600;
    font-size: clamp(40px, 12vw, 56px);
    line-height: 1;
    margin: 0 0 14px;
    color: #f4ead2;
  }
  .result-subtitle {
    font-size: 16px;
    color: #a59a83;
    margin: 0 0 22px;
  }
  .prize-card {
    width: 100%;
    padding: 22px 24px;
    border-radius: 18px;
    background: linear-gradient(160deg, rgba(217,182,95,.14), rgba(217,182,95,.04));
    border: 1px solid rgba(217,182,95,.32);
    margin-bottom: 30px;
    box-shadow: 0 16px 40px rgba(0,0,0,.4);
  }
  .prize-card-label {
    font-size: 11px;
    letter-spacing: 2.4px;
    text-transform: uppercase;
    color: #8a7d63;
    margin-bottom: 10px;
  }
  .prize-card-name {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 600;
    font-size: clamp(24px, 6.5vw, 30px);
    line-height: 1.16;
    color: #f3dd9b;
  }
  .claim-btn {
    position: relative;
    width: 100%;
    padding: 19px;
    border-radius: 100px;
    border: none;
    cursor: pointer;
    overflow: hidden;
    font-family: 'Jost', sans-serif;
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #1a1408;
    background: linear-gradient(135deg, #f6e2a6, #d9b65f 50%, #c79a3f);
    box-shadow: 0 14px 32px rgba(199,154,63,.4), inset 0 1px 2px rgba(255,255,255,.6);
  }
  .claim-btn-label {
    position: relative;
    z-index: 2;
  }
  .claim-sheen {
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
    animation: sheen 2.8s ease-in-out infinite;
    z-index: 1;
  }
  .result-hint {
    margin-top: 18px;
    font-size: 12.5px;
    color: #6e6552;
    line-height: 1.5;
  }
  @keyframes spin-glow {
    0%, 100% { opacity: .55; }
    50% { opacity: .9; }
  }
  @keyframes hub-pulse {
    0%, 100% { transform: translate(-50%,-50%) scale(1); }
    50% { transform: translate(-50%,-50%) scale(1.04); }
  }
  @keyframes pointer-nudge {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(3px); }
  }
  @keyframes confetti-fall {
    0% { opacity: 0; transform: translate3d(0,-10px,0) rotate(0deg); }
    8% { opacity: 1; }
    100% { opacity: 0; transform: translate3d(var(--dx,0), 112vh, 0) rotate(900deg); }
  }
  @keyframes rise-in {
    0% { opacity: 0; transform: translateY(22px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes toast-in {
    0% { opacity: 0; transform: translateX(-50%) translateY(10px) scale(.96); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }
  @keyframes sheen {
    0% { transform: translateX(-120%) skewX(-18deg); }
    100% { transform: translateX(220%) skewX(-18deg); }
  }
`
