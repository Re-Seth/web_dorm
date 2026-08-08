import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'taothong.auth'

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : { isAuthenticated: false, user: null }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  }, [auth])

  // NOTE: this is a frontend demo — "login/register" and OTP are simulated
  // client-side. A real deployment must verify credentials and OTP codes
  // against a backend / SMS-OTP or email-OTP provider.
  function login(user) {
    setAuth({ isAuthenticated: true, user })
  }

  function logout() {
    setAuth({ isAuthenticated: false, user: null })
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
