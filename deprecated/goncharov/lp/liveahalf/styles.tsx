import { jsx } from '@app/html-jsx'

export const HeadStyles = () => (
  <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
    <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
    <script>{`
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              sage: {
                50: '#f6f7f4',
                100: '#e8ebe3',
                200: '#d4dac9',
                300: '#b5bfa5',
                400: '#96a37f',
                500: '#7a8964',
                600: '#5f6d4d',
                700: '#4b563e',
                800: '#3e4734',
                900: '#353d2e',
              },
              moss: {
                50: '#f4f6f3',
                100: '#e6ebe2',
                200: '#cdd8c6',
                300: '#a8bca0',
                400: '#7f9b76',
                500: '#5e7a57',
                600: '#4a6145',
                700: '#3d4f39',
                800: '#334130',
                900: '#2b3628',
              },
              ochre: {
                50: '#faf7f0',
                100: '#f4edda',
                200: '#e8d8b0',
                300: '#dbc080',
                400: '#cfa659',
                500: '#c2903f',
                600: '#a67333',
                700: '#88592c',
                800: '#6f4929',
                900: '#5d3d25',
              },
              slate: {
                50: '#f8f9fa',
                100: '#e9ecef',
                200: '#d3d8de',
                300: '#b0b8c1',
                400: '#8891a0',
                500: '#687083',
                600: '#53596a',
                700: '#454a57',
                800: '#3a3f4a',
                900: '#2c3038',
                950: '#1a1d23',
              },
              cream: {
                50: '#fdfcf9',
                100: '#faf6ee',
                200: '#f4ecdb',
                300: '#ecdcc1',
                400: '#e0c69f',
                500: '#d4af7d',
              },
              warm: {
                50: '#faf8f5',
                100: '#f5f0e8',
                200: '#ebe0d0',
                300: '#dccaaf',
                400: '#c9ad89',
                500: '#b89468',
              },
              bark: {
                600: '#5c4a35',
                700: '#4a3b2a',
                800: '#3d3123',
                900: '#2e2519',
              }
            },
            fontFamily: {
              display: ['Cormorant Garamond', 'Georgia', 'serif'],
              body: ['Source Sans 3', 'sans-serif'],
            }
          }
        }
      }
    `}</script>
    <style>{`
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        font-family: 'Source Sans 3', sans-serif;
        color: #2c3038;
        background: linear-gradient(to bottom, #fdfcf9 0%, #f6f7f4 100%);
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
        overflow-x: hidden;
      }

      .font-display { 
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-weight: 600;
        letter-spacing: 0.015em;
      }

      @keyframes breatheIn {
        from { 
          opacity: 0; 
          transform: translateY(20px) scale(0.98);
        }
        to { 
          opacity: 1; 
          transform: translateY(0) scale(1);
        }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes flowInLeft {
        from { 
          opacity: 0; 
          transform: translateX(-30px) scale(0.97);
        }
        to { 
          opacity: 1; 
          transform: translateX(0) scale(1);
        }
      }
      @keyframes flowInRight {
        from { 
          opacity: 0; 
          transform: translateX(30px) scale(0.97);
        }
        to { 
          opacity: 1; 
          transform: translateX(0) scale(1);
        }
      }
      @keyframes expandIn {
        from { 
          opacity: 0; 
          transform: scale(0.94);
        }
        to { 
          opacity: 1; 
          transform: scale(1);
        }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }

      .animate-on-scroll {
        opacity: 0;
        transition: none;
      }
      .animate-on-scroll.is-visible {
        animation: breatheIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
      .animate-on-scroll.is-visible.delay-1 { animation-delay: 0.1s; }
      .animate-on-scroll.is-visible.delay-2 { animation-delay: 0.2s; }
      .animate-on-scroll.is-visible.delay-3 { animation-delay: 0.3s; }
      .animate-on-scroll.is-visible.delay-4 { animation-delay: 0.4s; }
      .animate-on-scroll.is-visible.delay-5 { animation-delay: 0.5s; }
      .animate-on-scroll.is-visible.delay-6 { animation-delay: 0.6s; }
      .animate-on-scroll.is-visible.delay-7 { animation-delay: 0.7s; }

      .animate-slide-left.is-visible { animation: flowInLeft 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      .animate-slide-right.is-visible { animation: flowInRight 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      .animate-scale.is-visible { animation: expandIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

      .flow-in-right {
        opacity: 0;
        transform: translateX(30px) scale(0.97);
      }
      .flow-in-right.is-visible {
        animation: flowInRight 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }

      .cta-btn {
        background: linear-gradient(135deg, #c2903f 0%, #cfa659 50%, #c2903f 100%);
        background-size: 200% 100%;
        color: white;
        border: none;
        border-radius: 14px;
        padding: 18px 40px;
        font-size: 17px;
        font-weight: 600;
        font-family: 'Source Sans 3', sans-serif;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 6px 24px rgba(194, 144, 63, 0.3), 0 2px 8px rgba(194, 144, 63, 0.15);
        letter-spacing: 0.5px;
        position: relative;
        overflow: hidden;
      }
      .cta-btn::before {
        content: '';
        position: absolute;
        top: 0; left: -100%; width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        transition: left 0.5s;
      }
      .cta-btn:hover::before { left: 100%; }
      .cta-btn:hover {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 10px 36px rgba(194, 144, 63, 0.4), 0 4px 12px rgba(194, 144, 63, 0.2);
        background-position: 100% 0;
      }
      .cta-btn:active { transform: translateY(0); }

      .cta-btn-outline {
        background: transparent;
        color: #5f6d4d;
        border: 2px solid #96a37f;
        border-radius: 12px;
        padding: 16px 38px;
        font-size: 17px;
        font-weight: 600;
        font-family: 'Source Sans 3', sans-serif;
        cursor: pointer;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .cta-btn-outline:hover {
        background: #5f6d4d;
        color: white;
        border-color: #5f6d4d;
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(95, 109, 77, 0.25);
      }

      .card-hover {
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .card-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(46, 37, 25, 0.08);
      }

      .section-divider {
        width: 70px;
        height: 3px;
        background: linear-gradient(90deg, transparent, #7f9b76, transparent);
        margin: 0 auto;
        border-radius: 2px;
      }

      .organic-blob {
        position: absolute;
        border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
        filter: blur(60px);
        opacity: 0.08;
        animation: float 20s ease-in-out infinite;
      }

      .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(46, 37, 25, 0.5);
        backdrop-filter: blur(8px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .modal-overlay.active {
        opacity: 1;
        pointer-events: all;
      }
      .modal-content {
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 460px;
        width: 90%;
        transform: scale(0.9) translateY(20px);
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 25px 60px rgba(46, 37, 25, 0.15);
      }
      .modal-overlay.active .modal-content {
        transform: scale(1) translateY(0);
      }

      .input-field {
        width: 100%;
        padding: 14px 18px;
        border: 1.5px solid #d4dac9;
        border-radius: 10px;
        font-size: 16px;
        font-family: 'Source Sans 3', sans-serif;
        background: #fdfcf9;
        transition: all 0.3s ease;
        outline: none;
        color: #2e2519;
      }
      .input-field:focus {
        border-color: #7a8964;
        box-shadow: 0 0 0 3px rgba(122, 137, 100, 0.12);
        background: white;
      }
      .input-field::placeholder { color: #b5bfa5; }

      .energy-gradient-vitality { 
        background: linear-gradient(135deg, #e6ebe2 0%, #cdd8c6 50%, #a8bca0 100%);
      }
      .energy-gradient-transition { 
        background: linear-gradient(135deg, #f4ecdb 0%, #e8d8b0 50%, #c9ad89 100%);
      }
      .energy-gradient-depleted { 
        background: linear-gradient(135deg, #e9ecef 0%, #d3d8de 50%, #b0b8c1 100%);
      }

      .floating-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(255,255,255,0.85);
        backdrop-filter: blur(10px);
        border-radius: 100px;
        font-size: 14px;
        color: #5f6d4d;
        font-weight: 500;
        border: 1px solid rgba(180, 191, 165, 0.3);
      }

      @media (max-width: 768px) {
        .cta-btn, .cta-btn-outline {
          padding: 15px 30px;
          font-size: 16px;
          width: 100%;
          text-align: center;
        }
        .modal-content {
          padding: 28px 24px;
          margin: 16px;
        }
      }
    `}</style>
  </>
)
