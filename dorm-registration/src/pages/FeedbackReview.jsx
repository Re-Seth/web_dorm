import { useState } from 'react'
import { useRegistration } from '../context/RegistrationContext'

export default function FeedbackReview() {
  const { review, submitReview } = useRegistration()
  const [rating, setRating] = useState(review.rating || 0)
  const [comment, setComment] = useState(review.comment || '')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await submitReview({ rating, comment })
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกรีวิว')
    } finally {
      setSubmitting(false)
    }
  }

  if (review.submitted) {
    return (
      <div className="max-w-lg card text-center">
        <h1 className="font-display text-xl font-semibold mb-2">ขอบคุณสำหรับความคิดเห็น</h1>
        <p className="text-bone/50 text-sm">
          ทีมงานหอพักเทาทองได้บันทึกข้อมูลของคุณลงฐานข้อมูล SQLite เรียบร้อยแล้ว เพื่อนำไปพัฒนาระบบให้ดียิ่งขึ้น
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-semibold mb-1">รีวิวประสบการณ์การใช้งาน</h1>
      <p className="text-bone/50 mb-6">
        ความคิดเห็นของคุณจะถูกบันทึกลงฐานข้อมูลเพื่อใช้ปรับปรุงระบบลงทะเบียนหอพัก
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
                  'w-10 h-10 rounded-md border text-lg transition-colors ' +
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
            placeholder="บอกเราเกี่ยวกับประสบการณ์การลงทะเบียน จอง และชำระเงิน…"
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={rating === 0 || submitting}>
          {submitting ? 'กำลังส่งข้อมูล...' : 'ส่งรีวิว'}
        </button>
      </form>
    </div>
  )
}
