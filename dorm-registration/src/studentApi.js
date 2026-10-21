import axios from 'axios'

// URL ของ backend: dev = http://localhost:5000 / Docker = '/_api' (nginx ส่งต่อให้ backend — เปิดจากเครื่องอื่นใน LAN ได้)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'taothong.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const t = getToken()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

// ข้อความ error สำหรับผู้ใช้: ใช้ข้อความจาก backend ก่อนเสมอ (403 เช่น "นอกรอบลงทะเบียน" ไม่ใช่เซสชันหมดอายุ)
export function errMsg(e) {
  const s = e.response?.status
  if (!e.response) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือลองใหม่อีกครั้ง'
  if (s === 401) return 'เซสชันหมดอายุ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่'
  const message = typeof e.response.data === 'object' ? e.response.data?.message : null
  if (message) return message
  if (s === 403) return 'คุณไม่มีสิทธิ์ทำรายการนี้'
  if (s === 413) return 'ข้อมูลที่ส่งมีขนาดใหญ่เกินไป'
  if (s === 429) return 'ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

export default api
