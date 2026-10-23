import io from 'socket.io-client';
import { API_BASE_URL } from './api';
import { getToken } from '../studentApi';

// ใช้ Socket.io connection เดียวร่วมกันทั้งแอป
// แนบ token ตอนเชื่อมต่อ — backend ส่งการแจ้งเตือนแจ้งซ่อมให้เฉพาะผู้จัดการหอพักและผู้แจ้ง
// API_BASE_URL แบบ path (เช่น '/_api' หลัง nginx) → ต่อกับ origin เดิม และใช้ path ของ socket.io ใต้ prefix นั้น
const isPathBase = API_BASE_URL.startsWith('/')
const socket = io(isPathBase ? window.location.origin : API_BASE_URL, {
  ...(isPathBase ? { path: `${API_BASE_URL}/socket.io` } : {}),
  auth: (cb) => cb({ token: getToken() }),
});

// เรียกหลังเข้าสู่ระบบ/ออกจากระบบ เพื่อเชื่อมต่อใหม่ด้วย token ปัจจุบัน
export function reconnectSocket() {
  socket.disconnect().connect();
}

export default socket;
