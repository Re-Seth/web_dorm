import { Link } from 'react-router-dom'
import { useRegistration } from '../context/RegistrationContext'
import { DORMS } from '../data/dorms'

export default function Dashboard() {
  const { infoCompleted, booking, payment } = useRegistration()
  const dorm = DORMS.find((d) => d.id === booking.dormId)

  const steps = [
    { label: 'กรอกข้อมูลนิสิต/ผู้ปกครอง', done: infoCompleted, to: '/app/register' },
    { label: 'เลือกห้องพัก', done: booking.confirmed, to: '/app/rooms' },
    { label: 'ชำระเงิน', done: payment.status === 'paid', to: '/app/payment' },
    { label: 'ให้รีวิว', done: false, to: '/app/review' },
  ]

  const nextStep = steps.find((s) => !s.done)

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold mb-1">หน้าหลัก</h1>
      <p className="text-bone/50 mb-8">ภาพรวมการลงทะเบียนหอพักของคุณ</p>

      <div className="card mb-6">
        <h2 className="font-display font-medium mb-4">ความคืบหน้า</h2>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3">
              <span
                className={
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono shrink-0 ' +
                  (s.done ? 'bg-room-empty2 text-charcoal' : 'border border-charcoal-line text-bone/40')
                }
              >
                {s.done ? '✓' : i + 1}
              </span>
              <span className={s.done ? 'text-bone/90' : 'text-bone/50'}>{s.label}</span>
            </div>
          ))}
        </div>

        {nextStep && (
          <Link to={nextStep.to} className="btn-primary inline-block mt-6">
            ไปยัง: {nextStep.label}
          </Link>
        )}
      </div>

      {booking.roomId && (
        <div className="card">
          <h2 className="font-display font-medium mb-3">ห้องพักของคุณ</h2>
          <p className="text-sm text-bone/70">
            {dorm?.name} · ชั้น {booking.floor} · สถานะ:{' '}
            <span className={payment.status === 'paid' ? 'text-room-empty2' : 'text-gold'}>
              {payment.status === 'paid' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
