/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "เทาทอง" (grey-gold) identity — charcoal ground, brass-gold signal
        // ค่าสีมาจาก CSS variables ใน index.css: ค่าเริ่มต้นเป็นโทนเข้ม (หลังบ้าน)
        // และ .theme-japandi สลับเป็นโทนครีม/เทอร์ราคอตตา (ฝั่งนิสิต)
        charcoal: {
          DEFAULT: 'rgb(var(--c-charcoal) / <alpha-value>)',
          soft: 'rgb(var(--c-charcoal-soft) / <alpha-value>)',
          line: 'rgb(var(--c-charcoal-line) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)',
          soft: 'rgb(var(--c-gold-soft) / <alpha-value>)',
          deep: 'rgb(var(--c-gold-deep) / <alpha-value>)',
        },
        bone: 'rgb(var(--c-bone) / <alpha-value>)',
        // โทน Japandi สำหรับหน้าแรก (Landing)
        japandi: {
          bg: '#FAF7F2',
          sand: '#EFE7DA',
          terracotta: '#C86D51',
          'terracotta-dark': '#B0593E',
          oak: '#3D332A',
          wood: '#D4B895',
          muted: '#7A7068',
        },
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
