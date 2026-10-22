import { useEffect, useRef, useState } from 'react'
import { AirVent, BedDouble, ChevronsDown, Lamp, Shirt } from 'lucide-react'

// จุดเด่นของห้องที่ไฮไลต์ตามมุมกล้อง (ช่วง progress 0–1 เรียงตามลำดับการหมุน)
const FEATURES = [
  { until: 0.2, Icon: BedDouble, title: 'เตียง 2 ชั้น 2 ชุด รวม 4 เตียง', text: 'ที่นอนหนานุ่ม มีราวกันตกและบันไดขึ้นชั้นบน' },
  { until: 0.45, Icon: Lamp, title: 'โต๊ะอ่านหนังสือส่วนตัว 4 ที่', text: 'พร้อมเก้าอี้ โคมไฟ และชั้นวางหนังสือเหนือโต๊ะ' },
  { until: 0.7, Icon: Shirt, title: 'ตู้เสื้อผ้าแยกรายคน 4 บาน', text: 'มีตู้เย็นเล็กและกระจกแต่งตัวใกล้ประตู' },
  { until: 1.01, Icon: AirVent, title: 'หน้าต่างบานใหญ่ + เครื่องปรับอากาศ', text: 'รับแสงธรรมชาติ อากาศถ่ายเท และ Wi-Fi ทุกห้อง' },
]

// ห้องพักตัวอย่าง 3 มิติ: ส่วนนี้สูงหลายหน้าจอ โมเดลค้างอยู่กลางจอ (sticky) แล้วหมุนตามการเลื่อนหน้า
// three.js โหลดแยกไฟล์เมื่อเปิดหน้าแรกเท่านั้น (ไม่ทำให้หน้าอื่นโหลดช้า)
export default function Room3DSection() {
  const sectionRef = useRef(null)
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const barRef = useRef(null)
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState('loading') // loading, ready, failed
  const [headerH, setHeaderH] = useState(80)

  // ความสูงของแถบหัวเว็บ (มือถือมีเมนูแถวที่สอง) — ให้โมเดลค้างอยู่ใต้หัวเว็บพอดี
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const update = () => setHeaderH(header.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let scene = null
    let cancelled = false
    const cleanups = []

    const progress = () => {
      const rect = sectionRef.current.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      return total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0
    }
    const onScroll = () => {
      const p = progress()
      scene?.setProgress(p)
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`
      setStep(FEATURES.findIndex((f) => p < f.until))
    }

    import('./roomScene')
      .then(({ createRoomScene }) => {
        if (cancelled) return
        scene = createRoomScene(canvasRef.current)
        const ro = new ResizeObserver(([entry]) => scene.resize(entry.contentRect.width, entry.contentRect.height))
        ro.observe(wrapRef.current)
        // เรนเดอร์เฉพาะตอนส่วนนี้อยู่บนจอ
        const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? scene.start() : scene.stop()))
        io.observe(sectionRef.current)
        window.addEventListener('scroll', onScroll, { passive: true })
        cleanups.push(() => ro.disconnect(), () => io.disconnect(), () => window.removeEventListener('scroll', onScroll))
        onScroll()
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('failed'))

    return () => {
      cancelled = true
      cleanups.forEach((fn) => fn())
      scene?.dispose()
    }
  }, [])

  return (
    <section id="room3d" ref={sectionRef} className="relative h-[320vh] bg-gradient-to-b from-white via-japandi-sand/50 to-japandi-bg" aria-label="ห้องพักตัวอย่าง 3 มิติ">
      <div className="sticky overflow-hidden" style={{ top: headerH, height: `calc(100dvh - ${headerH}px)` }}>
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 py-4 lg:py-8 flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center">
          <div className="lg:col-span-4 shrink-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-japandi-terracotta block mb-2">3D Room Tour</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">ห้องพักตัวอย่างแบบ 3 มิติ</h2>
            <p className="text-japandi-muted text-sm mt-2 hidden sm:block">เลื่อนหน้าลงเพื่อหมุนชมทุกมุมของห้องพัก 4 เตียง ขนาดประมาณ 27 ตร.ม.</p>

            <ol className="mt-4 lg:mt-8 space-y-2">
              {FEATURES.map(({ Icon, title, text }, i) => (
                <li
                  key={title}
                  className={`flex gap-3 rounded-2xl p-3 transition-all duration-500 ${
                    i === step ? 'bg-white shadow-md border border-japandi-sand' : 'opacity-50 hidden lg:flex'
                  }`}
                >
                  <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${i === step ? 'bg-japandi-terracotta text-white' : 'bg-japandi-sand text-japandi-oak'}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{title}</p>
                    <p className={`text-xs text-japandi-muted mt-0.5 ${i === step ? '' : 'hidden'}`}>{text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 lg:mt-6 h-1 rounded-full bg-japandi-sand overflow-hidden">
              <div ref={barRef} className="h-full bg-japandi-terracotta origin-left" style={{ transform: 'scaleX(0)' }} />
            </div>
            <p className="text-[11px] text-japandi-muted mt-2 hidden lg:block">* โมเดลจำลองเพื่อประกอบการตัดสินใจ การจัดวางจริงอาจแตกต่างกันตามอาคาร</p>
          </div>

          <div ref={wrapRef} className="relative flex-1 min-h-0 lg:col-span-8 lg:h-full">
            <canvas ref={canvasRef} className={`w-full h-full block transition-opacity duration-700 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`} />
            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-japandi-muted">
                <span className="w-5 h-5 mr-2 rounded-full border-2 border-japandi-terracotta border-t-transparent animate-spin" /> กำลังสร้างห้องตัวอย่าง...
              </div>
            )}
            {status === 'failed' && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-japandi-muted text-center px-6">
                อุปกรณ์นี้ไม่รองรับการแสดงผล 3 มิติ — ดูรายละเอียดห้องได้ที่ส่วน "อาคารและห้องพัก" ด้านบน
              </div>
            )}
            <span className="absolute top-2 right-2 text-[11px] px-3 py-1 rounded-full bg-white/90 border border-japandi-sand font-medium">
              6 × 4.6 ม. · 4 เตียง
            </span>
            {step === 0 && status === 'ready' && (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-japandi-muted flex items-center gap-1 animate-bounce">
                <ChevronsDown size={14} /> เลื่อนลงเพื่อหมุนห้อง
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
