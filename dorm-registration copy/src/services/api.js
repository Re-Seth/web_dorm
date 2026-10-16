import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// แนบ Token อัตโนมัติทุกครั้งที่เรียก API
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('taothong.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication APIs
export const authApi = {
  login: (data) => api.post('/login', data),
  register: (data) => api.post('/register', data),
  getMe: () => api.get('/me'),
};

// Student Profile APIs
export const studentApi = {
  getProfile: () => api.get('/api/student-profile'),
  saveProfile: (data) => api.post('/api/student-profile', data),
};

// Dorms & Rooms APIs
export const dormApi = {
  getDorms: () => api.get('/api/dorms'),
  getRooms: (dormId, floor) =>
    api.get(`/api/dorms/${dormId}/rooms`, { params: floor ? { floor } : {} }),
};

// Booking APIs
export const bookingApi = {
  createBooking: (roomId) => api.post('/api/bookings', { roomId }),
  getMyBooking: () => api.get('/api/bookings/my'),
};

// Payment APIs
export const paymentApi = {
  processPayment: (data) => api.post('/api/payments', data),
  getReceipt: () => api.get('/api/payments/receipt'),
};

// Review APIs
export const reviewApi = {
  submitReview: (data) => api.post('/api/reviews', data),
  getReviews: () => api.get('/api/reviews'),
};

// Maintenance APIs
export const maintenanceApi = {
  getAll: () => api.get('/api/maintenance'),
  create: (data) => api.post('/api/maintenance', data),
  updateStatus: (id, status) => api.patch(`/api/maintenance/${id}/status`, { status }),
};

// Power APIs
export const powerApi = {
  getHistory: () => api.get('/api/power/history'),
};

// Admin APIs (ระบบผู้จัดการหอพัก)
export const adminApi = {
  getOverview: () => api.get('/api/admin/overview'),
  getResidents: (params) => api.get('/api/admin/residents', { params }),
  cancelBooking: (bookingId) => api.post('/api/admin/bookings/cancel', { bookingId }),
  getPayments: () => api.get('/api/admin/payments'),
  updatePaymentStatus: (id, status) => api.patch(`/api/admin/payments/${id}/status`, { status }),
  getUsers: () => api.get('/api/admin/users'),
  updateUserRole: (id, role) => api.patch(`/api/admin/users/${id}/role`, { role }),
};

export default api;
