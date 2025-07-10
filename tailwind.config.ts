import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ff5fa2',
        secondary: '#8f5fff',
        accent: '#ffe066',
        info: '#ff7eb3',
        card: '#fff',
      },
      borderRadius: {
        xl: '2rem',
        lg: '1.5rem',
      },
      fontFamily: {
        display: ['Fredoka One', 'cursive'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(143,95,255,0.10)',
        button: '0 2px 8px rgba(255,95,162,0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
