import { useState } from 'react'
import StepIndicator from '../../components/StepIndicator'
import StudentInfoStep from './StudentInfoStep'
import ParentInfoStep from './ParentInfoStep'
import ReviewStep from './ReviewStep'

const STEPS = ['ข้อมูลนิสิต', 'ข้อมูลผู้ปกครอง', 'ตรวจสอบข้อมูล']

export default function RegisterWizard() {
  const [step, setStep] = useState(1)

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">ลงทะเบียนหอพัก</h1>
      <p className="text-bone/50 mb-6">กรอกข้อมูลทีละส่วนเพื่อความชัดเจน ไม่ต้องกรอกทุกอย่างพร้อมกัน</p>

      <StepIndicator steps={STEPS} current={step} />

      {step === 1 && <StudentInfoStep onNext={() => setStep(2)} />}
      {step === 2 && <ParentInfoStep onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <ReviewStep onBack={() => setStep(2)} />}
    </div>
  )
}
