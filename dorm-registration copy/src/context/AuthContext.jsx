import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

const STORAGE_KEY = 'taothong.auth'
const TOKEN_KEY = 'taothong.token'

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  }, [auth])

  // ดึงข้อมูลผู้ใช้ล่าสุดจาก Backend บน SQLite เมื่อมี Token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      authApi
        .getMe()
        .then((res) => {
          setAuth({ isAuthenticated: true, user: res.data })
        })
        .catch((err) => {
          // ออกจากระบบเฉพาะกรณี Token หมดอายุหรือไม่ถูกต้อง
          // ถ้าแค่ต่อ Backend ไม่ได้ชั่วคราว (เช่น กำลังรีสตาร์ท) ให้ใช้ข้อมูลที่บันทึกไว้ต่อ
          const status = err.response?.status
          if (status === 401 || status === 403) {
            localStorage.removeItem(TOKEN_KEY)
            setAuth({ isAuthenticated: false, user: null })
          }
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  function login(userData, token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    }
    setAuth({ isAuthenticated: true, user: userData })
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STORAGE_KEY)
    setAuth({ isAuthenticated: false, user: null })
  }

  async function refreshUser() {
    try {
      const res = await authApi.getMe()
      setAuth((prev) => ({ ...prev, user: res.data }))
      return res.data
    } catch (e) {
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
