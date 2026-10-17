import { useNavigate } from 'react-router-dom'
import { LogOut, Menu, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { clearToken } from '../../studentApi'

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    logout()
    navigate('/')
  }

  return (
    <header className="h-20 shrink-0 bg-charcoal/90 backdrop-blur-md border-b border-charcoal-line flex items-center justify-between gap-3 px-4 sm:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenu} className="lg:hidden w-10 h-10 rounded-full border border-charcoal-line bg-white flex items-center justify-center" aria-label="เปิดเมนู">
          <Menu size={18} />
        </button>
        <span className="hidden sm:flex w-10 h-10 rounded-full bg-japandi-sand text-japandi-terracotta items-center justify-center shrink-0">
          <UserRound size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-bone/50">ยินดีต้อนรับ</p>
          <p className="font-display font-medium truncate">{user?.name || user?.identifier || 'ผู้เช่า'}</p>
        </div>
      </div>
      <button onClick={handleLogout} className="btn-ghost text-sm px-4 py-2 flex items-center gap-2 shrink-0">
        <LogOut size={15} /> <span className="hidden sm:inline">ออกจากระบบ</span>
      </button>
    </header>
  )
}
