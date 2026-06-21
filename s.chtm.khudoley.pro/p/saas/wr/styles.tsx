import { jsx } from '@app/html-jsx'

export const headContent = (
  <>
    <script src="/s/metric/clarity.js"></script>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
      rel="stylesheet"
    />
    <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
    <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"></script>
    <script>{`
      tailwind.config = {
        theme: {
          screens: {
            'xs': '400px',
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px',
          },
          extend: {
            colors: {
              primary: '#f8005b',
              'primary-light': '#ff3d7f',
              'primary-dark': '#c7004a',
              secondary: '#6366f1',
              accent: '#06b6d4',
              dark: 'var(--wr-bg)',
              'dark-lighter': 'var(--wr-bg-lighter)',
              'dark-card': 'var(--wr-bg-card)',
              light: 'var(--wr-text-primary)',
              surface: 'var(--wr-surface)',
            },
            fontFamily: {
              sans: ['Inter', 'sans-serif'],
            },
            backgroundImage: {
              'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
              'hero-pattern': 'linear-gradient(135deg, rgba(248, 0, 91, 0.15) 0%, rgba(99, 102, 241, 0.1) 50%, rgba(6, 182, 212, 0.1) 100%)',
            },
            animation: {
              'float': 'float 6s ease-in-out infinite',
              'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
              'gradient-x': 'gradient-x 3s ease infinite',
            },
            keyframes: {
              float: {
                '0%, 100%': { transform: 'translateY(0px)' },
                '50%': { transform: 'translateY(-10px)' },
              },
              'pulse-glow': {
                '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(248, 0, 91, 0.4)' },
                '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(248, 0, 91, 0.6)' },
              },
              'gradient-x': {
                '0%, 100%': { backgroundPosition: '0% 50%' },
                '50%': { backgroundPosition: '100% 50%' },
              },
            }
          }
        }
      }
    `}</script>
    <script>{`
      (function() {
        var t = null;
        try { t = localStorage.getItem('webinar-room-theme'); } catch(e) {}
        if (t !== 'light' && t !== 'dark') {
          t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
        }
        var cl = document.documentElement.classList;
        if (t === 'light') { cl.add('theme-light'); cl.remove('theme-dark'); }
        else { cl.add('theme-dark'); cl.remove('theme-light'); }
      })();
    `}</script>
    <style>{`
      /* ===== Theme CSS Variables ===== */
      :root { color-scheme: light dark; }
      .theme-dark {
        --wr-primary: #f8005b;
        --wr-primary-hover: #ff3d7f;
        --wr-bg: #0a0a0a;
        --wr-bg-lighter: #18181c;
        --wr-bg-card: #1c1c21;
        --wr-surface: #232328;
        --wr-text-primary: #fafafa;
        --wr-text-secondary: rgba(255, 255, 255, 0.7);
        --wr-text-tertiary: rgba(255, 255, 255, 0.4);
        --wr-text-muted: rgba(255, 255, 255, 0.25);
        --wr-border: rgba(255, 255, 255, 0.08);
        --wr-border-light: rgba(255, 255, 255, 0.05);
        --wr-border-hover: rgba(255, 255, 255, 0.15);
        --wr-glass-bg: rgba(28, 28, 33, 0.25);
        --wr-glass-border: rgba(255, 255, 255, 0.08);
        --wr-glass-toast-bg: rgba(28, 28, 33, 0.85);
        --wr-glass-light-bg: rgba(255, 255, 255, 0.03);
        --wr-glass-light-border: rgba(255, 255, 255, 0.06);
        --wr-input-bg: rgba(255, 255, 255, 0.05);
        --wr-input-border: rgba(255, 255, 255, 0.1);
        --wr-input-focus-bg: rgba(255, 255, 255, 0.08);
        --wr-hover-bg: rgba(255, 255, 255, 0.02);
        --wr-btn-subtle-bg: rgba(255, 255, 255, 0.06);
        --wr-btn-subtle-border: rgba(255, 255, 255, 0.08);
        --wr-btn-subtle-hover-bg: rgba(255, 255, 255, 0.15);
        --wr-scrollbar-track: rgba(255,255,255,0.03);
        --wr-scrollbar-thumb: rgba(248,0,91,0.3);
        --wr-scrollbar-thumb-hover: rgba(248,0,91,0.5);
        --wr-countdown-bg: rgba(255, 255, 255, 0.05);
        --wr-sheet-bg: rgba(17, 17, 22, 0.97);
        --wr-sheet-handle: rgba(255, 255, 255, 0.15);
        --wr-chat-header-bg: rgba(28, 28, 33, 0.5);
        --wr-chat-footer-bg: rgba(28, 28, 33, 0.4);
        --wr-chat-input-bg: rgba(255, 255, 255, 0.04);
        --wr-chat-input-border: rgba(255, 255, 255, 0.08);
        --wr-chat-input-focus-bg: rgba(255, 255, 255, 0.06);
        --wr-chat-msg-in-bg: #1e1e24;
        --wr-chat-msg-in-border: rgba(255, 255, 255, 0.08);
        --wr-chat-msg-in-text: rgba(255, 255, 255, 0.88);
        --wr-chat-msg-out-bg: #0a3844;
        --wr-chat-msg-out-border: rgba(6, 182, 212, 0.25);
        --wr-chat-msg-out-text: rgba(255, 255, 255, 0.92);
        --wr-chat-text: rgba(255, 255, 255, 0.9);
        --wr-chat-author: rgba(255, 255, 255, 0.55);
        --wr-chat-timestamp: rgba(255, 255, 255, 0.25);
        --wr-chat-placeholder: rgba(255, 255, 255, 0.25);
        --wr-ctx-menu-bg: rgba(30, 30, 38, 0.97);
        --wr-ctx-menu-border: rgba(255, 255, 255, 0.08);
        --wr-ctx-menu-text: rgba(255, 255, 255, 0.85);
        --wr-ctx-menu-hover: rgba(255, 255, 255, 0.08);
        --wr-reply-bg: rgba(248, 0, 91, 0.06);
        --wr-reply-text: rgba(255, 255, 255, 0.45);
        --wr-reply-hover-bg: rgba(248, 0, 91, 0.1);
        --wr-modal-backdrop: rgba(0, 0, 0, 0.8);
        --wr-card-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        --wr-reaction-bg: rgba(255, 255, 255, 0.08);
        --wr-reaction-border: rgba(255, 255, 255, 0.1);
        --wr-reaction-hover: rgba(255, 255, 255, 0.16);
        --wr-admin-btn-bg: rgba(255, 255, 255, 0.1);
        --wr-admin-btn-hover: rgba(255, 255, 255, 0.2);
        --wr-admin-btn-icon: rgba(255, 255, 255, 0.7);
        --wr-admin-btn-icon-hover: #fff;
        --wr-chat-bg-image: url('https://fs.chatium.ru/get/image_msk_JJwJVRJKgf.848x1264.jpeg');
        --wr-chat-overlay-color: rgba(0, 0, 0, 0.3);
        --wr-border-color: rgba(255, 255, 255, 0.08);
        --wr-bg-secondary: #18181c;
        --wr-bg-primary: #1c1c21;
        --wr-bg-tertiary: #232328;
        --wr-bg-error: rgba(239, 68, 68, 0.15);
        --wr-accent: #f8005b;
        --wr-accent-hover: #ff3d7f;
        --wr-accent-rgb: 248, 0, 91;
        --wr-btn-bg: rgba(255, 255, 255, 0.06);
        --wr-btn-hover-bg: rgba(255, 255, 255, 0.12);
        --wr-btn-hover-border: rgba(255, 255, 255, 0.15);
        --wr-surface-hover: rgba(255, 255, 255, 0.04);
      }

      .theme-light {
        --wr-primary: #f8005b;
        --wr-primary-hover: #c7004a;
        --wr-bg: #f5f5f7;
        --wr-bg-lighter: #ebebef;
        --wr-bg-card: #ffffff;
        --wr-surface: #e8e8ec;
        --wr-text-primary: #1a1a1a;
        --wr-text-secondary: rgba(0, 0, 0, 0.65);
        --wr-text-tertiary: rgba(0, 0, 0, 0.45);
        --wr-text-muted: rgba(0, 0, 0, 0.3);
        --wr-border: rgba(0, 0, 0, 0.1);
        --wr-border-light: rgba(0, 0, 0, 0.06);
        --wr-border-hover: rgba(0, 0, 0, 0.2);
        --wr-glass-bg: rgba(255, 255, 255, 0.7);
        --wr-glass-border: rgba(0, 0, 0, 0.08);
        --wr-glass-toast-bg: rgba(255, 255, 255, 0.9);
        --wr-glass-light-bg: rgba(0, 0, 0, 0.03);
        --wr-glass-light-border: rgba(0, 0, 0, 0.06);
        --wr-input-bg: rgba(0, 0, 0, 0.04);
        --wr-input-border: rgba(0, 0, 0, 0.12);
        --wr-input-focus-bg: rgba(0, 0, 0, 0.06);
        --wr-hover-bg: rgba(0, 0, 0, 0.03);
        --wr-btn-subtle-bg: rgba(0, 0, 0, 0.05);
        --wr-btn-subtle-border: rgba(0, 0, 0, 0.1);
        --wr-btn-subtle-hover-bg: rgba(0, 0, 0, 0.1);
        --wr-scrollbar-track: rgba(0,0,0,0.03);
        --wr-scrollbar-thumb: rgba(248,0,91,0.25);
        --wr-scrollbar-thumb-hover: rgba(248,0,91,0.45);
        --wr-countdown-bg: rgba(0, 0, 0, 0.04);
        --wr-sheet-bg: rgba(255, 255, 255, 0.97);
        --wr-sheet-handle: rgba(0, 0, 0, 0.15);
        --wr-chat-header-bg: rgba(255, 255, 255, 0.8);
        --wr-chat-footer-bg: rgba(255, 255, 255, 0.7);
        --wr-chat-input-bg: rgba(0, 0, 0, 0.04);
        --wr-chat-input-border: rgba(0, 0, 0, 0.1);
        --wr-chat-input-focus-bg: rgba(0, 0, 0, 0.06);
        --wr-chat-msg-in-bg: #ffffff;
        --wr-chat-msg-in-border: rgba(248, 0, 91, 0.2);
        --wr-chat-msg-in-text: rgba(0, 0, 0, 0.85);
        --wr-chat-msg-out-bg: #d4f1f4;
        --wr-chat-msg-out-border: rgba(6, 182, 212, 0.22);
        --wr-chat-msg-out-text: rgba(0, 0, 0, 0.9);
        --wr-chat-text: rgba(0, 0, 0, 0.85);
        --wr-chat-author: rgba(0, 0, 0, 0.55);
        --wr-chat-timestamp: rgba(0, 0, 0, 0.3);
        --wr-chat-placeholder: rgba(0, 0, 0, 0.35);
        --wr-ctx-menu-bg: rgba(255, 255, 255, 0.97);
        --wr-ctx-menu-border: rgba(0, 0, 0, 0.1);
        --wr-ctx-menu-text: rgba(0, 0, 0, 0.85);
        --wr-ctx-menu-hover: rgba(0, 0, 0, 0.06);
        --wr-reply-bg: rgba(248, 0, 91, 0.06);
        --wr-reply-text: rgba(0, 0, 0, 0.5);
        --wr-reply-hover-bg: rgba(248, 0, 91, 0.1);
        --wr-modal-backdrop: rgba(0, 0, 0, 0.4);
        --wr-card-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        --wr-reaction-bg: rgba(0, 0, 0, 0.06);
        --wr-reaction-border: rgba(0, 0, 0, 0.1);
        --wr-reaction-hover: rgba(0, 0, 0, 0.12);
        --wr-admin-btn-bg: rgba(0, 0, 0, 0.06);
        --wr-admin-btn-hover: rgba(0, 0, 0, 0.12);
        --wr-admin-btn-icon: rgba(0, 0, 0, 0.5);
        --wr-admin-btn-icon-hover: rgba(0, 0, 0, 0.85);
        --wr-chat-bg-image: url('https://fs.chatium.ru/get/image_msk_6AdMGKFlRU.848x1264.png');
        --wr-chat-overlay-color: rgba(255, 255, 255, 0.3);
        --wr-border-color: rgba(0, 0, 0, 0.1);
        --wr-bg-secondary: #ebebef;
        --wr-bg-primary: #ffffff;
        --wr-bg-tertiary: #e8e8ec;
        --wr-bg-error: rgba(239, 68, 68, 0.1);
        --wr-accent: #f8005b;
        --wr-accent-hover: #c7004a;
        --wr-accent-rgb: 248, 0, 91;
        --wr-btn-bg: rgba(0, 0, 0, 0.05);
        --wr-btn-hover-bg: rgba(0, 0, 0, 0.1);
        --wr-btn-hover-border: rgba(0, 0, 0, 0.15);
        --wr-surface-hover: rgba(0, 0, 0, 0.03);
      }

      body {
        font-family: 'Inter', sans-serif;
        background: var(--wr-bg);
        min-height: 100vh;
        min-height: 100dvh;
        color: var(--wr-text-primary);
        transition: background-color 0.3s ease, color 0.3s ease;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        overflow-x: hidden;
      }
      @media (max-width: 399px) {
        .xs\:inline { display: inline !important; }
      }
      @media (min-width: 400px) {
        .hidden.xs\:inline { display: inline !important; }
      }
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: var(--wr-scrollbar-track);
      }
      ::-webkit-scrollbar-thumb {
        background: var(--wr-scrollbar-thumb);
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: var(--wr-scrollbar-thumb-hover);
      }
      .glass {
        background: var(--wr-glass-bg);
        backdrop-filter: blur(10px);
        border: 1px solid var(--wr-glass-border);
      }
      .glass-toast {
        background: var(--wr-glass-toast-bg);
        backdrop-filter: blur(10px);
        border: 1px solid var(--wr-border);
      }
      .glass-light {
        background: var(--wr-glass-light-bg);
        backdrop-filter: blur(10px);
        border: 1px solid var(--wr-glass-light-border);
      }
      .glow-primary {
        box-shadow: 0 0 30px rgba(248, 0, 91, 0.3), 0 0 60px rgba(248, 0, 91, 0.15);
      }
      .glow-primary-sm {
        box-shadow: 0 0 15px rgba(248, 0, 91, 0.25);
      }
      .text-gradient {
        background: linear-gradient(135deg, #f8005b 0%, #ff3d7f 50%, #f8005b 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .bg-gradient-primary {
        background: linear-gradient(135deg, #f8005b 0%, #ff3d7f 100%);
      }
      .btn-primary {
        background: linear-gradient(135deg, #f8005b 0%, #c7004a 100%);
        transition: all 0.3s ease;
      }
      .btn-primary:hover {
        background: linear-gradient(135deg, #ff3d7f 0%, #f8005b 100%);
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(248, 0, 91, 0.4);
      }
      .card-hover {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .card-hover:hover {
        transform: translateY(-4px);
        border-color: rgba(248, 0, 91, 0.3);
        box-shadow: var(--wr-card-shadow), 0 0 30px rgba(248, 0, 91, 0.1);
      }
      .input-modern {
        background: var(--wr-input-bg);
        border: 1px solid var(--wr-input-border);
        transition: all 0.3s ease;
      }
      .input-modern:focus {
        background: var(--wr-input-focus-bg);
        border-color: rgba(248, 0, 91, 0.5);
        box-shadow: 0 0 20px rgba(248, 0, 91, 0.15);
        outline: none;
      }
      .countdown-box {
        background: linear-gradient(135deg, rgba(248, 0, 91, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%);
        border: 1px solid rgba(248, 0, 91, 0.2);
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .shimmer {
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%);
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
      }
      .section {
        padding: 3rem 1rem;
      }
      .section-container {
        max-width: 100%;
        margin: 0 auto;
        padding: 0 1rem;
      }
      @media (min-width: 640px) {
        .section {
          padding: 4rem 2rem;
        }
        .section-container {
          max-width: 90%;
          padding: 0;
        }
      }
      @media (min-width: 1024px) {
        .section {
          padding: 4rem 1rem;
        }
        .section-container {
          max-width: 90%;
        }
      }

      /* Theme-aware text color utilities */
      .wr-text-primary { color: var(--wr-text-primary); }
      .wr-text-secondary { color: var(--wr-text-secondary); }
      .wr-text-tertiary { color: var(--wr-text-tertiary); }
      .wr-text-muted { color: var(--wr-text-muted); }
      .hover\:wr-text-primary:hover { color: var(--wr-text-primary); }

      /* Theme-aware background color utilities */
      .wr-bg-primary { background-color: var(--wr-bg-primary); }
      .wr-bg-secondary { background-color: var(--wr-bg-secondary); }
      .wr-bg-tertiary { background-color: var(--wr-bg-tertiary); }

      /* Admin placeholder theming */
      .theme-light input::placeholder,
      .theme-light textarea::placeholder {
        color: var(--wr-text-muted);
      }
      .theme-light select,
      .theme-light input[type='datetime-local'] {
        color-scheme: light;
      }
      .theme-dark select,
      .theme-dark input[type='datetime-local'] {
        color-scheme: dark;
      }

      /* Links in description */
      .wr-link {
        color: #f8005b;
        text-decoration: underline;
        text-underline-offset: 2px;
        transition: opacity 0.15s ease;
      }
      .wr-link:hover {
        opacity: 0.8;
      }

      /* Theme-aware status colors */
      .theme-dark .wr-status-yellow { color: #facc15; }
      .theme-light .wr-status-yellow { color: #a16207; }
      .theme-dark .wr-status-green { color: #4ade80; }
      .theme-light .wr-status-green { color: #15803d; }
      .theme-dark .wr-status-blue { color: #60a5fa; }
      .theme-light .wr-status-blue { color: #1d4ed8; }
      .theme-dark .wr-status-red { color: #f87171; }
      .theme-light .wr-status-red { color: #b91c1c; }
      .theme-dark .wr-status-gray { color: #9ca3af; }
      .theme-light .wr-status-gray { color: #4b5563; }

      /* Theme-aware status badge backgrounds */
      .theme-dark .wr-badge-yellow { background: rgba(250, 204, 21, 0.2); }
      .theme-light .wr-badge-yellow { background: rgba(161, 98, 7, 0.12); }
      .theme-dark .wr-badge-green { background: rgba(74, 222, 128, 0.2); }
      .theme-light .wr-badge-green { background: rgba(21, 128, 61, 0.12); }
      .theme-dark .wr-badge-blue { background: rgba(96, 165, 250, 0.2); }
      .theme-light .wr-badge-blue { background: rgba(29, 78, 216, 0.12); }
      .theme-dark .wr-badge-red { background: rgba(248, 113, 113, 0.2); }
      .theme-light .wr-badge-red { background: rgba(185, 28, 28, 0.12); }
      .theme-dark .wr-badge-gray { background: rgba(156, 163, 175, 0.2); }
      .theme-light .wr-badge-gray { background: rgba(75, 85, 99, 0.12); }

      /* Theme-aware bg-dot (small dots like pulse indicators) */
      .theme-dark .wr-dot-yellow { background-color: #facc15; }
      .theme-light .wr-dot-yellow { background-color: #ca8a04; }
      .theme-dark .wr-dot-green { background-color: #4ade80; }
      .theme-light .wr-dot-green { background-color: #16a34a; }
      .theme-dark .wr-dot-blue { background-color: #60a5fa; }
      .theme-light .wr-dot-blue { background-color: #2563eb; }
      .theme-dark .wr-dot-red { background-color: #f87171; }
      .theme-light .wr-dot-red { background-color: #dc2626; }

      /* Theme-aware action button styles */
      .theme-dark .wr-btn-yellow { background: rgba(250, 204, 21, 0.15); color: #facc15; }
      .theme-dark .wr-btn-yellow:hover { background: rgba(250, 204, 21, 0.25); }
      .theme-light .wr-btn-yellow { background: rgba(161, 98, 7, 0.1); color: #92400e; }
      .theme-light .wr-btn-yellow:hover { background: rgba(161, 98, 7, 0.18); }
      .theme-dark .wr-btn-green { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
      .theme-dark .wr-btn-green:hover { background: rgba(74, 222, 128, 0.25); }
      .theme-light .wr-btn-green { background: rgba(21, 128, 61, 0.1); color: #15803d; }
      .theme-light .wr-btn-green:hover { background: rgba(21, 128, 61, 0.18); }
      .theme-dark .wr-btn-red { background: rgba(248, 113, 113, 0.15); color: #f87171; }
      .theme-dark .wr-btn-red:hover { background: rgba(248, 113, 113, 0.25); }
      .theme-light .wr-btn-red { background: rgba(185, 28, 28, 0.1); color: #b91c1c; }
      .theme-light .wr-btn-red:hover { background: rgba(185, 28, 28, 0.18); }
    `}</style>
  </>
)
