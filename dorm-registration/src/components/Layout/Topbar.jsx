import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 border-b border-charcoal-line flex items-center justify-between px-6 shrink-0">
      <div>
        <p className="text-sm text-bone/50">ยินดีต้อนรับ</p>
        <p className="font-display font-medium">{user?.identifier || 'นิสิต'}</p>
      </div>
      <button onClick={handleLogout} className="btn-ghost text-sm px-4 py-2">
        ออกจากระบบ
      </button>
    </header>
  )
}
