import { jsx } from '@app/html-jsx'

export const Styles = () => (
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
              primary: '#d4a373',
              secondary: '#8b6f47',
              accent: '#f5e6d3',
              dark: '#2c2416',
              light: '#faf8f5',
            },
            fontFamily: {
              heading: ['Playfair Display', 'serif'],
              body: ['Inter', 'sans-serif'],
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
        background: #faf8f5;
        color: #2c2416;
        overflow-x: hidden;
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Playfair Display', serif;
      }

      .gradient-text {
        background: linear-gradient(135deg, #d4a373 0%, #8b6f47 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .hover-lift {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }

      .hover-lift:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      }

      .fade-in {
        animation: fadeIn 1s ease-in;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .btn-primary {
        background: linear-gradient(135deg, #d4a373 0%, #8b6f47 100%);
        transition: all 0.3s ease;
      }

      .btn-primary:hover {
        transform: scale(1.05);
        box-shadow: 0 10px 30px rgba(212, 163, 115, 0.3);
      }

      input, textarea, select {
        transition: all 0.3s ease;
      }

      input:focus, textarea:focus, select:focus {
        outline: none;
        border-color: #d4a373;
        box-shadow: 0 0 0 3px rgba(212, 163, 115, 0.1);
      }
    `}</style>
  </>
)
