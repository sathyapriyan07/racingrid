/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        f1red: '#E10600',
        dark: {
          900: '#0a0a0f',
          800: '#111118',
          700: '#1a1a24',
          600: '#22222f',
        },
        light: {
          50:  '#ffffff',
          100: '#f5f5f7',
          200: '#e8e8ed',
          300: '#d1d1d6',
        },
      },
    },
  },
  plugins: [],
}
