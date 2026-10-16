/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "เทาทอง" (grey-gold) identity — charcoal ground, brass-gold signal
        charcoal: {
          DEFAULT: '#1C1F22',
          soft: '#24282C',
          line: '#31363B',
        },
        gold: {
          DEFAULT: '#C7A03D',
          soft: '#E4C972',
          deep: '#8F6E1F',
        },
        bone: '#F4F1E8',
        room: {
          empty: '#2E7D5B',   // 0-1 คน — ว่าง
          empty2: '#3F9E73',
          mid: '#D8A61C',     // 2 คน — ใกล้เต็ม
          full: '#B5453B',    // เต็ม
        },
      },
      fontFamily: {
        display: ['"Prompt"', 'sans-serif'],
        body: ['"Noto Sans Thai"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
}
