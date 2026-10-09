import { NavLink } from 'react-router-dom'
import { useRegistration } from '../../context/RegistrationContext'

const linkBase =
  'flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors border-l-2 border-transparent'
const linkActive = 'bg-charcoal-soft text-gold border-gold'
const linkInactive = 'text-bone/70 hover:text-bone hover:bg-charcoal-soft/60'

export default function Sidebar() {
  const { infoCompleted, booking, payment } = useRegistration()

  return (
    <aside className="w-64 shrink-0 bg-charcoal border-r border-charcoal-line h-full flex flex-col">
      <div className="px-5 py-6">
        <p className="font-display font-bold text-gold text-lg leading-tight">หอพักเทาทอง</p>
        <p className="text-xs text-bone/50">ระบบลงทะเบียนหอพักนิสิต</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <NavLink to="/app" end className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          หน้าหลัก
        </NavLink>

        <p className="px-4 pt-4 pb-1 text-[11px] uppercase tracking-wider text-bone/30">ลงทะเบียนหอพัก</p>

        <NavLink to="/app/register" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          1. ข้อมูลนิสิต/ผู้ปกครอง
          {infoCompleted && <span className="ml-auto text-room-empty2 text-xs">✓</span>}
        </NavLink>

        <NavLink
          to="/app/rooms"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} ${!infoCompleted ? 'opacity-40 pointer-events-none' : ''}`}
        >
          2. เลือกห้องพัก
          {booking.confirmed && <span className="ml-auto text-room-empty2 text-xs">✓</span>}
        </NavLink>

        <NavLink
          to="/app/payment"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} ${!booking.confirmed ? 'opacity-40 pointer-events-none' : ''}`}
        >
          3. ชำระเงิน
          {payment.status === 'paid' && <span className="ml-auto text-room-empty2 text-xs">✓</span>}
        </NavLink>

        <NavLink
          to="/app/review"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} ${payment.status !== 'paid' ? 'opacity-40 pointer-events-none' : ''}`}
        >
          4. รีวิว / ให้ข้อเสนอแนะ
        </NavLink>
      </nav>

      <div className="px-5 py-4 border-t border-charcoal-line text-[11px] text-bone/40">
        มหาวิทยาลัยบูรพา · เทาทอง
      </div>
    </aside>
  )
}
