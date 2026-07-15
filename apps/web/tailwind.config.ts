import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4B8B6F',
          hover: '#3E7860',
          subtle: '#E7F0EB',
        },
        accent: { DEFAULT: '#5B7C99', subtle: '#E6ECF1' },
        success: { DEFAULT: '#3E7860', subtle: '#E7F0EB' },
        warning: { DEFAULT: '#C08A3E', subtle: '#F6ECDA' },
        danger: { DEFAULT: '#B5544A', subtle: '#F5E2DF' },
        canvas: '#FAF9F6',
        surface: '#FFFFFF',
        hairline: '#E8E5DE',
        ink: { DEFAULT: '#2C2A26', muted: '#6B6862' },
      },
      borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
