import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, BookmarkCheck, ChevronRight, Dumbbell, FileSignature, Laptop, MapPin, Mars, PencilLine,
  Shirt, ShieldCheck, SquareParking, Venus, Wifi,
} from 'lucide-react'
import DormMap from '../components/landing/DormMap'
import LoginCard from '../components/landing/LoginCard'
import SiteHeader from '../components/landing/SiteHeader'
import { BUILDINGS, GENDER_LABEL, ROOM_FILTERS } from '../data/landing'
import useRegistrationPeriod from '../hooks/useRegistrationPeriod'

const AMENITIES = [
  { icon: Wifi, title: 'Wi-Fi ความเร็วสูง', text: 'ไฟเบอร์ออพติกทุกห้องพัก' },
  { icon: ShieldCheck, title: 'รักษาความปลอดภัย', text: 'CCTV & คีย์การ์ด 24 ชม.' },
  { icon: Laptop, title: 'Rooftop Co-Working', text: 'พื้นที่อ่านหนังสือ & ทำงาน' },
  { icon: Dumbbell, title: 'Fitness Room', text: 'ห้องออกกำลังกายทันสมัย' },
  { icon: SquareParking, title: 'ลานจอดรถ', text: 'รถยนต์ & มอเตอร์ไซค์' },
  { icon: Shirt, title: 'Laundry Room', text: 'เครื่องซัก-อบผ้าหยอดเหรียญ' },
]

const genderStyle = {
  Male: { badge: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-500', Icon: Mars },
  Female: { badge: 'bg-pink-600', text: 'text-pink-600', border: 'border-pink-400', Icon: Venus },
}

// ค่อย ๆ แสดง section เมื่อเลื่อนมาถึง
function Reveal({ as: Tag = 'section', className = '', children, ...rest }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { setVisible(true); return }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect() }
    }, { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12">
      <span className="text-xs font-semibold uppercase tracking-widest text-japandi-terracotta block mb-2">{eyebrow}</span>
      <h2 className="font-display text-3xl font-bold">{title}</h2>
      {text && <p className="text-japandi-muted text-sm mt-2">{text}</p>}
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [activePin, setActivePin] = useState(null)
  const reg = useRegistrationPeriod()
  const regBadge = {
    OPEN: [`เปิดรับลงทะเบียนผู้เช่า${reg.period?.term ? ` ${reg.period.term}` : ''}`, 'bg-japandi-terracotta animate-pulse'],
    UPCOMING: ['เร็ว ๆ นี้: เปิดรับลงทะเบียนผู้เช่ารอบใหม่', 'bg-amber-500'],
    CLOSED: ['ปิดรับลงทะเบียนรอบนี้แล้ว — ติดตามรอบถัดไป', 'bg-japandi-muted'],
  }[reg.status]

  // ไปหน้าลงทะเบียนแบบค่อย ๆ จางออก (หน้าใหม่ค่อย ๆ จางเข้าเอง) แทนการเปลี่ยนหน้าทันที
  const [leaving, setLeaving] = useState(false)
  const openApply = (dormId) => {
    if (leaving) return
    setLeaving(true)
    setTimeout(() => navigate(dormId ? `/apply?dorm=${dormId}` : '/apply'), 250)
  }
  const visibleBuildings = BUILDINGS.filter((b) => filter === 'all' || b.roomTypes.includes(filter))

  return (
    <div className={`theme-japandi min-h-screen flex flex-col bg-japandi-bg text-japandi-oak font-body selection:bg-japandi-terracotta selection:text-white transition-opacity duration-300 ${leaving ? 'opacity-0' : 'animate-page-in'}`}>
      <SiteHeader showNav />

      <main id="top" className="flex-grow">
        {/* 1. HERO */}
        <section id="about" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              {regBadge && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-japandi-sand text-xs font-medium">
                  <span className={`w-2 h-2 rounded-full ${regBadge[1]}`} />
                  {regBadge[0]}
                </div>
              )}
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                สัมผัสชีวิตสมดุลในสไตล์ <span className="text-japandi-terracotta font-normal italic">Japandi</span>
                <br />ณ หอพักเทาทอง
              </h1>
              <p className="text-japandi-muted text-base sm:text-lg leading-relaxed font-light">
                ที่พักอาศัยร่วมสมัยสำหรับนิสิตและคนทำงาน ออกแบบด้วยความเรียบง่าย อบอุ่น ผสานฟังก์ชันการใช้งานอย่างลงตัว
                พร้อมระบบรักษาความปลอดภัย 24 ชั่วโมง และสิ่งอำนวยความสะดวกครบครัน
              </p>
              <div className="pt-2 flex flex-wrap gap-4 items-center">
                <button onClick={() => openApply()} className="px-7 py-3.5 rounded-full bg-japandi-oak text-white font-medium hover:bg-black transition shadow-lg flex items-center gap-3">
                  ลงทะเบียนจองห้องพัก <ArrowRight size={14} />
                </button>
                <a href="#buildings" className="px-7 py-3.5 rounded-full bg-white border border-japandi-sand font-medium hover:bg-japandi-sand/50 transition">
                  ชมอาคาร เทาทอง 1-4
                </a>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-japandi-sand">
                {[['4 ตึก', 'โซนชาย & หญิง'], ['24 ชม.', 'รักษาความปลอดภัย'], ['High-Speed', 'Wi-Fi ไฟเบอร์ออพติก']].map(([big, small]) => (
                  <div key={big}>
                    <span className="block text-xl sm:text-2xl font-bold">{big}</span>
                    <span className="text-xs text-japandi-muted">{small}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-japandi-sand">
                <img
                  src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80"
                  alt="ห้องพักหอพักเทาทองตกแต่งสไตล์ Japandi"
                  className="w-full h-[320px] sm:h-[420px] object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-japandi-sand flex items-center justify-between gap-3 shadow-lg">
                  <div>
                    <span className="text-xs font-semibold text-japandi-terracotta uppercase tracking-wider block">สถาปัตยกรรมอบอุ่น</span>
                    <h4 className="text-sm font-semibold">เน้นแสงธรรมชาติ & วัสดุไม้แอชแท้</h4>
                  </div>
                  <span className="text-xs px-3 py-1 bg-japandi-sand rounded-full font-medium whitespace-nowrap">Japandi Living</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. BUILDINGS */}
        <Reveal id="buildings" className="py-16 bg-white border-y border-japandi-sand scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Our Buildings & Layouts"
              title="อาคารหอพักเทาทอง 1 - 4"
              text="แบ่งโซนการพักอาศัยเป็นสัดส่วนเพื่อความเป็นส่วนตัว ปลอดภัย และสะดวกสบายที่สุด"
            />
            <div className="flex flex-wrap justify-center gap-2 -mt-6 mb-10">
              {ROOM_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={
                    'border border-japandi-sand px-4 py-2 rounded-full text-xs font-medium transition ' +
                    (filter === f.id ? 'bg-japandi-oak text-white' : 'bg-japandi-bg hover:bg-japandi-sand')
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {visibleBuildings.map((b) => {
                const g = genderStyle[b.gender]
                return (
                  <article key={b.id} className="bg-japandi-bg rounded-2xl overflow-hidden border border-japandi-sand hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col">
                    <div className="relative h-48 overflow-hidden">
                      <img src={b.image} alt={b.name} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      <span className={`absolute top-3 left-3 ${g.badge} text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1`}>
                        <g.Icon size={12} /> {b.name} ({GENDER_LABEL[b.gender]})
                      </span>
                    </div>
                    <div className="p-5 flex-grow flex flex-col justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold">หอพัก{b.name}</h3>
                        <p className="text-xs text-japandi-muted mt-1">{b.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {b.tags.map((t) => (
                            <span key={t} className="text-[10px] bg-white border border-japandi-sand px-2 py-0.5 rounded">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-japandi-sand flex items-center justify-between">
                        <div>
                          <span className="text-xs text-japandi-muted block">เริ่มต้น</span>
                          <span className="text-base font-bold text-japandi-terracotta">
                            ฿{b.price.toLocaleString()} <span className="text-xs font-normal text-japandi-oak">/เดือน</span>
                          </span>
                        </div>
                        <button
                          onClick={() => openApply(b.id)}
                          className="px-3 py-1.5 rounded-lg bg-japandi-oak text-white text-xs hover:bg-black transition"
                        >
                          เลือกจองตึกนี้
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            {visibleBuildings.length === 0 && (
              <p className="text-center text-sm text-japandi-muted mt-8">ไม่พบห้องพักประเภทนี้</p>
            )}
          </div>
        </Reveal>

        {/* 3. AMENITIES */}
        <Reveal id="amenities" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
          <SectionHeading
            eyebrow="Modern Living Amenities"
            title="สิ่งอำนวยความสะดวกครบครัน"
            text="เติมเต็มทุกไลฟ์สไตล์การเรียนและการทำงานด้วยพื้นที่ส่วนกลางมาตรฐานสูง"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {AMENITIES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-white p-6 rounded-2xl text-center border border-japandi-sand hover:border-japandi-terracotta hover:-translate-y-1 transition duration-300">
                <div className="w-12 h-12 rounded-full bg-japandi-sand text-japandi-terracotta flex items-center justify-center mx-auto mb-3">
                  <Icon size={20} />
                </div>
                <h4 className="font-bold text-sm">{title}</h4>
                <p className="text-[11px] text-japandi-muted mt-1">{text}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* 4. LOCATION */}
        <Reveal id="location" className="py-16 bg-white border-t border-japandi-sand scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-japandi-terracotta block">Location Pinpoint</span>
              <h2 className="font-display text-3xl font-bold">ตำแหน่งและแผนที่โครงการ</h2>
              <p className="text-japandi-muted text-sm leading-relaxed">
                ตั้งอยู่ในทำเลศักยภาพ การเดินทางสะดวกสบาย ใกล้มหาวิทยาลัย ร้านอาหาร ร้านสะดวกซื้อ 24 ชั่วโมง และสิ่งอำนวยความสะดวกโดยรอบ
              </p>
              <div className="space-y-3">
                {BUILDINGS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setActivePin(b.id)}
                    aria-pressed={activePin === b.id}
                    className={
                      'w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between font-medium text-xs sm:text-sm ' +
                      (activePin === b.id ? 'bg-japandi-sand border-japandi-terracotta' : 'bg-japandi-bg border-japandi-sand hover:bg-japandi-sand/60')
                    }
                  >
                    <span className="flex items-center gap-2">
                      <MapPin size={16} className={genderStyle[b.gender].text} />
                      {b.name} ({GENDER_LABEL[b.gender]}) - {b.mapHighlight}
                    </span>
                    <ChevronRight size={14} className="text-japandi-muted" />
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <DormMap buildings={BUILDINGS} activeId={activePin} onSelect={setActivePin} />
            </div>
          </div>
        </Reveal>

        {/* 5. REGISTER + LOGIN */}
        <Reveal id="register" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
            <div className="lg:col-span-3 bg-japandi-oak text-japandi-sand rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden flex flex-col justify-between gap-8">
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-japandi-terracotta/20 pointer-events-none" aria-hidden="true" />
              <div className="absolute -right-4 bottom-0 w-40 h-40 rounded-full bg-japandi-wood/10 pointer-events-none" aria-hidden="true" />
              <div className="relative space-y-5">
                <div className="w-14 h-14 rounded-full bg-white/10 text-japandi-wood flex items-center justify-center">
                  <FileSignature size={24} />
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">พร้อมย้ายเข้าสู่ เทาทอง Residence แล้วหรือยัง?</h2>
                <p className="text-sm text-japandi-sand/80 max-w-md leading-relaxed">
                  ลงทะเบียนออนไลน์เพื่อสำรองห้องพักและกรอกข้อมูลผู้เช่าล่วงหน้า ระบบจะคัดกรองตึกตามเพศให้อัตโนมัติ
                </p>
                <ul className="space-y-2 text-sm text-japandi-sand/90">
                  <li className="flex items-center gap-2"><PencilLine size={15} className="text-japandi-wood" /> แก้ไขข้อมูลได้ภายหลังที่หน้า "ข้อมูลผู้เช่า"</li>
                  <li className="flex items-center gap-2"><BookmarkCheck size={15} className="text-japandi-wood" /> เลือกเก็บข้อมูลไว้ลงทะเบียนภาคเรียนถัดไปได้</li>
                </ul>
              </div>
              <button onClick={() => openApply()} className="relative self-start px-8 py-3.5 rounded-full bg-japandi-terracotta text-white font-medium hover:bg-japandi-terracotta-dark transition shadow-md flex items-center gap-2">
                เริ่มลงทะเบียนผู้เช่าใหม่ <ArrowRight size={14} />
              </button>
            </div>

            <div id="login" className="lg:col-span-2 scroll-mt-24">
              <LoginCard className="h-full" />
            </div>
          </div>
        </Reveal>
      </main>

      {/* FOOTER */}
      <footer className="bg-japandi-oak text-japandi-sand py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-japandi-terracotta text-white flex items-center justify-center font-bold text-sm">TT</div>
                <span className="text-lg font-bold text-white">เทาทอง Residence</span>
              </div>
              <p className="text-xs text-japandi-wood leading-relaxed">หอพักนิสิตและบุคลากร สไตล์ Japandi เรียบง่าย อบอุ่น พร้อมสิ่งอำนวยความสะดวกครบวงจร</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">อาคารหอพัก</h4>
              <ul className="space-y-2 text-xs text-japandi-wood">
                {BUILDINGS.map((b) => (
                  <li key={b.id}><a href="#buildings" className="hover:text-white transition">{b.name} ({GENDER_LABEL[b.gender]})</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">การติดต่อ</h4>
              <ul className="space-y-2 text-xs text-japandi-wood">
                <li>โทร 02-123-4567 / 081-987-6543</li>
                <li>info@taothong-residence.com</li>
                <li>LINE @taothong_dorm</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">เวลาทำการสำนักงาน</h4>
              <p className="text-xs text-japandi-wood">จันทร์ - อาทิตย์: 08:30 - 18:30 น.<br />(เจ้าหน้าที่รักษาความปลอดภัยดูแล 24 ชม.)</p>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 text-center text-xs text-japandi-wood">
            © {new Date().getFullYear()} Tao Thong Residence. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
