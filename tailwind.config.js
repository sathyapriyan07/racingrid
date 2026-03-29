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
        // Semantic tokens mapped to CSS variables (MANDATORY structure)
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        card: 'var(--bg-card)',
        muted: 'var(--bg-muted)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        border: 'var(--border)',
        accent: 'var(--accent)',

        // Back-compat literal red used across existing components
        f1red: '#E10600',
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
