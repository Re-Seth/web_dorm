import { useAuth } from '../context/AuthContext'
import { useRegistration } from '../context/RegistrationContext'

// เงื่อนไขที่ต้องผ่านก่อนเข้าแต่ละหน้า (ไล่ตามลำดับขั้นตอนการลงทะเบียน)
const REQUIREMENT = {
  '/app': 'info',
  '/app/register': null,
  '/app/rooms': 'info',
  '/app/payment': 'booking',
  '/app/receipt': 'paid',
  '/app/review': 'paid',
  '/app/services': 'booking'
}

const LOCK_MESSAGE = {
  info: 'กรุณาลงทะเบียนข้อมูลนิสิตก่อน',
  booking: 'กรุณาเลือกห้องพักก่อน',
  paid: 'กรุณาชำระเงินก่อน'
}

export function useStepAccess() {
  const { user } = useAuth()
  const { infoCompleted, booking, payment, syncing } = useRegistration()
  const isAdmin = user?.role === 'ADMIN'

  const passed = {
    info: infoCompleted,
    booking: infoCompleted && booking.confirmed,
    paid: infoCompleted && booking.confirmed && payment.status === 'paid'
  }

  // คืนค่าข้อความเหตุผลถ้าหน้านั้นยังล็อกอยู่, null ถ้าเข้าได้
  function lockReason(path) {
    if (isAdmin) return null
    const req = REQUIREMENT[path]
    return req && !passed[req] ? LOCK_MESSAGE[req] : null
  }

  // หน้าที่ควรพาไปเมื่อเข้าหน้าที่ยังล็อกอยู่
  const nextPath = !passed.info ? '/app/register' : !passed.booking ? '/app/rooms' : '/app/payment'

  return { syncing, lockReason, nextPath }
}
