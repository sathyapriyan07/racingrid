/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        f1red: '#E10600',
        // Semantic tokens mapped to CSS variables
        'bg-base':     'var(--bg-base)',
        'bg-surface':  'var(--bg-surface)',
        'bg-raised':   'var(--bg-raised)',
        'bg-muted':    'var(--bg-muted)',
        'bg-card':     'var(--bg-card)',
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted':     'var(--text-muted)',
        'border-subtle':  'var(--border)',
        'accent':         'var(--accent)',
        // Legacy dark palette (kept for any remaining references)
        dark: {
          950: '#000000',
          900: '#0a0a0f',
          800: '#111118',
          700: '#1a1a24',
          600: '#22222f',
          500: '#2e2e3e',
        },
        light: {
          50:  '#ffffff',
          100: '#f5f5f7',
          200: '#e8e8ed',
          300: '#d1d1d6',
        },
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.4s ease forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glowPulse: { '0%,100%': { opacity: 0.6 }, '50%': { opacity: 1 } },
      },
      boxShadow: {
        'glow-red':   '0 0 30px rgba(225,6,0,0.25)',
        'glow-sm':    '0 0 15px rgba(225,6,0,0.15)',
        'adaptive':   'var(--shadow)',
      },
    },
  },
  plugins: [],
}
