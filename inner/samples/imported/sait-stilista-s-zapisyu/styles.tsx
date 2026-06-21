import { jsx } from '@app/html-jsx'

export function StylesHead() {
  return (
    <>
      <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Poppins:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
      <script>{`
        tailwind.config = {
          theme: {
            extend: {
              colors: {
                primary: '#d4a574',
                secondary: '#7d5b9f',
                accent: '#f0ebf8',
                dark: '#4a3555',
              },
              fontFamily: {
                serif: ['Playfair Display', 'serif'],
                sans: ['Poppins', 'sans-serif'],
              }
            }
          }
        }
      `}</script>
      <style type="text/tailwindcss">{`
        body {
          font-family: 'Poppins', sans-serif;
          margin: 0;
          padding: 0;
          background-color: #faf9fc;
        }
        
        h1, h2, h3 {
          font-family: 'Playfair Display', serif;
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #d4a574 0%, #9d7d5d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .btn-primary {
          @apply bg-primary text-white px-8 py-4 rounded-full font-medium 
                 hover:bg-opacity-90 transition-all duration-300 
                 transform hover:scale-105 shadow-lg;
        }
        
        .card {
          @apply bg-white rounded-2xl shadow-xl p-8 
                 transform transition-all duration-300 hover:shadow-2xl;
        }
        
        .section-title {
          @apply text-4xl md:text-5xl font-bold text-secondary mb-6 font-serif;
        }
        
        input, textarea, select {
          @apply w-full px-4 py-3 border border-gray-300 rounded-lg 
                 focus:outline-none focus:border-primary focus:ring-2 
                 focus:ring-primary focus:ring-opacity-20 transition-all;
        }
        
        .service-card {
          @apply bg-white rounded-xl p-6 shadow-lg hover:shadow-xl 
                 transition-all duration-300 border-2 border-transparent 
                 hover:border-primary cursor-pointer;
        }
        
        .hero-overlay {
          background: linear-gradient(135deg, rgba(125, 91, 159, 0.9) 0%, rgba(74, 53, 85, 0.85) 100%);
        }
      `}</style>
    </>
  )
}
