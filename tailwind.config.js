/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          charcoal: '#2F2F2D',
          clay: '#9A4B31',
          sage: '#6B645E',
          beige: '#EBE5DC',
          'beige-dusty': '#CDC4B9',
          earth: '#6B645E',
          'earth-light': '#D6D1CA',
        }
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
