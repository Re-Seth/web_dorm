import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BedDouble, ClipboardList, Wrench, Users, LogOut } from 'lucide-react'
import { useAdminAuth } from './AdminAuth'

const items = [
  { to: '/admin', label: 'ภาพรวม', icon: LayoutDashboard, end: true },
  { to: '/admin/rooms', label: 'ห้องพัก', icon: BedDouble },
  { to: '/admin/bookings', label: 'การจอง & ชำระเงิน', icon: ClipboardList },
  { to: '/admin/maintenance', label: 'แจ้งซ่อม', icon: Wrench },
  { to: '/admin/users', label: 'ผู้ใช้งาน', icon: Users },
]

export default function AdminLayout() {
  const { isAdmin, user, logout } = useAdminAuth()
  const navigate = useNavigate()
  if (!isAdmin) return <Navigate to="/admin/login" replace />

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="w-60 shrink-0 bg-charcoal-soft border-r border-charcoal-line flex flex-col">
        <div className="p-5 border-b border-charcoal-line">
          <p className="font-display font-semibold tracking-wider">DORM TAOTHONG</p>
          <p className="text-xs text-gold mt-0.5">Admin Console</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-gold text-charcoal font-medium' : 'text-bone/70 hover:bg-charcoal hover:text-bone'}`}>
              <Icon className="w-4 h-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-charcoal-line text-sm">
          <p className="text-bone/50 text-xs">เข้าสู่ระบบเป็น</p>
          <p className="font-medium mb-3 truncate">{user?.name || user?.username}</p>
          <button className="btn-ghost w-full text-sm py-2 flex items-center justify-center gap-2"
            onClick={() => { logout(); navigate('/admin/login') }}>
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 sm:p-8"><Outlet /></main>
    </div>
  )
}
