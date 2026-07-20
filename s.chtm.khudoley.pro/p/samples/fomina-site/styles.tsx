import { jsx } from '@app/html-jsx'

export function Styles() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
      <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
      <script>{`
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              'warm': {
                50: '#fdf8f0',
                100: '#f5ebe0',
                200: '#e6d5c3',
                300: '#d4b896',
                400: '#c4a070',
                500: '#b08050',
                600: '#8b6340',
                700: '#6b4c30',
                800: '#4a3520',
                900: '#2d1f12',
                950: '#1a1008',
              },
              'cream': '#f5ebe0',
              'ivory': '#fdf8f0',
              'charcoal': '#1a1a1a',
              'graphite': '#2d2d2d',
              'amber': '#c4915e',
              'gold': '#d4a574',
            },
            fontFamily: {
              'display': ['Cormorant Garamond', 'Georgia', 'serif'],
              'body': ['Inter', 'system-ui', 'sans-serif'],
            }
          }
        }
      }
    `}</script>
      <style>{`
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { 
        font-family: 'Inter', system-ui, sans-serif;
        background: #1a1008;
        color: #f5ebe0;
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .font-display { 
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-display: swap;
        line-height: 1.15;
      }
      .font-body {
        font-family: 'Inter', system-ui, sans-serif;
        font-display: swap;
      }

      /* ── Preloader ── */
      .preloader {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: #1a1008;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.6s;
      }
      .preloader.is-hidden {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }
      .preloader-initials {
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: 4rem;
        font-weight: 500;
        letter-spacing: 0.15em;
        background: linear-gradient(135deg, #d4a574, #c4915e, #e6d5c3);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: preloaderPulse 1.4s ease-in-out infinite;
      }
      .preloader-line {
        position: absolute;
        bottom: 45%;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(196,145,94,0.5), transparent);
        animation: preloaderLineGrow 1.2s ease-out forwards;
      }
      @keyframes preloaderPulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      @keyframes preloaderLineGrow {
        from { width: 0; opacity: 0; }
        to { width: 60px; opacity: 1; }
      }

      /* ── Base animations ── */
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(40px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-60px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.92); }
        to { opacity: 1; transform: scale(1); }
      }

      .animate-fade-up { animation: fadeInUp 0.8s ease-out forwards; }
      .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
      .animate-slide-left { animation: slideInLeft 0.8s ease-out forwards; }
      .animate-scale-in { animation: scaleIn 0.6s ease-out forwards; }

      .delay-100 { animation-delay: 0.1s; opacity: 0; }
      .delay-200 { animation-delay: 0.2s; opacity: 0; }
      .delay-300 { animation-delay: 0.3s; opacity: 0; }
      .delay-400 { animation-delay: 0.4s; opacity: 0; }
      .delay-500 { animation-delay: 0.5s; opacity: 0; }
      .delay-600 { animation-delay: 0.6s; opacity: 0; }
      .delay-700 { animation-delay: 0.7s; opacity: 0; }

      /* ── Scroll-triggered entrance animations ── */
      .reveal {
        opacity: 0;
        transform: translateY(32px);
        transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
                    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .reveal.is-visible {
        opacity: 1;
        transform: translateY(0);
      }
      .reveal-delay-1 { transition-delay: 0.08s; }
      .reveal-delay-2 { transition-delay: 0.16s; }
      .reveal-delay-3 { transition-delay: 0.24s; }
      .reveal-delay-4 { transition-delay: 0.32s; }
      .reveal-delay-5 { transition-delay: 0.40s; }
      .reveal-delay-6 { transition-delay: 0.48s; }

      /* ── Grain overlay ── */
      .grain-overlay {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none;
        z-index: 9999;
        opacity: 0.03;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
      }

      /* ── Gradients ── */
      .hero-gradient {
        background: linear-gradient(135deg, #1a1008 0%, #2d1f12 30%, #1a1008 60%, #0d0a06 100%);
      }
      .text-gradient {
        background: linear-gradient(135deg, #d4a574, #c4915e, #e6d5c3);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* ── Glass cards — improved contrast ── */
      .card-glass {
        background: rgba(45, 31, 18, 0.55);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(196, 145, 94, 0.18);
        box-shadow: 0 2px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(196,145,94,0.06);
        transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s cubic-bezier(0.22,1,0.36,1);
      }
      .card-glass:hover {
        border-color: rgba(196, 145, 94, 0.32);
        box-shadow: 0 8px 40px rgba(196,145,94,0.08), 0 2px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(196,145,94,0.1);
      }

      /* ── Divider ── */
      .divider-line {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(196, 145, 94, 0.35), transparent);
      }

      /* ── Hover lift (cards) ── */
      .hover-lift {
        transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
                    box-shadow 0.4s ease,
                    border-color 0.4s ease;
      }
      .hover-lift:hover {
        transform: translateY(-5px);
        box-shadow: 0 24px 64px rgba(196, 145, 94, 0.1), 0 4px 16px rgba(0,0,0,0.2);
      }

      /* ── Photo frame ── */
      .photo-frame {
        position: relative;
      }
      .photo-frame::before {
        content: '';
        position: absolute;
        top: -8px; left: -8px;
        right: 8px; bottom: 8px;
        border: 1px solid rgba(196, 145, 94, 0.3);
        z-index: 0;
        transition: border-color 0.4s ease;
      }
      .photo-frame:hover::before {
        border-color: rgba(196, 145, 94, 0.5);
      }

      /* ── Section numbers ── */
      .section-number {
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: 8rem;
        font-weight: 300;
        line-height: 1;
        color: rgba(196, 145, 94, 0.06);
        position: absolute;
        top: -2rem;
        left: -1rem;
        user-select: none;
      }

      /* ── CTA Buttons — premium hover ── */
      .btn-primary {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 1rem 2.5rem;
        background: rgba(196,145,94,0.9);
        color: #1a1008;
        font-family: 'Inter', system-ui, sans-serif;
        font-weight: 600;
        font-size: 0.875rem;
        letter-spacing: 0.04em;
        border-radius: 2px;
        transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
        overflow: hidden;
      }
      .btn-primary::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
        opacity: 0;
        transition: opacity 0.35s ease;
      }
      .btn-primary:hover {
        background: #c4915e;
        box-shadow: 0 8px 32px rgba(196,145,94,0.25), 0 0 0 1px rgba(196,145,94,0.3);
        transform: translateY(-1px);
      }
      .btn-primary:hover::before {
        opacity: 1;
      }

      .btn-outline {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 1rem 2.5rem;
        border: 1px solid rgba(196,145,94,0.3);
        color: #e6d5c3;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.875rem;
        letter-spacing: 0.04em;
        border-radius: 2px;
        transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
      }
      .btn-outline:hover {
        border-color: rgba(196,145,94,0.6);
        background: rgba(196,145,94,0.06);
        box-shadow: 0 4px 24px rgba(196,145,94,0.06);
        transform: translateY(-1px);
      }

      /* ── Navbar ── */
      .navbar {
        border-bottom: 1px solid transparent;
        transition: background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease;
      }
      .navbar.is-scrolled {
        background: rgba(26, 16, 8, 0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom-color: rgba(74, 53, 32, 0.25);
      }

      /* ── Service card icon hover ── */
      .service-icon-wrap {
        transition: background 0.35s ease, box-shadow 0.35s ease;
      }
      .group:hover .service-icon-wrap {
        background: rgba(196,145,94,0.18);
        box-shadow: 0 0 20px rgba(196,145,94,0.1);
      }

      /* ── Responsive ── */
      @media (max-width: 768px) {
        .section-number { font-size: 5rem; top: -1rem; left: -0.5rem; }
      }
      @media (min-width: 2000px) {
        html { font-size: 18px; }
      }
      @media (min-width: 2560px) {
        html { font-size: 20px; }
      }
    `}</style>
    </>
  )
}
