import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1677ff',
        'primary-hover': '#4096ff',
        'border-base': '#d9d9d9',
        // Semantic tokens — switch with CSS variables from tailwind.css :root / .dark
        'bg-layout': 'var(--color-bg-layout)',
        'text-main': 'var(--color-text-main)',
        'text-secondary': 'var(--color-text-secondary)',
      },
      fontFamily: {
        display: ["'Noto Sans JP'", 'Inter', 'sans-serif'],
      },
      borderRadius: {
        ant: '6px',
      },
      boxShadow: {
        'ant-card':
          '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
} satisfies Config;
