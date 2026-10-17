import { useEffect, useState } from 'react'
import api from '../studentApi'

// รอบเปิดรับลงทะเบียนจาก backend + เวลาปัจจุบันที่เดินทุกวินาที (ปรับตามนาฬิกาเซิร์ฟเวอร์)
export default function useRegistrationPeriod() {
  const [period, setPeriod] = useState(null)
  const [offset, setOffset] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.get('/api/registration-period')
      .then(({ data }) => {
        if (cancelled) return
        setPeriod(data)
        setOffset(new Date(data.serverTime).getTime() - Date.now())
      })
      .catch(() => !cancelled && setError(true))
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (!period) return { period: null, status: error ? 'UNKNOWN' : 'LOADING', isOpen: false, remaining: 0 }

  const serverNow = now + offset
  const openAt = new Date(period.openAt).getTime()
  const closeAt = new Date(period.closeAt).getTime()
  const status = serverNow < openAt ? 'UPCOMING' : serverNow > closeAt ? 'CLOSED' : 'OPEN'
  const remaining = status === 'UPCOMING' ? openAt - serverNow : status === 'OPEN' ? closeAt - serverNow : 0

  return { period, status, isOpen: status === 'OPEN', remaining }
}
