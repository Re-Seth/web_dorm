import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const ADMIN_STORAGE_KEY = 'taothong.admin'

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  try {
    const saved = JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY) || 'null')
    if (saved?.token) config.headers.Authorization = `Bearer ${saved.token}`
  } catch { /* ignore */ }
  return config
})

// token หมดอายุ / ไม่มีสิทธิ์ → เด้งกลับหน้า login แอดมิน
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const s = err.response?.status
    if ((s === 401 || s === 403) && !err.config.url.endsWith('/login')) {
      localStorage.removeItem(ADMIN_STORAGE_KEY)
      if (!location.pathname.startsWith('/admin/login')) location.href = '/admin/login'
    }
    return Promise.reject(err)
  },
)

export const errMsg = (e) => e.response?.data?.message || e.message || 'เกิดข้อผิดพลาด'

export default api
