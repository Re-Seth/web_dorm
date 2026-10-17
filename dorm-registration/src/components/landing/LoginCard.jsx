import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LoaderCircle, LogIn, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api, { clearToken, errMsg, setToken } from '../../studentApi'

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-japandi-sand bg-white text-sm text-japandi-oak placeholder:text-japandi-muted/70 outline-none transition focus:border-japandi-terracotta focus:ring-2 focus:ring-japandi-terracotta/20'

// กล่องเข้าสู่ระบบ (อีเมล หรือ username) → ไปหน้าข้อมูลผู้เช่า
export default function LoginCard({ redirectTo = '/app', className = '' }) {
  const { isAuthenticated, user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.username.trim() || !form.password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }
    setBusy(true)
    try {
      const username = form.username.trim()
      const { data } = await api.post('/login', {
        username: username.includes('@') ? username.toLowerCase() : username,
        password: form.password,
      })
      clearToken()
      setToken(data.token)
      login({ identifier: data.user.username, username: data.user.username, contact: data.user.email, name: data.user.name, role: data.user.role })
      // ผู้จัดการหอพักไปหน้าระบบจัดการหอพักโดยตรง
      navigate(data.user.role === 'ADMIN' ? '/app/admin' : redirectTo)
    } catch (err) {
      setError(err.response?.status === 401 ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  if (isAuthenticated) {
    return (
      <div className={`bg-white rounded-3xl p-8 border border-japandi-sand shadow-xl flex flex-col justify-center text-center gap-4 ${className}`}>
        <div className="w-14 h-14 rounded-full bg-japandi-sand text-japandi-terracotta flex items-center justify-center mx-auto">
          <UserRound size={24} />
        </div>
        <div>
          <p className="text-xs text-japandi-muted">เข้าสู่ระบบอยู่ในชื่อ</p>
          <p className="font-display font-bold text-lg break-all">{user?.name || user?.identifier}</p>
        </div>
        <Link to={user?.role === 'ADMIN' ? '/app/admin' : redirectTo} className="px-6 py-3 rounded-full bg-japandi-oak text-white text-sm font-medium hover:bg-black transition flex items-center justify-center gap-2">
          {user?.role === 'ADMIN' ? 'ไประบบจัดการหอพัก' : 'ไปหน้าหลักผู้เช่า'} <ArrowRight size={14} />
        </Link>
        <button onClick={() => { clearToken(); logout() }} className="text-xs text-japandi-muted hover:text-japandi-terracotta transition">
          ไม่ใช่คุณ? ออกจากระบบ
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={`bg-white rounded-3xl p-8 border border-japandi-sand shadow-xl space-y-4 ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-full bg-japandi-sand text-japandi-terracotta flex items-center justify-center shrink-0">
          <LogIn size={20} />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold leading-tight">เข้าสู่ระบบผู้เช่า</h3>
          <p className="text-xs text-japandi-muted">ดูและแก้ไขข้อมูลที่ใช้สมัคร</p>
        </div>
      </div>

      <div>
        <label htmlFor="login-username" className="block text-xs font-medium mb-1">อีเมล</label>
        <input
          id="login-username"
          type="text"
          autoComplete="username"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          className={inputCls}
          placeholder="example@email.com"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="block text-xs font-medium mb-1">รหัสผ่าน</label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className={`${inputCls} pr-11`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-japandi-muted hover:bg-japandi-bg flex items-center justify-center"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{error}</p>}

      <button type="submit" disabled={busy} className="w-full px-6 py-3 rounded-full bg-japandi-oak text-white text-sm font-medium hover:bg-black transition shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : <LogIn size={15} />}
        เข้าสู่ระบบ
      </button>
      <p className="text-xs text-center text-japandi-muted">
        ยังไม่มีบัญชี? <Link to="/apply" className="text-japandi-terracotta font-medium hover:underline">ลงทะเบียนผู้เช่าใหม่</Link>
      </p>
    </form>
  )
}
