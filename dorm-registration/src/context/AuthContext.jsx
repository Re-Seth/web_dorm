import { createContext, useContext, useEffect, useState } from 'react'
import api, { clearToken, getToken } from '../studentApi'

const AuthContext = createContext(null)

const STORAGE_KEY = 'taothong.auth'

const fromServer = (me) => ({
  identifier: me.username,
  username: me.username,
  contact: me.email,
  name: me.name,
  role: me.role,
})

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null }
  })
  // ระหว่างตรวจ token กับ backend (ใช้ใน AdminRoute เพื่อรอ role ล่าสุด)
  const [loading, setLoading] = useState(() => !!getToken())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  }, [auth])

  // มี token → ดึงข้อมูลผู้ใช้ล่าสุด (รวม role) จาก backend
  useEffect(() => {
    if (!getToken()) return
    api.get('/me')
      .then(({ data }) => setAuth({ isAuthenticated: true, user: fromServer(data) }))
      .catch((err) => {
        // ออกจากระบบเฉพาะ token หมดอายุ/ไม่ถูกต้อง — ต่อ backend ไม่ได้ชั่วคราวให้ใช้ข้อมูลเดิมต่อ
        const status = err.response?.status
        if (status === 401 || status === 403) {
          clearToken()
          setAuth({ isAuthenticated: false, user: null })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function login(user) {
    setAuth({ isAuthenticated: true, user })
  }

  function logout() {
    clearToken()
    setAuth({ isAuthenticated: false, user: null })
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
