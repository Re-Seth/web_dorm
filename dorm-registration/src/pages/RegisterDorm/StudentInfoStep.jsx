import PersonFields from '../../components/PersonFields'
import { useRegistration } from '../../context/RegistrationContext'

export default function StudentInfoStep({ onNext }) {
  const { student, updatePerson } = useRegistration()

  const isValid =
    student.prefix && student.firstName && student.lastName && student.citizenId?.length === 13 && student.phone?.length === 10

  return (
    <div className="card max-w-2xl">
      <h2 className="font-display text-lg font-semibold mb-1">ส่วนของนิสิต</h2>
      <p className="text-bone/50 text-sm mb-6">กรอกข้อมูลส่วนตัวของนิสิตผู้จองหอพัก</p>

      <PersonFields data={student} onChange={(d) => updatePerson('student', d)} withCitizenId idPrefix="student" />

      <div className="flex justify-end mt-8">
        <button className="btn-primary" disabled={!isValid} onClick={onNext}>
          ถัดไป: ข้อมูลผู้ปกครอง →
        </button>
      </div>
    </div>
  )
}
