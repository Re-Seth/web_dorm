import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useRegistration } from '../context/RegistrationContext'
import { DORMS } from '../data/dorms'
import { paymentApi } from '../services/api'

export default function Receipt() {
  const { payment, booking, student } = useRegistration()
  const [dbReceipt, setDbReceipt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    paymentApi
      .getReceipt()
      .then((res) => {
        setDbReceipt(res.data)
      })
      .catch(() => {
        // use context fallback
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading && payment.status !== 'paid') {
    return <div className="p-8 text-center text-bone/50">กำลังโหลดใบเสร็จรับเงิน...</div>
  }

  if (!dbReceipt && payment.status !== 'paid') {
    return <Navigate to="/app/payment" replace />
  }

  const receiptNo = dbReceipt?.receiptNo || payment.receiptNo
  const amount = dbReceipt?.amount || payment.amount || 1999
  const method = dbReceipt?.method || payment.method
  const paidAt = dbReceipt?.paidAt || payment.paidAt
  const studentName = dbReceipt?.student
    ? `${dbReceipt.student.prefix || ''} ${dbReceipt.student.firstName || ''} ${dbReceipt.student.lastName || ''}`.trim()
    : `${student.prefix} ${student.firstName} ${student.lastName}`.trim() || 'นิสิต'
  const dormName = dbReceipt?.dorm?.name || DORMS.find((d) => d.id === booking.dormId)?.name || 'หอพักเทาทอง'
  const floor = dbReceipt?.room?.floor || booking.floor || '-'
  const roomCode = dbReceipt?.room?.code || ''

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-semibold mb-1">ใบเสร็จรับเงิน</h1>
      <p className="text-bone/50 mb-6">
        ข้อมูลจากฐานข้อมูล SQLite ได้บันทึกการชำระเงินเรียบร้อยแล้ว
      </p>

      <div className="card">
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-charcoal-line">
          <div>
            <p className="font-display font-semibold text-gold">หอพักเทาทอง</p>
            <p className="text-xs text-bone/40">มหาวิทยาลัยบูรพา</p>
          </div>
          <p className="text-xs font-mono text-bone/50">{receiptNo}</p>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-bone/50">ผู้จอง</dt>
            <dd>{studentName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bone/50">หอพัก</dt>
            <dd>{dormName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bone/50">ชั้น / ห้อง</dt>
            <dd>ชั้น {floor} {roomCode ? `(ห้อง ${roomCode})` : ''}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bone/50">วิธีชำระเงิน</dt>
            <dd>{method === 'qr' ? 'QR พร้อมเพย์' : 'โอนธนาคาร'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bone/50">วันที่ชำระ</dt>
            <dd>{paidAt ? new Date(paidAt).toLocaleString('th-TH') : '-'}</dd>
          </div>
        </dl>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-charcoal-line">
          <span className="font-display font-medium">ยอดชำระทั้งหมด</span>
          <span className="font-display text-xl font-bold text-gold">฿{Number(amount).toLocaleString()}</span>
        </div>
      </div>

      <Link to="/app/review" className="btn-primary inline-block mt-6">
        ไปที่หน้ารีวิว →
      </Link>
    </div>
  )
}
