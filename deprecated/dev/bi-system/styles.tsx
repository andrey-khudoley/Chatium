// @shared

export const tailwindScript = `
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e'
          }
        }
      }
    }
  }
`

export const cssVariables = `
  :root {
    /* Background */
    --color-bg: #fafbfc;
    --color-bg-secondary: #ffffff;
    
    /* Text */
    --color-text: #1e293b;
    --color-text-secondary: #64748b;
    --color-text-tertiary: #94a3b8;
    
    /* Border */
    --color-border: #e2e8f0;
    
    /* Primary */
    --color-primary: #0ea5e9;
    --color-primary-hover: #0284c7;
    --color-primary-light: #e0f2fe;
    
    /* Success */
    --color-success: #10b981;
    --color-success-light: #d1fae5;
    
    /* Warning */
    --color-warning: #f59e0b;
    --color-warning-light: #fef3c7;
    
    /* Danger */
    --color-danger: #ef4444;
    --color-danger-light: #fee2e2;
    
    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
    
    /* Transition */
    --transition: all 0.2s ease;
  }
  
  .dark {
    /* Background */
    --color-bg: #0f172a;
    --color-bg-secondary: #1e293b;
    
    /* Text */
    --color-text: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-tertiary: #64748b;
    
    /* Border */
    --color-border: #334155;
    
    /* Primary */
    --color-primary: #38bdf8;
    --color-primary-hover: #0ea5e9;
    --color-primary-light: #1e3a5f;
    
    /* Success */
    --color-success: #34d399;
    --color-success-light: #064e3b;
    
    /* Warning */
    --color-warning: #fbbf24;
    --color-warning-light: #78350f;
    
    /* Danger */
    --color-danger: #f87171;
    --color-danger-light: #7f1d1d;
    
    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
`

export const commonStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    background: var(--color-bg);
    color: var(--color-text);
  }
  
  .card {
    background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg) 100%);
    border: 1.5px solid var(--color-border);
    border-radius: 1rem;
    padding: 1.5rem;
    transition: var(--transition);
    box-shadow: var(--shadow-sm);
  }
  
  .card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary);
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    transition: var(--transition);
    border: 1.5px solid transparent;
    outline: none;
    cursor: pointer;
    font-size: 0.875rem;
    background: transparent;
  }
  
  .btn-primary {
    color: var(--color-primary);
    border-color: var(--color-primary);
    background: transparent;
  }
  
  .btn-primary:hover {
    background: transparent;
    color: var(--color-primary);
    border-color: var(--color-primary-hover);
    transform: translateY(-1px);
  }
  
  .btn-primary:active {
    transform: translateY(0);
  }
  
  .btn-secondary {
    color: var(--color-text-secondary);
    border-color: var(--color-border);
    background: transparent;
  }
  
  .btn-secondary:hover {
    color: var(--color-text);
    border-color: var(--color-text);
    background: transparent;
    transform: translateY(-1px);
  }
  
  .btn-secondary:active {
    transform: translateY(0);
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn:disabled:hover {
    transform: none;
    background: transparent;
  }
  
  .input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1.5px solid var(--color-border);
    border-radius: 0.625rem;
    background: var(--color-bg-secondary);
    color: var(--color-text);
    font-family: inherit;
    transition: var(--transition);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  
  .input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light), inset 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  
  .table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .table th,
  .table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
  
  .table th {
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .table tr:hover {
    background: var(--color-bg-secondary);
  }
  
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--color-primary-light);
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  
  .modal-content {
    background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg) 100%);
    border: 1.5px solid var(--color-border);
    border-radius: 1rem;
    padding: 2rem;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
  }
`

export const preloaderStyles = `
  #app-loader {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    transition: opacity 0.3s ease-out;
  }
  
  #app-loader.hiding {
    opacity: 0;
  }
  
  .loader-content {
    text-align: center;
  }
  
  .loader-logo {
    width: 64px;
    height: 64px;
    margin: 0 auto 1.5rem;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(14, 165, 233, 0.3);
    animation: loader-logo-pulse 2s ease-in-out infinite;
  }
  
  .loader-logo i {
    font-size: 2rem;
    color: white;
  }
  
  .loader-spinner {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }
  
  .loader-ring {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      transparent 40deg,
      var(--color-primary) 60deg,
      var(--color-primary-hover) 180deg,
      var(--color-primary) 300deg,
      transparent 320deg,
      transparent 360deg
    );
    animation: loader-spin 1.2s linear infinite;
  }
  
  .loader-text {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
  
  @keyframes loader-spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes loader-logo-pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
`

export const preloaderScript = `
  window.hideAppLoader = function() {
    const loader = document.getElementById('app-loader');
    const appContent = document.getElementById('app-content');
    
    if (loader) {
      loader.classList.add('hiding');
      setTimeout(() => {
        loader.style.display = 'none';
      }, 300);
    }
    
    if (appContent) {
      appContent.style.opacity = '1';
      appContent.style.transition = 'opacity 0.3s ease-in';
    }
  }
`
