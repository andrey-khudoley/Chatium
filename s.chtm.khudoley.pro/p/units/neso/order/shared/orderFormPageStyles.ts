// @shared
/** Визуальный стиль формы из `.deprecated/dev/weblink-generator` (Tailwind config + CSS variables + базовые классы). */

export const orderFormTailwindScript = `
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',
            600: '#9333ea',
            700: '#7e22ce',
            800: '#6b21a8',
            900: '#581c87'
          }
        }
      }
    }
  }
`

export const orderFormCssVariables = `
  :root {
    --color-bg: #4a5234;
    --color-bg-card: #FFFFFF;
    --color-bg-card-alt: #E8E8E8;
    --color-text: #1A1A1A;
    --color-text-secondary: #333333;
    --color-text-on-dark: #FFFFFF;
    --color-border: rgba(0, 0, 0, 0.1);
    --color-primary: #D4B896;
    --color-primary-dark: #C8A880;
    --color-button-dark: #222222;
    --color-button-light: #F5E5D0;
    --color-button-light-text: #333333;
    --color-success: #7a9b5c;
    --color-danger: #b85c5c;

    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.2);
    --shadow-xl: 0 12px 40px rgba(0, 0, 0, 0.25);

    --transition: all 0.3s ease;
  }
`

export const orderFormCommonStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--color-text);
    background: var(--color-bg);
  }

  .gradient-bg {
    background: linear-gradient(135deg, #4a5234 0%, #3d4429 50%, #4a5234 100%);
    position: relative;
    overflow: hidden;
  }

  .gradient-bg::before {
    content: '';
    position: absolute;
    top: -30%;
    right: -30%;
    width: 80%;
    height: 80%;
    background: radial-gradient(circle, rgba(212, 184, 150, 0.08) 0%, transparent 60%);
    animation: order-form-gradient-pulse 15s ease-in-out infinite;
  }

  .gradient-bg::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: -30%;
    width: 80%;
    height: 80%;
    background: radial-gradient(circle, rgba(155, 139, 92, 0.06) 0%, transparent 60%);
    animation: order-form-gradient-pulse 15s ease-in-out infinite reverse;
  }

  @keyframes order-form-gradient-pulse {
    0%, 100% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    50% {
      transform: translate(5%, 5%) scale(1.05);
      opacity: 0.8;
    }
  }

  .card {
    width: 100%;
    background: var(--color-bg-card);
    border: none;
    border-radius: 1.5rem;
    padding: 3rem;
    transition: var(--transition);
    box-shadow: var(--shadow-lg);
    position: relative;
  }

  .card:hover {
    box-shadow: var(--shadow-xl);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1.125rem 2.5rem;
    border-radius: 1.25rem;
    font-weight: 600;
    font-size: 1.125rem;
    letter-spacing: 0.02em;
    transition: var(--transition);
    border: none;
    outline: none;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    text-transform: uppercase;
  }

  .btn-primary {
    background: var(--color-button-dark);
    color: var(--color-text-on-dark);
    box-shadow: var(--shadow-md);
    font-weight: 600;
  }

  .btn-primary:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
    opacity: 0.95;
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input {
    width: 100%;
    padding: 1rem 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    background: var(--color-bg-card);
    color: var(--color-text);
    font-family: inherit;
    font-size: 1rem;
    transition: var(--transition);
    box-shadow: var(--shadow-sm);
  }

  .input::placeholder {
    color: #999999;
  }

  .input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
  }

  .input:hover {
    border-color: var(--color-primary-dark);
  }

  @keyframes order-form-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: order-form-spin 1s linear infinite;
  }

  @media (max-width: 640px) {
    .card {
      padding: 2rem;
      border-radius: 1.5rem;
    }

    .btn {
      padding: 1rem 2rem;
      font-size: 1rem;
    }
  }
`
