/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,ts,tsx,js,jsx}',
    './src/pages/**/*.{astro,ts,tsx,js,jsx}',
    './src/components/**/*.{astro,ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}
