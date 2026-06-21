// @shared
import { jsx } from '@app/html-jsx'

export function Styles() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
      <script>{`
        tailwind.config = {
          theme: {
            extend: {
              colors: {
                primary: '#E8A5A7',
                secondary: '#F5D1D3',
                accent: '#C77E81',
                dark: '#2C2C2C',
                light: '#FFF9F9'
              },
              fontFamily: {
                sans: ['Montserrat', 'sans-serif'],
                serif: ['Playfair Display', 'serif']
              }
            }
          }
        }
      `}</script>
      <style type="text/tailwindcss">{`
        @layer base {
          body {
            font-family: 'Montserrat', sans-serif;
            background: linear-gradient(135deg, #FFF9F9 0%, #FFE8EA 100%);
            min-height: 100vh;
          }
          
          h1, h2, h3 {
            font-family: 'Playfair Display', serif;
          }
        }
        
        @layer components {
          .btn-primary {
            @apply bg-gradient-to-r from-primary to-accent text-white font-semibold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105;
          }
          
          .btn-secondary {
            @apply bg-white text-accent font-semibold py-3 px-6 rounded-full shadow-md hover:shadow-lg transition-all duration-300 border-2 border-accent;
          }
          
          .card {
            @apply bg-white rounded-3xl shadow-xl p-8 transition-all duration-300;
          }
          
          .progress-dot {
            @apply w-3 h-3 rounded-full bg-gray-300 transition-all duration-300;
          }
          
          .progress-dot.active {
            @apply bg-primary scale-125;
          }
          
          .progress-dot.completed {
            @apply bg-accent;
          }
          
          .quiz-option {
            @apply bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-primary hover:shadow-md;
          }
          
          .quiz-option.selected {
            @apply border-primary bg-secondary shadow-lg;
          }
          
          .fade-enter-active, .fade-leave-active {
            transition: opacity 0.3s, transform 0.3s;
          }
          
          .fade-enter-from, .fade-leave-to {
            opacity: 0;
            transform: translateY(20px);
          }
        }
      `}</style>
    </>
  )
}
