// API ที่ไฟล์จากโปรเจกต์ kit (AdminDashboard, useMaintenanceAlerts, socket) เรียกใช้
// ชื่อฟังก์ชันเหมือนของ kit แต่ใช้ axios + token ตัวเดียวกับฝั่งผู้เช่า (studentApi)
import api, { API_URL } from '../studentApi'

export const API_BASE_URL = API_URL

export const authApi = {
  login: (data) => api.post('/login', data),
  getMe: () => api.get('/me'),
}

export const maintenanceApi = {
  getAll: () => api.get('/api/maintenance'),
  create: (data) => api.post('/api/maintenance', data),
  updateStatus: (id, status) => api.patch(`/api/maintenance/${id}/status`, { status }),
}

// ระบบผู้จัดการหอพัก (backend: adminDashboardRoutes.js)
export const adminApi = {
  getOverview: () => api.get('/api/admin/overview'),
  getResidents: (params) => api.get('/api/admin/residents', { params }),
  cancelBooking: (bookingId) => api.post('/api/admin/bookings/cancel', { bookingId }),
  getPayments: () => api.get('/api/admin/payments'),
  updatePaymentStatus: (id, status) => api.patch(`/api/admin/payments/${id}/status`, { status }),
  getUsers: () => api.get('/api/admin/users'),
  updateUserRole: (id, role) => api.patch(`/api/admin/users/${id}/role`, { role }),
}

// แชทนิสิต ↔ เจ้าหน้าที่ (backend: chatRoutes.js)
export const chatApi = {
  getMine: () => api.get('/api/chat/me'),
  handoff: (question, topics) => api.post('/api/chat/me/handoff', { question, topics }),
  send: (body) => api.post('/api/chat/me/messages', { body }),
  markRead: () => api.post('/api/chat/me/read'),
}

export const adminChatApi = {
  list: () => api.get('/api/admin/chats'),
  get: (id) => api.get(`/api/admin/chats/${id}`),
  send: (id, body) => api.post(`/api/admin/chats/${id}/messages`, { body }),
  markRead: (id) => api.post(`/api/admin/chats/${id}/read`),
  setStatus: (id, status) => api.patch(`/api/admin/chats/${id}/status`, { status }),
}

export default api
