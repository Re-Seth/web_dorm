import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAdminAuth } from './AdminAuth'
import { errMsg } from './api'
import { ErrorBox } from './ui'

export default function AdminLogin() {
  const { isAdmin, login } = useAdminAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAdmin) return <Navigate to="/admin" replace />

  async function submit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await login(form.username, form.password)
      navigate('/admin')
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm">
        <p className="text-gold text-xs tracking-widest mb-1">DORM TAOTHONG</p>
        <h1 className="font-display text-2xl font-semibold mb-6">ระบบหลังบ้าน</h1>
        <ErrorBox message={error} />
        <label className="field-label" htmlFor="u">Username</label>
        <input id="u" className="field mb-4" autoFocus value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <label className="field-label" htmlFor="p">Password</label>
        <input id="p" type="password" className="field mb-6" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary w-full" disabled={busy || !form.username || !form.password}>
          {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
