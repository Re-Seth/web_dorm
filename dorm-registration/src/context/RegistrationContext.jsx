import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const RegistrationContext = createContext(null)
// ความคืบหน้าการลงทะเบียนเก็บแยกตามผู้ใช้: taothong.registration.<username>
const STORAGE_PREFIX = 'taothong.registration'

const emptyPerson = { prefix: '', firstName: '', lastName: '', phone: '' }

const initialState = {
  student: { ...emptyPerson, citizenId: '' },
  father: { ...emptyPerson },
  mother: { ...emptyPerson },
  infoCompleted: false,
  booking: {
    dormId: null,
    floor: null,
    roomId: null,
    confirmed: false,
  },
  payment: {
    status: 'unpaid', // unpaid | paid
    amount: 1999,
    method: null,
    paidAt: null,
    receiptNo: null,
  },
  review: {
    submitted: false,
    rating: null,
    comment: '',
  },
}

function load(key) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? { ...initialState, ...JSON.parse(saved) } : initialState
  } catch {
    return initialState
  }
}

export function RegistrationProvider({ children }) {
  const { user } = useAuth()
  const storageKey = `${STORAGE_PREFIX}.${user?.identifier ?? 'guest'}`

  const [state, setState] = useState(() => load(storageKey))
  const [activeKey, setActiveKey] = useState(storageKey)

  // เปลี่ยนบัญชี (ล็อกอิน/ออกจากระบบ/สลับผู้ใช้) → โหลดข้อมูลของบัญชีนั้น ไม่ใช่ของคนก่อนหน้า
  if (activeKey !== storageKey) {
    setActiveKey(storageKey)
    setState(load(storageKey))
  }

  useEffect(() => {
    localStorage.setItem(activeKey, JSON.stringify(state))
  }, [state, activeKey])

  function updatePerson(role, data) {
    setState((s) => ({ ...s, [role]: { ...s[role], ...data } }))
  }

  function markInfoCompleted() {
    setState((s) => ({ ...s, infoCompleted: true }))
  }

  function selectRoom({ dormId, floor, roomId }) {
    setState((s) => ({
      ...s,
      booking: { ...s.booking, dormId, floor, roomId, confirmed: false },
    }))
  }

  function confirmBooking() {
    setState((s) => ({ ...s, booking: { ...s.booking, confirmed: true } }))
  }

  // รับเลขใบเสร็จ/เวลาจาก server (ถ้าไม่ส่งมา จะสร้างเองในเครื่องแบบเดิม)
  function completePayment(
    method,
    receiptNo = 'RCPT-' + Date.now().toString().slice(-8),
    paidAt = new Date().toISOString(),
  ) {
    setState((s) => ({
      ...s,
      payment: { ...s.payment, status: 'paid', method, paidAt, receiptNo },
    }))
    return receiptNo
  }

  function submitReview({ rating, comment }) {
    setState((s) => ({
      ...s,
      review: { submitted: true, rating, comment },
    }))
  }

  function resetAll() {
    localStorage.removeItem(activeKey)
    setState(initialState)
  }

  return (
    <RegistrationContext.Provider
      value={{
        ...state,
        updatePerson,
        markInfoCompleted,
        selectRoom,
        confirmBooking,
        completePayment,
        submitReview,
        resetAll,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  )
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext)
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider')
  return ctx
}
