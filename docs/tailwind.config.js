/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './.vitepress/theme/**/*.{vue,js,ts,jsx,tsx}',
    './content/**/*.md'
  ],
  theme: {
    extend: {
      fontFamily: {
        'varela': ['"Varela Round"', 'sans-serif']
      },
      colors: {
        void: '#050505',
        glass: 'rgba(255,255,255,0.05)',
        yellow: '#f6b012'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}

