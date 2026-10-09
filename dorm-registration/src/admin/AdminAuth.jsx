import { createContext, useContext, useState } from 'react'
import api, { ADMIN_STORAGE_KEY } from './api'

const Ctx = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY) || 'null') } catch { return null }
  })

  async function login(username, password) {
    const { data } = await api.post('/login', { username, password })
    if (data.user.role !== 'ADMIN') throw new Error('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ')
    const next = { token: data.token, user: data.user }
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(next))
    setAdmin(next)
  }

  function logout() {
    localStorage.removeItem(ADMIN_STORAGE_KEY)
    setAdmin(null)
  }

  return (
    <Ctx.Provider value={{ admin, user: admin?.user, isAdmin: !!admin?.token, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
