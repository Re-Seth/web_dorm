import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useRegistration } from '../context/RegistrationContext'
import api, { errMsg } from '../studentApi'

export default function FeedbackReview() {
  const { loading, review, payment, refresh } = useRegistration()
  const [rating, setRating] = useState(review.rating || 0)
  const [comment, setComment] = useState(review.comment || '')
  const [editing, setEditing] = useState(false)

  // รีวิวเดิมโหลดจาก server ทีหลัง → ใส่ค่าลงฟอร์ม (กดแก้ไขรีวิวได้)
  useEffect(() => {
    setRating(review.rating || 0)
    setComment(review.comment || '')
  }, [review.rating, review.comment])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lockRef = useRef(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (lockRef.current) return // กันดับเบิลคลิก (state อัปเดตไม่ทันระหว่างคลิกติดกัน)
    lockRef.current = true
    setBusy(true)
    setError('')
    try {
      await api.post('/api/reviews', { rating, comment })
      await refresh()
      setEditing(false)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      lockRef.current = false
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-bone/50">กำลังโหลด…</p>

  if (payment.status !== 'paid') {
    return (
      <div className="max-w-lg card space-y-3">
        <h1 className="font-display text-xl font-semibold">รีวิวได้หลังชำระเงิน</h1>
        <p className="text-bone/60 text-sm">กรุณาจองห้องและชำระเงินให้เรียบร้อยก่อน แล้วกลับมาให้คะแนนการใช้งานได้</p>
        <Link to="/app" className="btn-primary inline-block">กลับหน้าหลักผู้เช่า</Link>
      </div>
    )
  }

  if (review.submitted && !editing) {
    return (
      <div className="max-w-lg card text-center space-y-3">
        <h1 className="font-display text-xl font-semibold">ขอบคุณสำหรับความคิดเห็น</h1>
        <p className="text-gold text-lg">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
        <p className="text-bone/50 text-sm">
          ทีมงานหอพักเทาทองจะนำข้อมูลของคุณไปพัฒนาระบบให้ดียิ่งขึ้น
        </p>
        <button className="btn-ghost" onClick={() => setEditing(true)}>แก้ไขรีวิว</button>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-semibold mb-1">รีวิวประสบการณ์การใช้งาน</h1>
      <p className="text-bone/50 mb-6">
        ความคิดเห็นของคุณจะถูกนำไปใช้ปรับปรุงระบบลงทะเบียนหอพักในอนาคต
      </p>

      <form className="card space-y-5" onSubmit={handleSubmit}>
        <div>
          <p className="field-label mb-2">ให้คะแนนความพึงพอใจโดยรวม</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setRating(n)}
                aria-label={`${n} ดาว`}
                className={
                  'w-10 h-10 rounded-full border text-lg transition-colors ' +
                  (n <= rating ? 'bg-gold border-gold text-charcoal' : 'border-charcoal-line text-bone/40')
                }
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="comment">ความคิดเห็นเพิ่มเติม</label>
          <textarea
            id="comment"
            className="field min-h-[100px]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            placeholder="บอกเราเกี่ยวกับประสบการณ์การลงทะเบียน จอง และชำระเงิน…"
          />
        </div>

        {error && <p role="alert" className="text-room-full text-sm">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={rating === 0 || busy}>
          {busy ? 'กำลังส่ง…' : 'ส่งรีวิว'}
        </button>
      </form>
    </div>
  )
}
