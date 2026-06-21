import { jsx } from '@app/html-jsx'

export const StylesHead = () => (
  <>
    <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
    <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
    <script>{`
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              primary: '#1e40af',
              secondary: '#1e3a8a',
              accent: '#3b82f6',
              dark: '#111827',
              light: '#f3f4f6',
            }
          }
        }
      }
    `}</script>
    <style type="text/tailwindcss">{`
      body {
        font-family: 'Inter', 'Roboto', sans-serif;
        --color-primary: #1e40af;
        --color-secondary: #1e3a8a;
        --color-accent: #3b82f6;
        --color-dark: #111827;
        --color-light: #f3f4f6;
      }
      
      .hero-gradient {
        background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%);
      }
      
      .card-hover {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      
      .card-hover:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      
      .btn-primary {
        background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
        transition: all 0.3s ease;
      }
      
      .btn-primary:hover {
        transform: scale(1.05);
        box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.4);
      }
      
      .section-title {
        position: relative;
        display: inline-block;
      }
      
      .section-title::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 4px;
        background: linear-gradient(90deg, #3b82f6 0%, #1e40af 100%);
        border-radius: 2px;
      }
    `}</style>
  </>
)
