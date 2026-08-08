import PersonFields from '../../components/PersonFields'
import { useRegistration } from '../../context/RegistrationContext'

function isPersonValid(p) {
  return p.prefix && p.firstName && p.lastName && p.phone?.length === 10
}

export default function ParentInfoStep({ onNext, onBack }) {
  const { father, mother, updatePerson } = useRegistration()
  const isValid = isPersonValid(father) && isPersonValid(mother)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card">
        <h2 className="font-display text-lg font-semibold mb-1">ส่วนของผู้ปกครอง — บิดา</h2>
        <p className="text-bone/50 text-sm mb-6">กรอกข้อมูลบิดาของนิสิต</p>
        <PersonFields data={father} onChange={(d) => updatePerson('father', d)} idPrefix="father" />
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold mb-1">ส่วนของผู้ปกครอง — มารดา</h2>
        <p className="text-bone/50 text-sm mb-6">กรอกข้อมูลมารดาของนิสิต</p>
        <PersonFields data={mother} onChange={(d) => updatePerson('mother', d)} idPrefix="mother" />
      </div>

      <div className="flex justify-between">
        <button className="btn-ghost" onClick={onBack}>
          ← กลับ
        </button>
        <button className="btn-primary" disabled={!isValid} onClick={onNext}>
          ถัดไป: ตรวจสอบข้อมูล →
        </button>
      </div>
    </div>
  )
}
