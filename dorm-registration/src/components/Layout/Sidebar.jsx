import { Link, NavLink } from 'react-router-dom'
import { BedDouble, Check, CreditCard, House, LayoutDashboard, Star, Wrench, X } from 'lucide-react'
import { useRegistration } from '../../context/RegistrationContext'

const linkBase = 'flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition'
const linkActive = 'bg-japandi-oak text-white shadow-md'
const linkInactive = 'text-bone/75 hover:bg-charcoal-line/60 hover:text-bone'
const linkClass = (locked) => ({ isActive }) =>
  `${linkBase} ${isActive ? linkActive : linkInactive} ${locked ? 'opacity-40 pointer-events-none' : ''}`

export default function Sidebar({ open, onClose }) {
  const { infoCompleted, booking, payment } = useRegistration()

  const flow = [
    { to: '/app/rooms', label: 'เลือกห้องพัก', Icon: BedDouble, done: booking.confirmed, locked: !infoCompleted },
    { to: '/app/payment', label: 'ชำระเงิน', Icon: CreditCard, done: payment.status === 'paid', locked: !booking.confirmed },
    { to: '/app/review', label: 'รีวิว / ข้อเสนอแนะ', Icon: Star, done: false, locked: payment.status !== 'paid' },
  ]

  return (
    <>
      {/* ฉากหลังเมนูบนมือถือ */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 shrink-0 bg-white border-r border-charcoal-line h-full flex flex-col transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="เมนูหลัก"
      >
        <div className="px-5 h-20 flex items-center justify-between border-b border-charcoal-line">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="w-10 h-10 rounded-full bg-japandi-terracotta text-white flex items-center justify-center font-bold shadow-sm group-hover:bg-japandi-terracotta-dark transition">TT</span>
            <span>
              <span className="font-display font-semibold block leading-tight">เทาทอง <span className="text-japandi-terracotta font-light">Residence</span></span>
              <span className="text-[11px] text-bone/50">พื้นที่ผู้เช่า</span>
            </span>
          </Link>
          <button onClick={onClose} className="lg:hidden w-9 h-9 rounded-full hover:bg-charcoal-line/60 flex items-center justify-center" aria-label="ปิดเมนู">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          <NavLink to="/app" end className={linkClass(false)}>
            <LayoutDashboard size={17} /> หน้าหลักผู้เช่า
            {infoCompleted && <Check size={14} className="ml-auto text-room-empty2" />}
          </NavLink>

          <p className="px-4 pt-5 pb-1 text-[11px] uppercase tracking-widest text-bone/40">ขั้นตอนเข้าพัก</p>
          {flow.map(({ to, label, Icon, done, locked }) => (
            <NavLink key={to} to={to} className={linkClass(locked)}>
              <Icon size={17} /> {label}
              {done && <Check size={14} className="ml-auto text-room-empty2" />}
            </NavLink>
          ))}

          <p className="px-4 pt-5 pb-1 text-[11px] uppercase tracking-widest text-bone/40">บริการหอพัก</p>
          <NavLink to="/app/services" className={linkClass(false)}>
            <Wrench size={17} /> ค่าไฟ & แจ้งซ่อม
          </NavLink>
        </nav>

        <div className="p-4 border-t border-charcoal-line">
          <Link to="/" className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm text-bone/70 hover:bg-charcoal-line/60 transition">
            <House size={16} /> กลับหน้าแรกเว็บไซต์
          </Link>
        </div>
      </aside>
    </>
  )
}
