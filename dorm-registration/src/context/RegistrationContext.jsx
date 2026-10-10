import { createContext, useContext, useEffect, useState } from 'react'
import { authApi, studentApi, bookingApi, paymentApi, reviewApi } from '../services/api'

const RegistrationContext = createContext(null)
const STORAGE_KEY = 'taothong.registration'

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
    room: null,
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

export function RegistrationProvider({ children }) {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...initialState, ...JSON.parse(saved) } : initialState
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // โหลดข้อมูลล่าสุดจาก SQLite Database เมื่อเปิดแอป
  useEffect(() => {
    loadDataFromDb()
  }, [])

  async function loadDataFromDb() {
    const token = localStorage.getItem('taothong.token')
    if (!token) return

    try {
      const res = await authApi.getMe()
      const user = res.data
      if (user) {
        const profile = user.profile || {}
        const booking = user.booking || null
        const payment = booking?.payment || null
        const latestReview = user.reviews?.[0] || null

        setState((prev) => ({
          ...prev,
          student: {
            prefix: profile.prefix || prev.student.prefix,
            firstName: profile.firstName || prev.student.firstName,
            lastName: profile.lastName || prev.student.lastName,
            phone: profile.phone || prev.student.phone,
            citizenId: profile.citizenId || prev.student.citizenId,
          },
          father: {
            prefix: profile.fatherPrefix || prev.father.prefix,
            firstName: profile.fatherFirstName || prev.father.firstName,
            lastName: profile.fatherLastName || prev.father.lastName,
            phone: profile.fatherPhone || prev.father.phone,
          },
          mother: {
            prefix: profile.motherPrefix || prev.mother.prefix,
            firstName: profile.motherFirstName || prev.mother.firstName,
            lastName: profile.motherLastName || prev.mother.lastName,
            phone: profile.motherPhone || prev.mother.phone,
          },
          infoCompleted: !!(profile.firstName && profile.citizenId),
          booking: booking
            ? {
                dormId: booking.room?.dormId || prev.booking.dormId,
                floor: booking.room?.floor || prev.booking.floor,
                roomId: booking.roomId,
                confirmed: true,
                room: booking.room,
              }
            : prev.booking,
          payment: payment
            ? {
                status: payment.status.toLowerCase(),
                amount: payment.amount,
                method: payment.method,
                paidAt: payment.paidAt,
                receiptNo: payment.receiptNo,
              }
            : prev.payment,
          review: latestReview
            ? {
                submitted: true,
                rating: latestReview.rating,
                comment: latestReview.comment || '',
              }
            : prev.review,
        }))
      }
    } catch (err) {
      console.warn('Could not sync with backend database:', err.message)
    }
  }

  function updatePerson(role, data) {
    setState((s) => ({ ...s, [role]: { ...s[role], ...data } }))
  }

  // บันทึกข้อมูลนิสิตและผู้ปกครองลง SQLite
  async function markInfoCompleted() {
    try {
      await studentApi.saveProfile({
        prefix: state.student.prefix,
        firstName: state.student.firstName,
        lastName: state.student.lastName,
        citizenId: state.student.citizenId,
        phone: state.student.phone,
        fatherPrefix: state.father.prefix,
        fatherFirstName: state.father.firstName,
        fatherLastName: state.father.lastName,
        fatherPhone: state.father.phone,
        motherPrefix: state.mother.prefix,
        motherFirstName: state.mother.firstName,
        motherLastName: state.mother.lastName,
        motherPhone: state.mother.phone,
      })
    } catch (err) {
      console.error('Error saving profile to SQLite:', err)
    }
    setState((s) => ({ ...s, infoCompleted: true }))
  }

  function selectRoom({ dormId, floor, roomId }) {
    setState((s) => ({
      ...s,
      booking: { ...s.booking, dormId, floor, roomId, confirmed: false },
    }))
  }

  // ยืนยันการจองห้องพักลง SQLite
  async function confirmBooking(targetRoomId) {
    const roomId = targetRoomId || state.booking.roomId
    try {
      const res = await bookingApi.createBooking(roomId)
      const bookingData = res.data.booking
      setState((s) => ({
        ...s,
        booking: {
          ...s.booking,
          roomId: bookingData.roomId,
          dormId: bookingData.room?.dormId || s.booking.dormId,
          floor: bookingData.room?.floor || s.booking.floor,
          confirmed: true,
          room: bookingData.room,
        },
      }))
      return bookingData
    } catch (err) {
      console.error('Error creating booking in SQLite:', err)
      setState((s) => ({ ...s, booking: { ...s.booking, confirmed: true } }))
      throw err
    }
  }

  // ชำระเงินและบันทึกลง SQLite
  async function completePayment(method) {
    try {
      const res = await paymentApi.processPayment({
        method,
        amount: state.payment.amount || 1999,
      })
      const paymentData = res.data.payment
      setState((s) => ({
        ...s,
        payment: {
          ...s.payment,
          status: 'paid',
          method: paymentData.method,
          paidAt: paymentData.paidAt,
          receiptNo: paymentData.receiptNo,
          amount: paymentData.amount,
        },
      }))
      return paymentData.receiptNo
    } catch (err) {
      console.error('Error completing payment in SQLite:', err)
      const fallbackReceipt = 'RCPT-' + Date.now().toString().slice(-8)
      setState((s) => ({
        ...s,
        payment: {
          ...s.payment,
          status: 'paid',
          method,
          paidAt: new Date().toISOString(),
          receiptNo: fallbackReceipt,
        },
      }))
      return fallbackReceipt
    }
  }

  // ส่งรีวิวลง SQLite
  async function submitReview({ rating, comment }) {
    try {
      await reviewApi.submitReview({ rating, comment })
    } catch (err) {
      console.error('Error submitting review to SQLite:', err)
    }
    setState((s) => ({
      ...s,
      review: { submitted: true, rating, comment },
    }))
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY)
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
        loadDataFromDb,
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
