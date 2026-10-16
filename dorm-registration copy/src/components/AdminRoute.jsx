import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ShieldAlert } from 'lucide-react'

export default function AdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-red-950/40 border border-red-500/30 rounded-xl text-center">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-sm text-red-200/70 mb-4">
          หน้านี้สงวนสิทธิ์เฉพาะผู้จัดการหอพัก (Admin) เท่านั้น กรุณาเข้าสู่ระบบด้วยบัญชี Admin
        </p>
        <a
          href="/app"
          className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          กลับสู่หน้าหลัก
        </a>
      </div>
    )
  }

  return children
}
