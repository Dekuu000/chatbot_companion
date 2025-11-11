import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Design System Colors
        primary: {
          DEFAULT: '#2952FF',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#00B8A9',
          foreground: '#FFFFFF',
        },
        // Text Colors
        text: {
          primary: '#0A0A0A',
          secondary: '#4A4A4A',
        },
        // Background Colors
        bg: {
          DEFAULT: '#F8F9FC',
          surface: '#FFFFFF',
        },
        border: '#E5E7EB',
        input: '#E5E7EB',
        ring: '#2952FF',
        muted: {
          DEFAULT: '#F8F9FC',
          foreground: '#4A4A4A',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0A0A0A',
        },
      },
      spacing: {
        // 8px grid system
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'large': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
