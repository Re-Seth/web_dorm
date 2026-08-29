import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  BedDouble,
  CreditCard,
  ReceiptText,
  Star,
  Zap
} from 'lucide-react'

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/register', label: 'ลงทะเบียนหอพัก', icon: UserPlus },
  { to: '/app/rooms', label: 'เลือกห้องพัก', icon: BedDouble },
  { to: '/app/payment', label: 'ชำระเงิน', icon: CreditCard },
  { to: '/app/receipt', label: 'ใบเสร็จรับเงิน', icon: ReceiptText },
  { to: '/app/review', label: 'ประเมิน & รีวิว', icon: Star },
  { to: '/app/services', label: 'ค่าไฟ & แจ้งซ่อม', icon: Zap }
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold tracking-wider text-white">DORM TAOTHONG</h2>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              {Icon && <Icon className="w-5 h-5" />}
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}