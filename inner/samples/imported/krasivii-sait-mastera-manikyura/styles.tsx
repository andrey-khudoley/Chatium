import { jsx } from '@app/html-jsx'

export function Styles() {
  return (
    <>
      <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

      <script>{`
        tailwind.config = {
          theme: {
            extend: {
              colors: {
                primary: '#C89595',
                secondary: '#F5E6E8',
                accent: '#A67B7B',
                dark: '#2D2424',
              },
              fontFamily: {
                serif: ['Playfair Display', 'serif'],
                sans: ['Inter', 'sans-serif'],
              }
            }
          }
        }
      `}</script>

      <style type="text/tailwindcss">{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          color: #2D2424;
          overflow-x: hidden;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Playfair Display', serif;
          font-weight: 600;
        }

        .btn-primary {
          @apply bg-primary hover:bg-accent text-white px-8 py-3 rounded-full transition-all duration-300 font-medium;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(200, 149, 149, 0.3);
        }

        .section-title {
          @apply text-4xl md:text-5xl font-bold text-center mb-4;
        }

        .fade-in {
          animation: fadeIn 0.6s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .hover-lift:hover {
          transform: translateY(-10px);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </>
  )
}
