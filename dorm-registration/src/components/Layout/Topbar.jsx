import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const displayName = user?.name || user?.username || user?.identifier || 'นิสิต'

  return (
    <header className="h-16 border-b border-charcoal-line flex items-center justify-between px-6 shrink-0">
      <div>
        <p className="text-xs text-bone/50">ยินดีต้อนรับ</p>
        <div className="flex items-center gap-2">
          <p className="font-display font-medium text-gold">{displayName}</p>
          {user?.role === 'ADMIN' ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              👑 ผู้จัดการหอพัก
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
              นิสิต
            </span>
          )}
        </div>
      </div>
      <button onClick={handleLogout} className="btn-ghost text-sm px-4 py-2 hover:text-white transition-colors">
        ออกจากระบบ
      </button>
    </header>
  )
}
