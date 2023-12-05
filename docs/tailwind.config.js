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
      '15': '0.912rem',
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
    
    extend: {
      colors: {
        dark: {
          bg: '#1b1b1f',
          alt: '#161618',
          elv: '#202127',
          soft: '#202127',
        },
        interactive: '#8FC2D7',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Menlo', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
}

