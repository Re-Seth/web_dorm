import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, ClipboardList, LayoutDashboard, Mars, ShieldCheck, Venus } from 'lucide-react'
import SiteHeader from '../components/landing/SiteHeader'
import RegistrationBanner from '../components/tenant/RegistrationBanner'
import TenantApplyForm, { STEPS } from '../components/tenant/TenantApplyForm'
import { BUILDINGS, GENDER_LABEL } from '../data/landing'
import useRegistrationPeriod from '../hooks/useRegistrationPeriod'

// หน้าลงทะเบียนโดยเฉพาะ (Dedicated Registration Page)
export default function ApplyPage() {
  const [params] = useSearchParams()
  const reg = useRegistrationPeriod()
  const [saved, setSaved] = useState(null)

  // /apply?dorm=tt2 → เลือกอาคารและเพศไว้ให้ก่อน
  const presetBuilding = BUILDINGS.find((b) => b.id === params.get('dorm'))
  const preset = presetBuilding ? { gender: presetBuilding.gender, dormId: presetBuilding.id } : null
  const building = BUILDINGS.find((b) => b.id === (saved?.dormId || presetBuilding?.id))
  const closed = reg.status === 'UPCOMING' || reg.status === 'CLOSED'

  return (
    <div className="theme-japandi min-h-screen bg-japandi-bg text-japandi-oak font-body">
      <SiteHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-widest text-japandi-terracotta block mb-2">Tenant Registration</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">ลงทะเบียนผู้เช่าหอพักเทาทอง</h1>
          <p className="text-japandi-muted text-sm mt-3">กรอกข้อมูลทีละขั้น ใช้เวลาประมาณ 5 นาที ระบบจะคัดกรองอาคารให้ตามเพศโดยอัตโนมัติ</p>
        </div>

        <RegistrationBanner reg={reg} />

        {saved ? (
          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-japandi-sand shadow-xl p-8 sm:p-10 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto"><Check size={30} /></div>
            <div>
              <h2 className="font-display text-2xl font-bold">ลงทะเบียนเรียบร้อยแล้ว</h2>
              <p className="text-sm text-japandi-muted mt-2">
                ข้อมูลของคุณถูกบันทึกแล้ว อาคารที่ได้รับสิทธิ์: <b className="text-japandi-terracotta">{building?.name}</b>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/app" className="px-6 py-3 rounded-full bg-japandi-oak text-white text-sm font-medium hover:bg-black transition flex items-center justify-center gap-2">
                <LayoutDashboard size={15} /> ไปหน้าหลักผู้เช่า
              </Link>
              <Link to="/app/rooms" className="px-6 py-3 rounded-full bg-japandi-terracotta text-white text-sm font-medium hover:bg-japandi-terracotta-dark transition flex items-center justify-center gap-2">
                เลือกห้องพักต่อ <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-28">
              {building ? (
                <div className="bg-white rounded-3xl overflow-hidden border border-japandi-sand shadow-sm">
                  <img src={building.image} alt={building.name} className="w-full h-40 object-cover" />
                  <div className="p-5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white ${building.gender === 'Male' ? 'bg-blue-600' : 'bg-pink-600'}`}>
                      {building.gender === 'Male' ? <Mars size={11} /> : <Venus size={11} />} {GENDER_LABEL[building.gender]}
                    </span>
                    <h3 className="font-display text-lg font-bold mt-2">หอพัก{building.name}</h3>
                    <p className="text-xs text-japandi-muted mt-1">{building.description}</p>
                    <p className="text-sm font-bold text-japandi-terracotta mt-3">เริ่มต้น ฿{building.price.toLocaleString()} <span className="text-xs font-normal text-japandi-oak">/เดือน</span></p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-japandi-sand p-5 text-sm">
                  <p className="font-bold mb-1">ยังไม่ได้เลือกอาคาร?</p>
                  <p className="text-xs text-japandi-muted mb-3">เลือกได้ในขั้นตอนแรก หรือดูรายละเอียดแต่ละอาคารก่อน</p>
                  <Link to="/#buildings" className="text-xs font-medium text-japandi-terracotta hover:underline">ดูอาคารเทาทอง 1-4 →</Link>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-japandi-sand p-5">
                <p className="flex items-center gap-2 text-sm font-bold mb-3"><ClipboardList size={16} className="text-japandi-terracotta" /> ขั้นตอนการลงทะเบียน</p>
                <ol className="space-y-2 text-xs text-japandi-muted">
                  {STEPS.map((s, i) => (
                    <li key={s.title} className="flex gap-2"><span className="font-bold text-japandi-oak w-4">{i + 1}.</span> {s.title}</li>
                  ))}
                </ol>
              </div>

              <p className="flex items-start gap-2 text-[11px] text-japandi-muted px-2">
                <ShieldCheck size={14} className="shrink-0 mt-0.5 text-japandi-terracotta" />
                ข้อมูลส่วนบุคคลใช้เพื่อการทำสัญญาเช่าและการติดต่อกรณีฉุกเฉินเท่านั้น
              </p>
            </aside>

            <div className="lg:col-span-8">
              {closed && (
                <p role="status" className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  {reg.status === 'UPCOMING' ? 'ยังไม่ถึงรอบเปิดรับลงทะเบียน' : 'ปิดรับลงทะเบียนรอบนี้แล้ว'} — กรอกข้อมูลไว้ล่วงหน้าได้ แต่จะกดยืนยันได้เฉพาะช่วงเปิดรับ
                </p>
              )}
              <TenantApplyForm preset={preset} onDone={setSaved} canSubmit={reg.isOpen || reg.status === 'UNKNOWN'} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
