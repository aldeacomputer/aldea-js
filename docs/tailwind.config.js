/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./**/*/index.md",
    "./.vitepress/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    fontSize: {
      '12': '0.75rem',
      '14': '0.875rem',
      '16': '1rem',
      '18': '1.125rem',
      '20': '1.25rem',
      '24': '1.5rem',
      '28': '1.75rem',
      '32': '2rem',
      '36': '2.25rem',
      '42': '2.625rem',
      '48': '3rem',
    },
    
    extend: {},
  },
  plugins: [],
}

