import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca: teal profundo + turquesa Lanka
        brand: {
          50: '#E6F4F6',
          100: '#CDE9EC',
          200: '#9FD6DC',
          300: '#6FC3CC',
          400: '#35B7C2',
          500: '#35B7C2',
          600: '#177E89',
          700: '#12646D',
          800: '#0E4F56',
        },
        // Acento calido: fucsia refinado del logo
        accent: {
          50: '#FBEAF2',
          100: '#F6D3E3',
          500: '#C83779',
          600: '#C83779',
          700: '#A82C63',
        },
        // Semanticos de operacion
        success: {
          50: '#E7F5F0',
          100: '#CDEBE1',
          600: '#1E8E6A',
          700: '#166E52',
        },
        warning: {
          50: '#FDF3E7',
          100: '#FAE4C9',
          600: '#D9822B',
          700: '#B26A1F',
        },
        danger: {
          50: '#FBEAEC',
          100: '#F6D2D6',
          600: '#C93B4B',
          700: '#A62E3C',
        },
        // Neutros frios
        canvas: '#F4F8F9',
        surface: '#FFFFFF',
        line: '#DCE7EA',
        ink: '#12262A',
        muted: '#566D73',
      },
    },
  },
  plugins: [],
} satisfies Config;
