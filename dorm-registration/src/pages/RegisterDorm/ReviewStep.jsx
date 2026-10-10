import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegistration } from '../../context/RegistrationContext'

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-charcoal-line last:border-0 text-sm">
      <span className="text-bone/50">{label}</span>
      <span className="text-bone/90">{value || '—'}</span>
    </div>
  )
}

export default function ReviewStep({ onBack }) {
  const { student, father, mother, markInfoCompleted } = useRegistration()
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  async function handleFinish() {
    setSaving(true)
    try {
      await markInfoCompleted()
    } finally {
      setSaving(false)
      navigate('/app/rooms')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card">
        <h2 className="font-display text-lg font-semibold mb-4">ข้อมูลนิสิต</h2>
        <Row label="ชื่อ-นามสกุล" value={`${student.prefix} ${student.firstName} ${student.lastName}`.trim()} />
        <Row label="เลขบัตรประชาชน" value={student.citizenId} />
        <Row label="เบอร์โทรศัพท์" value={student.phone} />
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold mb-4">ข้อมูลบิดา</h2>
        <Row label="ชื่อ-นามสกุล" value={`${father.prefix} ${father.firstName} ${father.lastName}`.trim()} />
        <Row label="เบอร์โทรศัพท์" value={father.phone} />
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold mb-4">ข้อมูลมารดา</h2>
        <Row label="ชื่อ-นามสกุล" value={`${mother.prefix} ${mother.firstName} ${mother.lastName}`.trim()} />
        <Row label="เบอร์โทรศัพท์" value={mother.phone} />
      </div>

      <div className="flex justify-between">
        <button className="btn-ghost" onClick={onBack} disabled={saving}>
          ← กลับ
        </button>
        <button className="btn-primary" onClick={handleFinish} disabled={saving}>
          {saving ? 'กำลังบันทึกลงฐานข้อมูล...' : 'ลงทะเบียนเสร็จแล้ว → เลือกห้องพัก'}
        </button>
      </div>
    </div>
  )
}
