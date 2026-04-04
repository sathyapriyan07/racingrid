/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Bricolage Grotesque', 'Zabal', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Bricolage Grotesque', 'Zabal', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        f1red: '#E10600',
      },
      backgroundColor: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        card: 'var(--bg-card)',
        muted: 'var(--bg-muted)',
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, rgba(225,6,0,0.15) 0%, transparent 50%, rgba(0,0,0,0.8) 100%)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)',
      },
      animation: {
        'fade-in':      'fadeIn 0.4s ease forwards',
        'slide-up':     'slideUp 0.4s ease forwards',
        'slide-in-left':'slideInLeft 0.5s ease forwards',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
        'ticker':       'ticker 30s linear infinite',
        'float':        'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:       { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:      { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInLeft:  { from: { opacity: 0, transform: 'translateX(-20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        glowPulse:    { '0%,100%': { opacity: 0.6 }, '50%': { opacity: 1 } },
        ticker:       { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        float:        { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      boxShadow: {
        'glow-red':    '0 0 40px rgba(225,6,0,0.3), 0 0 80px rgba(225,6,0,0.1)',
        'glow-sm':     '0 0 20px rgba(225,6,0,0.2)',
        'glow-gold':   '0 0 30px rgba(234,179,8,0.25)',
        'glow-green':  '0 0 30px rgba(34,197,94,0.2)',
        'card-hover':  '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        'adaptive':    'var(--shadow)',
        'cinematic':   '0 32px 80px rgba(0,0,0,0.8)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
