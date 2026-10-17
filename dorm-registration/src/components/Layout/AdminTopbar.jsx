import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Wrench } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useMaintenanceAlerts } from '../../hooks/useMaintenanceAlerts'

const STATUS_LABEL = {
  PENDING: 'รอดำเนินการ',
  IN_PROGRESS: 'กำลังซ่อม',
  COMPLETED: 'เสร็จสิ้น'
}

function MaintenanceBell() {
  const navigate = useNavigate()
  const { requests, unseen, lastSeenId, latestIncoming, clearLatestIncoming, markAllSeen } =
    useMaintenanceAlerts()
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // ซ่อน toast แจ้งซ่อมใหม่อัตโนมัติ
  useEffect(() => {
    if (!latestIncoming) return
    const t = setTimeout(clearLatestIncoming, 6000)
    return () => clearTimeout(t)
  }, [latestIncoming])

  function goToMaintenance() {
    markAllSeen()
    setOpen(false)
    clearLatestIncoming()
    navigate('/app/admin?tab=maintenance')
  }

  const reporter = (r) => r.user?.name || r.user?.username || 'นิสิต'

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        title="การแจ้งซ่อม"
      >
        <Bell className="w-5 h-5" />
        {unseen.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
            {unseen.length > 99 ? '99+' : unseen.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-bold text-white">การแจ้งซ่อม</span>
            {unseen.length > 0 && (
              <button onClick={markAllSeen} className="text-xs text-amber-400 hover:underline">
                อ่านทั้งหมดแล้ว
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
            {requests.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">ยังไม่มีการแจ้งซ่อม</p>
            ) : (
              requests.slice(0, 8).map((r) => (
                <button
                  key={r.id}
                  onClick={goToMaintenance}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-800/70 transition-colors ${
                    r.id > lastSeenId ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">
                      {r.id > lastSeenId && <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5" />}
                      {reporter(r)}
                    </span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {new Date(r.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    ห้อง {r.roomCode || r.roomId} · {r.title} · {STATUS_LABEL[r.status] || r.status}
                  </p>
                </button>
              ))
            )}
          </div>
          <button
            onClick={goToMaintenance}
            className="w-full px-4 py-2.5 text-xs font-semibold text-amber-400 hover:bg-slate-800 border-t border-slate-800"
          >
            ไปที่หน้าจัดการแจ้งซ่อม →
          </button>
        </div>
      )}

      {latestIncoming && (
        <button
          onClick={goToMaintenance}
          className="fixed top-20 right-6 z-50 flex items-start gap-3 max-w-sm text-left px-4 py-3 rounded-xl bg-slate-900 border border-amber-500/40 shadow-2xl"
        >
          <Wrench className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">มีการแจ้งซ่อมใหม่</p>
            <p className="text-xs text-slate-300">
              {reporter(latestIncoming)} · ห้อง {latestIncoming.roomCode || latestIncoming.roomId} · {latestIncoming.title}
            </p>
          </div>
        </button>
      )}
    </div>
  )
}

// แถบด้านบนของผู้จัดการหอพัก (มีกระดิ่งแจ้งซ่อม Real-time) — มาจากโปรเจกต์ kit
export default function AdminTopbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const displayName = user?.name || user?.username || user?.identifier || 'นิสิต'
  const isAdmin = user?.role === 'ADMIN'

  return (
    <header className="h-16 border-b border-charcoal-line flex items-center justify-between px-6 shrink-0">
      <div>
        <p className="text-xs text-bone/50">ยินดีต้อนรับ</p>
        <div className="flex items-center gap-2">
          <p className="font-display font-medium text-gold">{displayName}</p>
          {isAdmin ? (
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
      <div className="flex items-center gap-3">
        {isAdmin && <MaintenanceBell />}
        <button onClick={handleLogout} className="btn-ghost text-sm px-4 py-2 hover:text-white transition-colors">
          ออกจากระบบ
        </button>
      </div>
    </header>
  )
}
