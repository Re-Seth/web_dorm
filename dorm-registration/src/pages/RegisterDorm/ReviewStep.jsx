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
  const navigate = useNavigate()

  function handleFinish() {
    markInfoCompleted()
    navigate('/app/rooms')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card">
        <h2 className="font-display text-lg font-semibold mb-4">ข้อมูลนิสิต</h2>
        <Row label="ชื่อ-นามสกุล" value={`${student.prefix} ${student.firstName} ${student.lastName}`} />
        <Row label="เลขบัตรประชาชน" value={student.citizenId} />
        <Row label="เบอร์โทรศัพท์" value={student.phone} />
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold mb-4">ข้อมูลบิดา</h2>
        <Row label="ชื่อ-นามสกุล" value={`${father.prefix} ${father.firstName} ${father.lastName}`} />
        <Row label="เบอร์โทรศัพท์" value={father.phone} />
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold mb-4">ข้อมูลมารดา</h2>
        <Row label="ชื่อ-นามสกุล" value={`${mother.prefix} ${mother.firstName} ${mother.lastName}`} />
        <Row label="เบอร์โทรศัพท์" value={mother.phone} />
      </div>

      <div className="flex justify-between">
        <button className="btn-ghost" onClick={onBack}>
          ← กลับ
        </button>
        <button className="btn-primary" onClick={handleFinish}>
          ลงทะเบียนเสร็จแล้ว → เลือกห้องพัก
        </button>
      </div>
    </div>
  )
}
