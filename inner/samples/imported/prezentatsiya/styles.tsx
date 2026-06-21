import { jsx } from '@app/html-jsx'

export function PresentationHead() {
  return (
    <>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
      />
      <script src="/s/metric/clarity.js"></script>
      <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        :root {
          --bg-void: #020208;
          --bg-deep: #0a0a14;
          --bg-surface: #111122;
          --bg-elevated: #1a1a2e;
          --bg-card: #16162a;
          --border-subtle: rgba(255,255,255,0.06);
          --border-glow: rgba(99,102,241,0.3);
          --text-primary: #f0f0ff;
          --text-secondary: #e0e0f0;
          --text-muted: #b0b0cc;
          --accent-indigo: #6366f1;
          --accent-violet: #8b5cf6;
          --accent-cyan: #06b6d4;
          --accent-emerald: #10b981;
          --accent-amber: #f59e0b;
          --accent-rose: #f43f5e;
          --gradient-hero: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
          --gradient-warm: linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%);
          --gradient-cool: linear-gradient(135deg, #06b6d4 0%, #10b981 100%);
          --font-display: 'Syne', sans-serif;
          --font-body: 'Space Grotesk', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }
        
        *, *::before, *::after { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        html { 
          overflow: hidden; 
          height: 100%; 
        }
        
        body {
          font-family: var(--font-body);
          background: var(--bg-void);
          color: var(--text-primary);
          line-height: 1.6;
          overflow: hidden;
          height: 100%;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        ::selection { 
          background: rgba(99,102,241,0.4); 
          color: #fff; 
        }
        
        ::-webkit-scrollbar { 
          width: 6px; 
          height: 6px;
        }
        
        ::-webkit-scrollbar-track { 
          background: transparent; 
        }
        
        ::-webkit-scrollbar-thumb { 
          background: rgba(99,102,241,0.3); 
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(99,102,241,0.5);
        }

        /* Animation keyframes */
        @keyframes fadeInUp { 
          from { opacity:0; transform:translateY(30px); } 
          to { opacity:1; transform:translateY(0); } 
        }
        
        @keyframes fadeInLeft { 
          from { opacity:0; transform:translateX(-30px); } 
          to { opacity:1; transform:translateX(0); } 
        }
        
        @keyframes fadeInRight { 
          from { opacity:0; transform:translateX(30px); } 
          to { opacity:1; transform:translateX(0); } 
        }
        
        @keyframes fadeInScale { 
          from { opacity:0; transform:scale(0.92); } 
          to { opacity:1; transform:scale(1); } 
        }
        
        @keyframes float { 
          0%,100% { transform: translateY(0); } 
          50% { transform: translateY(-15px); } 
        }
        
        @keyframes pulse-glow { 
          0%,100% { opacity: 0.4; transform: scale(1); } 
          50% { opacity: 1; transform: scale(1.1); } 
        }
        
        @keyframes shimmer { 
          0% { background-position: -200% 0; } 
          100% { background-position: 200% 0; } 
        }
        
        @keyframes orbit { 
          from { transform: rotate(0deg) translateX(120px) rotate(0deg); } 
          to { transform: rotate(360deg) translateX(120px) rotate(-360deg); } 
        }

        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3); }
          50% { box-shadow: 0 0 40px rgba(99,102,241,0.6); }
        }

        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        @keyframes particle-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { transform: translateY(-100px) translateX(20px); }
        }

        @keyframes border-glow {
          0%, 100% { border-color: rgba(99,102,241,0.2); }
          50% { border-color: rgba(99,102,241,0.5); }
        }

        /* Gradient text utility */
        .gradient-text {
          background: var(--gradient-hero);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 5s ease infinite;
        }

        .gradient-text-warm {
          background: var(--gradient-warm);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 5s ease infinite;
        }

        .gradient-text-cool {
          background: var(--gradient-cool);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 5s ease infinite;
        }

        /* Glow effects */
        .glow {
          box-shadow: 0 0 20px rgba(99,102,241,0.3);
        }

        .glow-hover:hover {
          box-shadow: 0 0 30px rgba(99,102,241,0.4);
        }

        /* Shimmer effect */
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }

        /* Glass effect */
        .glass {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.06);
        }

        /* Card hover lift */
        .hover-lift {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        }

        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        /* Focus styles */
        button:focus-visible,
        input:focus-visible,
        a:focus-visible {
          outline: 2px solid var(--accent-indigo);
          outline-offset: 2px;
        }

        /* Smooth scrolling for slides with overflow */
        .slide {
          scroll-behavior: smooth;
        }

        /* Prevent text selection on interactive elements */
        .no-select {
          user-select: none;
          -webkit-user-select: none;
        }

        /* Responsive typography helper */
        .text-responsive {
          font-size: clamp(1rem, 2.5vw, 1.5rem);
        }

        /* Animation delay utilities */
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }

        /* Mobile global overrides */
        @media (max-width: 768px) {
          .slide {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch;
          }
        }

        @media (max-width: 480px) {
          body {
            font-size: 14px;
            line-height: 1.5;
          }
          .hover-lift:hover {
            transform: none;
            box-shadow: none;
          }
        }
      `}</style>
    </>
  )
}
