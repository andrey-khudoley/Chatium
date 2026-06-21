// @shared
import { jsx } from '@app/html-jsx'

export const EventStyles = () => (
  <>
    <link
      href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
    <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
    <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
    <script>{`
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              gold: '#D4AF37',
              'gold-light': '#F4E4C1',
              'gold-dark': '#B8941F',
              burgundy: '#8B2332',
              'burgundy-dark': '#6B1A27',
              dark: '#0A0A0A',
              'dark-light': '#1A1A1A',
              'dark-lighter': '#2A2A2A',
            },
            fontFamily: {
              sans: ['Montserrat', 'sans-serif'],
              display: ['Playfair Display', 'serif'],
            }
          }
        }
      }
    `}</script>
    <style type="text/tailwindcss">{`
      @layer base {
        body {
          @apply bg-dark text-white font-sans;
        }
        
        h1, h2, h3, h4, h5, h6 {
          @apply font-display;
        }
      }

      @layer utilities {
        .gradient-gold {
          background: linear-gradient(135deg, #D4AF37 0%, #F4E4C1 50%, #D4AF37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .gradient-bg {
          background: linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%);
        }
        
        .shine-effect {
          position: relative;
          overflow: hidden;
        }
        
        .shine-effect::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shine 3s infinite;
        }
        
        @keyframes shine {
          0% { left: -100%; }
          50%, 100% { left: 100%; }
        }
        
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .pulse-gold {
          animation: pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse-gold {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 40px rgba(212, 175, 55, 0.8);
          }
        }
        
        .slide-in-up {
          animation: slideInUp 0.5s ease-out forwards;
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .backdrop-blur-premium {
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
        }
      }
    `}</style>
  </>
)
