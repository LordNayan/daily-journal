import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          navy: '#252963',
          teal: '#2ec4a5',
          'teal-dark': '#25a88e',
        },
      },
    },
  },
  plugins: [],
}

export default config
