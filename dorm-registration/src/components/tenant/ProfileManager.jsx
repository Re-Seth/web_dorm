import { useEffect, useState } from 'react'
import {
  BookmarkCheck, CarFront, GraduationCap, IdCard, LoaderCircle, Lock, PencilLine, Phone, Save, ShieldAlert, X,
} from 'lucide-react'
import api, { errMsg } from '../../studentApi'
import {
  BuildingFields, ContactFields, EducationFields, EmergencyFields, InfoRows, PersonalFields, SectionTitle, TENANT_EMPTY,
  VehicleFields, formToPayload, profileToForm, sectionRows, validateSection,
} from './TenantFields'

// ชุดช่องสำหรับแก้ไขแต่ละหมวด (การ์ดหลายใบอาจเปิดชุดเดียวกัน)
const EDITORS = {
  personal: {
    title: 'แก้ไขข้อมูลส่วนตัว & การศึกษา',
    validate: ['building', 'personal'],
    lockedWhenClosed: true,
    render: (form, set) => (
      <div className="space-y-6">
        <div><SectionTitle>เพศและอาคารหอพัก</SectionTitle><BuildingFields form={form} set={set} /></div>
        <div><SectionTitle>ข้อมูลประจำตัวตามเอกสารราชการ</SectionTitle><PersonalFields form={form} set={set} /></div>
        <div><SectionTitle>การศึกษา / สถานะผู้เช่า</SectionTitle><EducationFields form={form} set={set} /></div>
      </div>
    ),
  },
  contact: { title: 'แก้ไขช่องทางการติดต่อ', validate: ['contact'], render: (form, set) => <ContactFields form={form} set={set} /> },
  emergency: { title: 'แก้ไขผู้ติดต่อฉุกเฉิน', validate: ['emergency'], render: (form, set) => <EmergencyFields form={form} set={set} /> },
  vehicle: { title: 'แก้ไขข้อมูลยานพาหนะ', validate: ['vehicle'], render: (form, set) => <VehicleFields form={form} set={set} /> },
}

const CARDS = [
  { id: 'personal', title: 'ข้อมูลส่วนตัว', Icon: IdCard, editor: 'personal' },
  { id: 'education', title: 'การศึกษา / สถานะผู้เช่า', Icon: GraduationCap, editor: 'personal' },
  { id: 'contact', title: 'ช่องทางการติดต่อ', Icon: Phone, editor: 'contact' },
  { id: 'emergency1', title: 'ผู้ติดต่อฉุกเฉินคนที่ 1', Icon: ShieldAlert, editor: 'emergency' },
  { id: 'emergency2', title: 'ผู้ติดต่อฉุกเฉินคนที่ 2', Icon: ShieldAlert, editor: 'emergency' },
  { id: 'vehicle', title: 'ยานพาหนะ', Icon: CarFront, editor: 'vehicle' },
]

function EditDialog({ editorId, profile, onClose, onSaved }) {
  const editor = EDITORS[editorId]
  const [form, setForm] = useState(() => ({ ...TENANT_EMPTY, ...profileToForm(profile) }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function save(e) {
    e.preventDefault()
    for (const section of editor.validate) {
      const msg = validateSection(section, form)
      if (msg) return setError(msg)
    }
    setBusy(true)
    setError('')
    try {
      const { data } = await api.put('/api/profile', formToPayload(form))
      onSaved(data)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form onSubmit={save} noValidate role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title" className="bg-japandi-bg text-japandi-oak rounded-3xl w-full max-w-3xl border border-japandi-sand shadow-2xl my-8 overflow-hidden">
        <div className="bg-white px-6 py-4 border-b border-japandi-sand flex items-center justify-between">
          <h3 id="edit-dialog-title" className="font-display font-bold flex items-center gap-2"><PencilLine size={16} className="text-japandi-terracotta" /> {editor.title}</h3>
          <button type="button" onClick={onClose} disabled={busy} aria-label="ปิด" className="w-8 h-8 rounded-full hover:bg-japandi-sand flex items-center justify-center transition"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {editor.render(form, set)}
          {error && <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{error}</p>}
        </div>
        <div className="px-6 py-4 bg-white border-t border-japandi-sand flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="px-5 py-2.5 rounded-full border border-japandi-sand text-sm hover:bg-japandi-sand/50 transition">ยกเลิก</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-japandi-terracotta text-white text-sm font-medium hover:bg-japandi-terracotta-dark transition shadow-md flex items-center gap-2 disabled:opacity-60">
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />} บันทึก
          </button>
        </div>
      </form>
    </div>
  )
}

// การจัดการข้อมูลส่วนตัว: แสดงทุกหมวด + ปุ่มแก้ไข + ตัวเลือกบันทึกไว้ภาคเรียนถัดไป
export default function ProfileManager({ profile, registrationOpen, onChange }) {
  const [editing, setEditing] = useState(null)
  const [keepBusy, setKeepBusy] = useState(false)
  const [keepError, setKeepError] = useState('')
  const form = { ...TENANT_EMPTY, ...profileToForm(profile) }

  async function toggleKeep(e) {
    const keepForNextTerm = e.target.checked
    setKeepBusy(true)
    setKeepError('')
    onChange({ ...profile, keepForNextTerm })
    try {
      const { data } = await api.patch('/api/profile/keep', { keepForNextTerm })
      onChange(data)
    } catch (err) {
      onChange({ ...profile, keepForNextTerm: !keepForNextTerm })
      setKeepError(errMsg(err))
    } finally {
      setKeepBusy(false)
    }
  }

  return (
    <section id="profile" aria-labelledby="profile-title" className="space-y-5 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-japandi-terracotta">Manage Profile & Data</span>
          <h2 id="profile-title" className="font-display text-2xl font-bold">การจัดการข้อมูลส่วนตัว</h2>
          <p className="text-sm text-japandi-muted mt-1">แก้ไขเบอร์โทร Line ID ผู้ติดต่อฉุกเฉิน หรือทะเบียนรถได้ตลอดเวลา</p>
        </div>
        <p className="text-[11px] text-japandi-muted">อัปเดตล่าสุด {new Date(profile.updatedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>

      <label className={`flex items-start gap-4 p-5 rounded-3xl border cursor-pointer transition ${profile.keepForNextTerm ? 'border-japandi-terracotta bg-white shadow-sm' : 'border-japandi-sand bg-white/70 hover:bg-white'}`}>
        <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${profile.keepForNextTerm ? 'bg-japandi-terracotta text-white' : 'bg-japandi-sand text-japandi-terracotta'}`}>
          <BookmarkCheck size={20} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-sm">บันทึกข้อมูลชุดนี้ไว้สำหรับการลงทะเบียนในภาคเรียนใหม่</span>
          <span className="block text-xs text-japandi-muted mt-0.5">เมื่อเปิดรับสมัครรอบถัดไป ระบบจะดึงข้อมูลเดิมมาใช้ล่วงหน้า ไม่ต้องกรอกใหม่ทั้งหมด</span>
          {keepError && <span role="alert" className="block text-xs text-red-600 mt-1">{keepError}</span>}
        </span>
        <span className="relative inline-flex items-center shrink-0 mt-1">
          <input type="checkbox" checked={profile.keepForNextTerm} onChange={toggleKeep} disabled={keepBusy} className="peer sr-only" />
          <span className="w-11 h-6 rounded-full bg-japandi-sand peer-checked:bg-japandi-terracotta transition peer-focus-visible:ring-2 peer-focus-visible:ring-japandi-terracotta peer-focus-visible:ring-offset-2" />
          <span className="absolute left-0.5 w-5 h-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CARDS.map(({ id, title, Icon, editor }) => {
          const locked = EDITORS[editor].lockedWhenClosed && !registrationOpen
          return (
            <article key={id} className="bg-white rounded-3xl border border-japandi-sand p-5 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-0.5 transition duration-300">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <span className="w-8 h-8 rounded-xl bg-japandi-sand text-japandi-terracotta flex items-center justify-center"><Icon size={15} /></span>
                  {title}
                </h3>
                {locked ? (
                  <span title="แก้ไขได้เฉพาะช่วงเปิดรับลงทะเบียน" className="text-[11px] text-japandi-muted flex items-center gap-1"><Lock size={12} /> ล็อกแล้ว</span>
                ) : (
                  <button type="button" onClick={() => setEditing(editor)} className="px-3 py-1.5 rounded-full border border-japandi-sand text-xs font-medium hover:border-japandi-terracotta hover:text-japandi-terracotta transition flex items-center gap-1">
                    <PencilLine size={12} /> แก้ไข
                  </button>
                )}
              </div>
              <InfoRows rows={sectionRows(id, form)} />
            </article>
          )
        })}
      </div>

      {editing && (
        <EditDialog
          editorId={editing}
          profile={profile}
          onClose={() => setEditing(null)}
          onSaved={(data) => { onChange(data); setEditing(null) }}
        />
      )}
    </section>
  )
}
