import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRegistration } from '../context/RegistrationContext'
import api, { errMsg } from '../studentApi'

const METHODS = [
  { id: 'qr', label: 'สแกน QR พร้อมเพย์' },
  { id: 'bank', label: 'โอนผ่านธนาคาร / Mobile Banking' },
]

export default function Payment() {
  const { loading, booking, payment, refresh } = useRegistration()
  const [method, setMethod] = useState('qr')
  const [processing, setProcessing] = useState(false)
  const lockRef = useRef(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handlePay() {
    if (lockRef.current) return // กันดับเบิลคลิก (state อัปเดตไม่ทันระหว่างคลิกติดกัน)
    lockRef.current = true
    setProcessing(true)
    setError('')
    try {
      // บันทึกการชำระเงินลงฐานข้อมูล (ยังเป็นการชำระจำลอง ไม่มี payment gateway)
      await api.post('/api/bookings/pay', { method })
      await refresh()
      navigate('/app/receipt')
    } catch (e) {
      setError(errMsg(e))
    } finally {
      lockRef.current = false
      setProcessing(false)
    }
  }

  if (loading) return <p className="text-sm text-bone/50">กำลังโหลด…</p>

  // ยังไม่มีการจอง (เช่น เปิดหน้านี้ทาง URL ตรง หรือแอดมินยกเลิกการจองไปแล้ว)
  if (!booking.confirmed) {
    return (
      <div className="max-w-lg card space-y-3">
        <h1 className="font-display text-xl font-semibold">ยังไม่มีการจองห้องพัก</h1>
        <p className="text-bone/60 text-sm">กรุณาเลือกห้องพักก่อน แล้วจึงชำระเงิน</p>
        <Link to="/app/rooms" className="btn-primary inline-block">ไปเลือกห้องพัก →</Link>
      </div>
    )
  }

  if (payment.status === 'paid') {
    return (
      <div className="max-w-lg card">
        <h1 className="font-display text-xl font-semibold mb-2">ชำระเงินเรียบร้อยแล้ว</h1>
        <p className="text-bone/60 text-sm mb-4">เลขที่ใบเสร็จ: {payment.receiptNo}</p>
        <button className="btn-primary" onClick={() => navigate('/app/receipt')}>
          ดูใบเสร็จ
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-semibold mb-1">ชำระเงินค่าหอพัก</h1>
      <p className="text-bone/50 mb-6">ยอดชำระสำหรับการจองห้อง <span className="font-mono">{booking.roomCode}</span></p>

      <div className="card mb-6 text-center">
        <p className="text-bone/50 text-sm mb-1">ยอดที่ต้องชำระ</p>
        <p className="font-display text-4xl font-bold text-gold">฿{payment.amount.toLocaleString()}</p>
      </div>

      <div className="flex gap-2 mb-6">
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={
              'flex-1 py-2.5 rounded-full text-sm border transition-colors ' +
              (method === m.id
                ? 'bg-gold text-charcoal border-gold font-medium'
                : 'border-charcoal-line text-bone/70 hover:border-gold/50')
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {method === 'qr' ? (
        <div className="card flex flex-col items-center gap-3 mb-6">
          {/* placeholder QR pattern rendered as SVG — replace with a real generated PromptPay QR from the backend */}
          <div className="w-44 h-44 bg-[#F4F1E8] rounded-2xl p-3">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <rect width="100" height="100" fill="#F4F1E8" />
              {Array.from({ length: 10 }).map((_, r) =>
                Array.from({ length: 10 }).map((_, c) => {
                  const seed = (r * 31 + c * 17) % 5
                  return seed === 0 ? (
                    <rect key={`${r}-${c}`} x={c * 10} y={r * 10} width="10" height="10" fill="#1C1F22" />
                  ) : null
                }),
              )}
            </svg>
          </div>
          <p className="text-xs text-bone/50">สแกนด้วยแอปธนาคารเพื่อชำระผ่าน PromptPay</p>
        </div>
      ) : (
        <div className="card mb-6 text-sm space-y-2">
          <p className="text-bone/50">โอนเข้าบัญชี</p>
          <p className="font-mono">ธนาคารกรุงไทย · 123-4-56789-0</p>
          <p>ชื่อบัญชี: หอพักเทาทอง</p>
        </div>
      )}

      {error && <p role="alert" className="text-room-full text-sm mb-4">{error}</p>}

      <button className="btn-primary w-full" onClick={handlePay} disabled={processing}>
        {processing ? 'กำลังตรวจสอบการชำระเงิน…' : `ยืนยันชำระเงิน ฿${payment.amount.toLocaleString()}`}
      </button>
    </div>
  )
}
