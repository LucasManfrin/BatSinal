/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: Object.fromEntries(
        [
          'bg',
          'surface',
          'surface-2',
          'border',
          'text',
          'muted',
          'accent',
          'livre',
          'ocupada',
          'sem-sinal',
        ].map((name) => [name, `var(--${name})`]),
      ),
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: { card: '16px' },
    },
  },
  plugins: [],
};
