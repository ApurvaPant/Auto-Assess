/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b', // Rich Black
        'background-dark': '#09090b',
        surface: '#18181b',    // Zinc 900
        'surface-dark': '#18181b',
        primary: {
          DEFAULT: '#6366f1',  // Indigo 500
          hover: '#4f46e5',    // Indigo 600
          foreground: '#fafafa',
        },
        secondary: {
          DEFAULT: '#3b82f6',  // Blue 500
          hover: '#2563eb',    // Blue 600
          foreground: '#fafafa',
        },
        accent: {
          DEFAULT: '#8b5cf6',  // Violet 500
          hover: '#7c3aed',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        text: {
          primary: '#fafafa',  // Zinc 50
          secondary: '#a1a1aa',// Zinc 400
          muted: '#71717a',    // Zinc 500
          inverse: '#09090b',
        }
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.15)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}