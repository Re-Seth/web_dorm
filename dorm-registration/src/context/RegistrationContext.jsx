import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import api from '../studentApi'

const RegistrationContext = createContext(null)

// ค่าลงทะเบียนสำรอง (ค่าจริงมาจาก backend: booking.paymentAmount / GET /api/registration-period)
export const FALLBACK_FEE = 1999

// เวอร์ชันเก่าเก็บความคืบหน้า (รวมเลขบัตรประชาชน) ไว้ใน localStorage — ลบทิ้ง ไม่ให้ค้างในเครื่องสาธารณะ
const LEGACY_PREFIX = 'taothong.registration'
function clearLegacyStorage() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(LEGACY_PREFIX)).forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

const EMPTY = { loading: true, profile: null, booking: null, review: null }

// สถานะการลงทะเบียนของผู้เช่ามาจาก backend เสมอ (โปรไฟล์ / การจอง / การชำระเงิน / รีวิว)
// → เปลี่ยนเครื่องหรือแอดมินแก้สถานะ ก็เห็นตรงกัน; เรียก refresh() หลังทำรายการที่เปลี่ยนข้อมูล
export function RegistrationProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [data, setData] = useState(EMPTY)
  const [fee, setFee] = useState(FALLBACK_FEE)

  useEffect(() => {
    clearLegacyStorage()
    api.get('/api/registration-period').then(({ data: p }) => p?.fee && setFee(p.fee)).catch(() => {})
  }, [])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setData({ ...EMPTY, loading: false })
      return
    }
    const get = (path) => api.get(path).then((r) => r.data).catch(() => null)
    const [profile, booking, review] = await Promise.all([get('/api/profile'), get('/api/bookings/me'), get('/api/reviews/me')])
    setData({ loading: false, profile, booking, review })
  }, [isAuthenticated, user?.username]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setData(EMPTY)
    refresh()
  }, [refresh])

  const { loading, profile, booking: b, review: r } = data
  const value = {
    loading,
    refresh,
    profile,
    infoCompleted: !!profile,
    student: profile
      ? { prefix: profile.prefix, firstName: profile.firstName, lastName: profile.lastName, phone: profile.mobile }
      : { prefix: '', firstName: '', lastName: '', phone: '' },
    booking: {
      id: b?.id ?? null,
      confirmed: !!b,
      dormId: b?.room?.dormId ?? null,
      floor: b?.room?.floor ?? null,
      roomCode: b?.room?.code ?? null,
    },
    payment: {
      status: b?.paymentStatus === 'PAID' ? 'paid' : 'unpaid',
      amount: b?.paymentAmount ?? fee,
      method: b?.paymentMethod ? b.paymentMethod.toLowerCase() : null,
      paidAt: b?.paidAt ?? null,
      receiptNo: b?.paymentStatus === 'PAID' ? b.receiptNo : null,
    },
    review: { submitted: !!r, rating: r?.rating ?? null, comment: r?.comment ?? '' },
  }

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext)
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider')
  return ctx
}
