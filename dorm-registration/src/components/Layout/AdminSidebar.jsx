import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  BedDouble,
  CreditCard,
  ReceiptText,
  Star,
  Zap,
  ShieldCheck,
  Lock,
  X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const userNavItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/register', label: 'ลงทะเบียนหอพัก', icon: UserPlus },
  { to: '/app/rooms', label: 'เลือกห้องพัก', icon: BedDouble },
  { to: '/app/payment', label: 'ชำระเงิน', icon: CreditCard },
  { to: '/app/receipt', label: 'ใบเสร็จรับเงิน', icon: ReceiptText },
  { to: '/app/review', label: 'ประเมิน & รีวิว', icon: Star },
  { to: '/app/services', label: 'ค่าไฟ & แจ้งซ่อม', icon: Zap }
]

const adminNavItems = [
  { to: '/app/admin', label: 'แดชบอร์ดผู้จัดการ (Admin)', icon: ShieldCheck, highlight: true },
  { to: '/app', label: 'หน้าหลักนิสิต', icon: LayoutDashboard, end: true },
  { to: '/app/rooms', label: 'ผังห้องพักรวม', icon: BedDouble },
  { to: '/app/services', label: 'มอนิเตอร์ไฟฟ้า & แจ้งซ่อม', icon: Zap }
]

// เมนูด้านข้างของผู้จัดการหอพัก — มาจากโปรเจกต์ kit (ผู้จัดการไม่มีหน้าที่ถูกล็อกตามขั้นตอนลงทะเบียน)
export default function AdminSidebar({ open = false, onClose }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const lockReason = () => null

  return (
    <>
    {/* มือถือ: เมนูเลื่อนออกมาจากซ้าย + ฉากหลัง / จอใหญ่: แสดงค้างไว้ */}
    <div
      className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
      aria-hidden="true"
    />
    <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800 transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 border-b border-slate-800 relative">
        <button onClick={onClose} className="lg:hidden absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-800" aria-label="ปิดเมนู">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold tracking-wider text-white pr-8 lg:pr-0">DORM TAOTHONG</h2>
        {isAdmin ? (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>ผู้จัดการหอพัก</span>
          </div>
        ) : (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
            <span>ระบบนิสิต</span>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {/* If user is Admin, show Admin Menu at the top */}
        {isAdmin && (
          <div className="mb-4 pb-2 border-b border-slate-800">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-amber-400/80 mb-2">
              เมนูผู้จัดการหอพัก
            </p>
            <NavLink
              to="/app/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-extrabold'
                    : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                }`
              }
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>ระบบจัดการหอพัก 👑</span>
            </NavLink>
          </div>
        )}

        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {isAdmin ? 'มุมมองระบบนิสิต' : 'เมนูหลัก'}
        </p>

        {(isAdmin ? adminNavItems.filter((i) => !i.highlight) : userNavItems).map((item) => {
          const Icon = item.icon
          const locked = lockReason(item.to)
          if (locked) {
            return (
              <div
                key={item.to}
                title={locked}
                aria-disabled="true"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed select-none"
              >
                {Icon && <Icon className="w-5 h-5 shrink-0" />}
                <span className="flex-1">{item.label}</span>
                <Lock className="w-3.5 h-3.5 shrink-0" />
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              {Icon && <Icon className="w-5 h-5 shrink-0" />}
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
    </>
  )
}