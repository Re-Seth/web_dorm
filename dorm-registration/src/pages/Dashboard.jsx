import { Link } from 'react-router-dom'
import { useRegistration } from '../context/RegistrationContext'
import { useAuth } from '../context/AuthContext'
import { DORMS } from '../data/dorms'
import { ShieldCheck, ArrowRight } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { infoCompleted, booking, payment, review } = useRegistration()
  const dorm = DORMS.find((d) => d.id === booking.dormId) || booking.room?.dorm
  const isAdmin = user?.role === 'ADMIN'

  const steps = [
    { label: 'กรอกข้อมูลนิสิต/ผู้ปกครอง', done: infoCompleted, to: '/app/register' },
    { label: 'เลือกห้องพัก', done: booking.confirmed, to: '/app/rooms' },
    { label: 'ชำระเงิน', done: payment.status === 'paid', to: '/app/payment' },
    { label: 'ให้รีวิว', done: review.submitted, to: '/app/review' },
  ]

  const nextStep = steps.find((s) => !s.done)

  return (
    <div className="max-w-3xl">
      {isAdmin && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/40 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">คุณกำลังเข้าสู่ระบบด้วยสิทธิ์ผู้จัดการหอพัก (Admin)</h3>
              <p className="text-xs text-amber-200/70 mt-0.5">
                สามารถเข้าถึงแดชบอร์ดสรุปสถิติ จัดการผังห้องพัก งานแจ้งซ่อม และรายชื่อผู้พักทั้งหมดได้
              </p>
            </div>
          </div>
          <Link
            to="/app/admin"
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all shrink-0 ml-3"
          >
            <span>แดชบอร์ด Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <h1 className="font-display text-2xl font-semibold mb-1">หน้าหลัก</h1>
      <p className="text-bone/50 mb-8">ภาพรวมการลงทะเบียนหอพักของคุณ (เชื่อมต่อฐานข้อมูล SQLite)</p>

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
            {dorm?.name || 'หอพักเทาทอง'} · ชั้น {booking.floor} {booking.room?.code ? `(ห้อง ${booking.room.code})` : ''} · สถานะ:{' '}
            <span className={payment.status === 'paid' ? 'text-room-empty2 font-medium' : 'text-gold font-medium'}>
              {payment.status === 'paid' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
