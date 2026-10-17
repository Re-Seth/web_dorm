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

export default api
