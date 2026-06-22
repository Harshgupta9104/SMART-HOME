/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'App.tsx',
    'src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // These will be overridden at runtime by theme tokens
        // Tailwind provides the utility classes, but actual colors come from styles
      },
    },
  },
  plugins: [],
};
