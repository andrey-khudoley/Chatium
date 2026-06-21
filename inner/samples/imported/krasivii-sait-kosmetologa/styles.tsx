export const styles = `
  <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#8FB969',
            secondary: '#A8C585',
            accent: '#7AA054',
            dark: '#4a4a4a',
            light: '#f7f7f7',
          },
          fontFamily: {
            sans: ['Montserrat', 'sans-serif'],
            serif: ['Playfair Display', 'serif'],
          }
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet">
  <style type="text/tailwindcss">
    * {
      scroll-behavior: smooth;
    }
    
    body {
      font-family: 'Montserrat', sans-serif;
      color: #333333;
      background-color: #ffffff;
    }
    
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Playfair Display', serif;
    }
    
    .btn-primary {
      @apply bg-primary hover:bg-accent text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1;
    }
    
    .btn-secondary {
      @apply bg-transparent border-2 border-primary hover:bg-primary text-primary hover:text-white font-semibold py-3 px-8 rounded-full transition-all duration-300;
    }
    
    .section-title {
      @apply text-4xl md:text-5xl font-bold text-dark mb-4 text-center;
    }
    
    .section-subtitle {
      @apply text-lg md:text-xl text-gray-600 text-center mb-12;
    }
    
    .service-card {
      @apply bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2;
    }
    
    .input-field {
      @apply w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors duration-200;
    }
  </style>
`
