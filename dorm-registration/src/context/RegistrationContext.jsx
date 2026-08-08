import { createContext, useContext, useEffect, useState } from 'react'

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

  function completePayment(method) {
    const receiptNo = 'RCPT-' + Date.now().toString().slice(-8)
    setState((s) => ({
      ...s,
      payment: {
        ...s.payment,
        status: 'paid',
        method,
        paidAt: new Date().toISOString(),
        receiptNo,
      },
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
