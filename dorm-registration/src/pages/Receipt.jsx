import { Link, Navigate } from 'react-router-dom'
import { useRegistration } from '../context/RegistrationContext'
import { DORMS } from '../data/dorms'

export default function Receipt() {
  const { payment, booking, student } = useRegistration()
  const dorm = DORMS.find((d) => d.id === booking.dormId)

  if (payment.status !== 'paid') return <Navigate to="/app/payment" replace />

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-semibold mb-1">ใบเสร็จรับเงิน</h1>
      <p className="text-bone/50 mb-6">
        ระบบได้ส่งใบเสร็จนี้ไปยังอีเมลของคุณเรียบร้อยแล้ว
      </p>

      <div className="card">
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-charcoal-line">
          <div>
            <p className="font-display font-semibold text-gold">หอพักเทาทอง</p>
            <p className="text-xs text-bone/40">มหาวิทยาลัยบูรพา</p>
          </div>
          <p className="text-xs font-mono text-bone/50">{payment.receiptNo}</p>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-bone/50">ผู้จอง</dt>
            <dd>{student.prefix} {student.firstName} {student.lastName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bone/50">หอพัก</dt>
            <dd>{dorm?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bone/50">ชั้น</dt>
            <dd>{booking.floor}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bone/50">วิธีชำระเงิน</dt>
            <dd>{payment.method === 'qr' ? 'QR พร้อมเพย์' : 'โอนธนาคาร'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bone/50">วันที่ชำระ</dt>
            <dd>{new Date(payment.paidAt).toLocaleString('th-TH')}</dd>
          </div>
        </dl>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-charcoal-line">
          <span className="font-display font-medium">ยอดชำระทั้งหมด</span>
          <span className="font-display text-xl font-bold text-gold">฿{payment.amount.toLocaleString()}</span>
        </div>
      </div>

      <Link to="/app/review" className="btn-primary inline-block mt-6">
        ไปที่หน้ารีวิว →
      </Link>
    </div>
  )
}
