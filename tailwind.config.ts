import type { Config } from 'tailwindcss'
import { nextui } from '@nextui-org/react'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
    },
  },
  darkMode: 'class',
  plugins: [nextui({
    themes: {
      light: {
        colors: {
          primary: { DEFAULT: '#0070f3', foreground: '#fff' },
          secondary: { DEFAULT: '#7928ca', foreground: '#fff' },
          success: { DEFAULT: '#17c964', foreground: '#fff' },
          warning: { DEFAULT: '#f5a623', foreground: '#fff' },
          danger: { DEFAULT: '#f31260', foreground: '#fff' },
        },
      },
    },
  })],
}

export default config
