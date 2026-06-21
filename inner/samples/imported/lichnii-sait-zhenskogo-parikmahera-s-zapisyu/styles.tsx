import { jsx } from '@app/html-jsx'

export function StylesHead() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
      <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
      <script>{`
        tailwind.config = {
          theme: {
            extend: {
              colors: {
                primary: '#8b7355',
                secondary: '#2c2c2c',
                accent: '#d4a574',
                light: '#f8f6f3',
              },
              fontFamily: {
                display: ['Playfair Display', 'serif'],
                sans: ['Inter', 'sans-serif'],
              }
            }
          }
        }
      `}</script>
      <style type="text/tailwindcss">{`
        @layer base {
          body {
            font-family: 'Inter', sans-serif;
            color: #2c2c2c;
          }
          
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Playfair Display', serif;
          }
        }
        
        @layer utilities {
          .section-padding {
            @apply py-16 px-6 lg:px-12;
          }
          
          .container-custom {
            @apply max-w-7xl mx-auto;
          }
          
          .btn-primary {
            @apply bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all duration-300 shadow-md hover:shadow-lg;
          }
          
          .btn-outline {
            @apply border-2 border-primary text-primary px-8 py-3 rounded-lg font-medium hover:bg-primary hover:text-white transition-all duration-300;
          }
          
          .service-card {
            @apply bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1;
          }
        }
      `}</style>
    </>
  )
}
