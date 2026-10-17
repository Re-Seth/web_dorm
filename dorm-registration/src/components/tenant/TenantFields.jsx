// ช่องกรอกข้อมูลผู้เช่าแยกตามหมวด ใช้ร่วมกันระหว่างหน้าลงทะเบียน (/apply) และการแก้ไขข้อมูลในหน้าหลักผู้เช่า (/app)
import { Ban, Bike, CarFront, Info, Mars, Venus } from 'lucide-react'
import { BUILDINGS, GENDER_DORMS } from '../../data/landing'

export const PREFIXES = { Male: ['นาย'], Female: ['นางสาว', 'นาง'] }
export const RELATIONS = ['บิดา', 'มารดา', 'ผู้ปกครอง', 'พี่น้อง', 'ญาติ', 'อื่น ๆ']
export const EDUCATION_LEVELS = [
  { id: 'bachelor', label: 'ปริญญาตรี' },
  { id: 'master', label: 'ปริญญาโท' },
  { id: 'doctoral', label: 'ปริญญาเอก' },
  { id: 'student', label: 'นักเรียน' },
  { id: 'general', label: 'บุคคลทั่วไป / ผู้เช่าปกติ' },
]
export const VEHICLES = [
  { id: 'none', label: 'ไม่มี', Icon: Ban },
  { id: 'car', label: 'รถยนต์', Icon: CarFront },
  { id: 'motorcycle', label: 'รถจักรยานยนต์', Icon: Bike },
]
const PHONE_RE = /^0\d{8,9}$/
const EMAIL_RE = /^\S+@\S+\.\S+$/

export const TENANT_EMPTY = {
  // บัญชี (ใช้ตอนสมัครเท่านั้น ไม่ส่งไปกับโปรไฟล์)
  email: '', phone: '', password: '',
  // อาคาร
  gender: '', dormId: '',
  // ส่วนตัว
  prefix: '', firstName: '', lastName: '', nameEn: '', citizenId: '', birthDate: '', address: '',
  // การศึกษา
  educationLevel: '', school: '', faculty: '', studyYear: '',
  // ติดต่อ
  mobile: '', lineId: '', contactEmail: '',
  // ฉุกเฉิน 2 ท่าน
  emergencyName: '', emergencyRelation: '', emergencyPhone: '', emergencyAddress: '',
  emergency2Name: '', emergency2Relation: '', emergency2Phone: '', emergency2Address: '',
  // ยานพาหนะ
  vehicleType: 'none', vehicleBrand: '', vehicleColor: '', vehiclePlate: '', vehicleProvince: '',
  keepForNextTerm: false,
  consent: false,
}

export const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-japandi-sand bg-white text-sm text-japandi-oak placeholder:text-japandi-muted/70 outline-none transition focus:border-japandi-terracotta focus:ring-2 focus:ring-japandi-terracotta/20 disabled:bg-japandi-sand/30 disabled:cursor-not-allowed'

// โปรไฟล์จาก backend → ค่าในฟอร์ม
export function profileToForm(data) {
  if (!data) return {}
  return {
    ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in TENANT_EMPTY && v != null)),
    birthDate: data.birthDate?.slice(0, 10) || '',
  }
}

// ค่าในฟอร์ม → ข้อมูลที่ส่งให้ PUT /api/profile
export function formToPayload(form) {
  const { consent, password, email, phone, ...profile } = form // eslint-disable-line no-unused-vars
  return profile
}

export function isValidThaiId(id) {
  if (!/^\d{13}$/.test(id)) return false
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i)
  return (11 - (sum % 11)) % 10 === Number(id[12])
}

export function ageFrom(dateStr) {
  if (!dateStr) return ''
  const dob = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age >= 0 ? age : ''
}

export const thaiDate = (iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  iso ? new Date(iso).toLocaleDateString('th-TH', opts) : ''

// คืนข้อความผิดพลาดแรกของหมวดที่ระบุ หรือ '' ถ้าผ่าน
export function validateSection(section, form) {
  switch (section) {
    case 'account':
      if (!form.firstName.trim() || !form.lastName.trim()) return 'กรุณากรอกชื่อจริงและนามสกุล'
      if (!EMAIL_RE.test(form.email.trim())) return 'กรุณากรอกอีเมลให้ถูกต้อง'
      if (!PHONE_RE.test(form.phone)) return 'กรุณากรอกเบอร์โทรศัพท์มือถือ 10 หลัก (ขึ้นต้นด้วย 0)'
      if (form.password.length < 6) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
      return ''
    case 'building':
      if (!form.gender) return 'กรุณาเลือกเพศเพื่อคัดกรองอาคารหอพัก'
      if (!GENDER_DORMS[form.gender].includes(form.dormId)) return 'กรุณาเลือกอาคารหอพัก'
      return ''
    case 'personal':
      if (!form.prefix || !form.firstName.trim() || !form.lastName.trim()) return 'กรุณากรอกคำนำหน้า ชื่อ และนามสกุลภาษาไทย'
      if (!form.nameEn.trim()) return 'กรุณากรอกชื่อ-นามสกุลภาษาอังกฤษตามบัตรประชาชน'
      if (!isValidThaiId(form.citizenId)) return 'เลขประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
      if (!form.birthDate || new Date(form.birthDate) > new Date()) return 'กรุณากรอกวันเกิดให้ถูกต้อง'
      if (!form.address.trim()) return 'กรุณากรอกที่อยู่ตามทะเบียนบ้าน'
      if (!form.educationLevel) return 'กรุณาเลือกระดับการศึกษา / ประเภทผู้เช่า'
      if (form.educationLevel !== 'general' && (!form.school.trim() || !form.studyYear.trim())) return 'กรุณากรอกสถานศึกษาและชั้นปี'
      return ''
    case 'contact':
      if (!PHONE_RE.test(form.mobile)) return 'กรุณากรอกเบอร์มือถือผู้เช่า 10 หลัก'
      if (form.contactEmail.trim() && !EMAIL_RE.test(form.contactEmail.trim())) return 'อีเมลติดต่อไม่ถูกต้อง'
      return ''
    case 'emergency':
      for (const [n, p] of [['1', 'emergency'], ['2', 'emergency2']]) {
        if (!form[`${p}Name`].trim() || !form[`${p}Relation`]) return `กรุณากรอกชื่อและความสัมพันธ์ของผู้ติดต่อฉุกเฉินคนที่ ${n}`
        if (!PHONE_RE.test(form[`${p}Phone`])) return `กรุณากรอกเบอร์โทรผู้ติดต่อฉุกเฉินคนที่ ${n} ให้ครบ 10 หลัก`
        if (!form[`${p}Address`].trim()) return `กรุณากรอกที่อยู่ผู้ติดต่อฉุกเฉินคนที่ ${n}`
      }
      return ''
    case 'vehicle':
      if (form.vehicleType !== 'none' && ['vehicleBrand', 'vehicleColor', 'vehiclePlate', 'vehicleProvince'].some((k) => !form[k].trim())) {
        return 'กรุณากรอกยี่ห้อ สี เลขทะเบียน และจังหวัดของรถ'
      }
      return ''
    default:
      return ''
  }
}

export function Field({ label, htmlFor, className = '', hint, children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs font-medium mb-1 text-japandi-oak">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-japandi-muted mt-1">{hint}</p>}
    </div>
  )
}

export function SectionTitle({ children, badge }) {
  return (
    <h4 className="text-sm font-bold text-japandi-oak border-b border-japandi-sand pb-2 mb-4 flex items-center gap-2">
      {children}
      {badge && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-japandi-terracotta/10 text-japandi-terracotta">{badge}</span>}
    </h4>
  )
}

// ผูก input กับ state ของฟอร์ม
export function binder(form, set) {
  return (key, transform) => ({
    id: `tenant-${key}`,
    value: form[key] ?? '',
    onChange: (e) => set({ [key]: transform ? transform(e.target.value) : e.target.value }),
  })
}
const digits = (n) => (v) => v.replace(/\D/g, '').slice(0, n)

export function AccountFields({ form, set }) {
  const bind = binder(form, set)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="ชื่อจริง *" htmlFor="tenant-firstName"><input {...bind('firstName')} className={inputCls} placeholder="สมชาย" autoComplete="given-name" /></Field>
      <Field label="นามสกุล *" htmlFor="tenant-lastName"><input {...bind('lastName')} className={inputCls} placeholder="ใจดี" autoComplete="family-name" /></Field>
      <Field label="อีเมล (ใช้เข้าสู่ระบบ) *" htmlFor="tenant-email"><input {...bind('email')} type="email" className={inputCls} placeholder="example@email.com" autoComplete="email" /></Field>
      <Field label="เบอร์โทรศัพท์มือถือ *" htmlFor="tenant-phone"><input {...bind('phone', digits(10))} type="tel" inputMode="numeric" className={inputCls} placeholder="0812345678" autoComplete="tel" /></Field>
      <Field label="ตั้งรหัสผ่าน *" htmlFor="tenant-password" className="sm:col-span-2">
        <input {...bind('password')} type="password" className={inputCls} placeholder="อย่างน้อย 6 ตัวอักษร" autoComplete="new-password" />
      </Field>
    </div>
  )
}

export function BuildingFields({ form, set, locked = false }) {
  function chooseGender(gender) {
    const allowed = GENDER_DORMS[gender]
    set({
      gender,
      dormId: allowed.includes(form.dormId) ? form.dormId : allowed.length === 1 ? allowed[0] : '',
      prefix: PREFIXES[gender].includes(form.prefix) ? form.prefix : PREFIXES[gender][0],
    })
  }
  const genders = [
    { id: 'Male', label: 'ชาย (Male)', hint: 'กำหนดสิทธิ์: เทาทอง 1', Icon: Mars, on: 'border-blue-600 bg-blue-50/60', icon: 'text-blue-600' },
    { id: 'Female', label: 'หญิง (Female)', hint: 'เลือกได้: เทาทอง 2, 3, 4', Icon: Venus, on: 'border-pink-500 bg-pink-50/60', icon: 'text-pink-500' },
  ]
  return (
    <div className="space-y-4">
      <fieldset disabled={locked}>
        <legend className="block text-xs font-medium mb-2 text-japandi-oak">เพศ (ตามบัตรประชาชน - ใช้คัดกรองโซนหอพัก) *</legend>
        <div className="grid grid-cols-2 gap-4">
          {genders.map((g) => (
            <label key={g.id} className={locked ? 'cursor-not-allowed' : 'cursor-pointer'}>
              <input type="radio" name="gender" value={g.id} checked={form.gender === g.id} onChange={() => chooseGender(g.id)} className="peer sr-only" />
              <div className={`p-4 rounded-2xl border-2 text-center transition peer-focus-visible:ring-2 peer-focus-visible:ring-japandi-terracotta ${form.gender === g.id ? g.on : 'border-japandi-sand bg-white/50'} ${locked && form.gender !== g.id ? 'opacity-40' : 'hover:bg-white'}`}>
                <g.Icon size={26} className={`mx-auto mb-2 ${g.icon}`} />
                <span className="block text-sm font-bold text-japandi-oak">{g.label}</span>
                <span className="text-[10px] text-japandi-muted block mt-1">{g.hint}</span>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {form.gender === 'Male' && (
        <p className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
          <Info size={16} className="shrink-0" /> สำหรับผู้สมัครเพศชาย ระบบกำหนดสิทธิ์เข้าพัก <b>หอพักเทาทอง 1</b> ให้แล้ว
        </p>
      )}
      {form.gender === 'Female' && (
        <fieldset disabled={locked} className="p-4 rounded-2xl bg-white border border-japandi-sand">
          <legend className="text-xs font-bold px-1 text-japandi-oak">เลือกอาคารหอพัก *</legend>
          <div className="grid grid-cols-3 gap-3 mt-1">
            {BUILDINGS.filter((b) => b.gender === 'Female').map((b) => (
              <label key={b.id} className={locked ? 'cursor-not-allowed' : 'cursor-pointer'}>
                <input type="radio" name="dormId" value={b.id} checked={form.dormId === b.id} onChange={() => set({ dormId: b.id })} className="peer sr-only" />
                <div className={`p-3 rounded-xl border text-center transition peer-focus-visible:ring-2 peer-focus-visible:ring-japandi-terracotta ${form.dormId === b.id ? 'border-pink-500 bg-pink-50' : 'border-japandi-sand'} ${locked && form.dormId !== b.id ? 'opacity-40' : 'hover:bg-japandi-bg'}`}>
                  <span className="block text-xs font-bold text-japandi-oak">{b.name}</span>
                  <span className="text-[10px] text-japandi-muted">{b.optionLabel}</span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}

export function PersonalFields({ form, set }) {
  const bind = binder(form, set)
  const age = ageFrom(form.birthDate)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
      <Field label="คำนำหน้า *" htmlFor="tenant-prefix" className="sm:col-span-2">
        <select {...bind('prefix')} className={inputCls}>
          {(PREFIXES[form.gender] || [...PREFIXES.Male, ...PREFIXES.Female]).map((p) => <option key={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="ชื่อจริง (ภาษาไทย) *" htmlFor="tenant-firstName" className="sm:col-span-2"><input {...bind('firstName')} className={inputCls} /></Field>
      <Field label="นามสกุล (ภาษาไทย) *" htmlFor="tenant-lastName" className="sm:col-span-2"><input {...bind('lastName')} className={inputCls} /></Field>
      <Field label="ชื่อ - นามสกุล ภาษาอังกฤษ (ตรงตามบัตรประชาชน) *" htmlFor="tenant-nameEn" className="sm:col-span-6">
        <input {...bind('nameEn')} className={inputCls} placeholder="Mr. Somchai Jaidee" />
      </Field>
      <Field label="เลขประจำตัวประชาชน 13 หลัก *" htmlFor="tenant-citizenId" className="sm:col-span-3">
        <input {...bind('citizenId', digits(13))} inputMode="numeric" className={`${inputCls} font-mono tracking-wider`} placeholder="1234567890123" />
      </Field>
      <Field label="วัน / เดือน / ปีเกิด *" htmlFor="tenant-birthDate" className="sm:col-span-2">
        <input {...bind('birthDate')} type="date" max={new Date().toISOString().slice(0, 10)} className={inputCls} />
      </Field>
      <Field label="อายุ" htmlFor="tenant-age" className="sm:col-span-1">
        <input id="tenant-age" readOnly tabIndex={-1} value={age === '' ? '' : `${age} ปี`} className={`${inputCls} bg-japandi-sand/40 font-bold text-japandi-terracotta`} placeholder="อัตโนมัติ" />
      </Field>
      <Field label="ที่อยู่ตามทะเบียนบ้านปัจจุบัน *" htmlFor="tenant-address" className="sm:col-span-6">
        <textarea {...bind('address')} rows={2} className={inputCls} placeholder="บ้านเลขที่ หมู่ ซอย ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์" />
      </Field>
    </div>
  )
}

export function EducationFields({ form, set }) {
  const bind = binder(form, set)
  const general = form.educationLevel === 'general'
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="block text-xs font-medium mb-2 text-japandi-oak">ระดับการศึกษา / ประเภทผู้เช่า *</legend>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {EDUCATION_LEVELS.map((lv) => (
            <label key={lv.id} className="cursor-pointer">
              <input type="radio" name="educationLevel" value={lv.id} checked={form.educationLevel === lv.id} onChange={() => set({ educationLevel: lv.id })} className="peer sr-only" />
              <div className={`h-full px-3 py-2.5 rounded-xl border text-center text-xs font-medium transition peer-focus-visible:ring-2 peer-focus-visible:ring-japandi-terracotta ${form.educationLevel === lv.id ? 'border-japandi-terracotta bg-white text-japandi-terracotta' : 'border-japandi-sand bg-white/50 hover:bg-white'}`}>
                {lv.label}
              </div>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
        <Field label={general ? 'สถานที่ทำงาน (ถ้ามี)' : 'สถานศึกษา (มหาวิทยาลัย / โรงเรียน) *'} htmlFor="tenant-school" className="sm:col-span-6">
          <input {...bind('school')} className={inputCls} placeholder={general ? 'บริษัท / หน่วยงาน' : 'มหาวิทยาลัยบูรพา'} />
        </Field>
        {!general && (
          <>
            <Field label="คณะ / สาขาวิชา" htmlFor="tenant-faculty" className="sm:col-span-4">
              <input {...bind('faculty')} className={inputCls} placeholder="คณะวิทยาการสารสนเทศ / สาขาวิทยาการคอมพิวเตอร์" />
            </Field>
            <Field label="ชั้นปี *" htmlFor="tenant-studyYear" className="sm:col-span-2">
              <select {...bind('studyYear')} className={inputCls}>
                <option value="">-- เลือก --</option>
                {['ปี 1', 'ปี 2', 'ปี 3', 'ปี 4', 'ปี 5', 'ปี 6', 'อื่น ๆ'].map((y) => <option key={y}>{y}</option>)}
              </select>
            </Field>
          </>
        )}
      </div>
    </div>
  )
}

export function ContactFields({ form, set }) {
  const bind = binder(form, set)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="เบอร์โทรศัพท์มือถือของผู้เช่า *" htmlFor="tenant-mobile">
        <input {...bind('mobile', digits(10))} type="tel" inputMode="numeric" className={inputCls} placeholder="0812345678" />
      </Field>
      <Field label="ไอดีไลน์ (Line ID)" htmlFor="tenant-lineId"><input {...bind('lineId')} className={inputCls} placeholder="ไม่บังคับ" /></Field>
      <Field label="อีเมลสำหรับติดต่อ" htmlFor="tenant-contactEmail" className="sm:col-span-2" hint="เว้นว่างได้ หากใช้อีเมลเดียวกับที่เข้าสู่ระบบ">
        <input {...bind('contactEmail')} type="email" className={inputCls} placeholder="example@email.com" />
      </Field>
    </div>
  )
}

function EmergencyPerson({ form, set, prefix, index, hint }) {
  const bind = binder(form, set)
  const copyAddress = (e) => e.target.checked && set({ [`${prefix}Address`]: form.address })
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-japandi-sand">
      <p className="text-xs font-bold text-japandi-terracotta mb-3">บุคคลติดต่อฉุกเฉินคนที่ {index}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="ชื่อ - นามสกุล *" htmlFor={`tenant-${prefix}Name`} className="sm:col-span-2"><input {...bind(`${prefix}Name`)} className={inputCls} /></Field>
        <Field label="ความสัมพันธ์ *" htmlFor={`tenant-${prefix}Relation`}>
          <select {...bind(`${prefix}Relation`)} className={inputCls}>
            <option value="">-- เลือก ({hint}) --</option>
            {RELATIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="เบอร์โทรศัพท์ติดต่อฉุกเฉิน *" htmlFor={`tenant-${prefix}Phone`}>
          <input {...bind(`${prefix}Phone`, digits(10))} type="tel" inputMode="numeric" className={inputCls} placeholder="0891234567" />
        </Field>
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1 gap-2">
            <label htmlFor={`tenant-${prefix}Address`} className="text-xs font-medium text-japandi-oak">ที่อยู่ปัจจุบัน *</label>
            {form.address && (
              <label className="flex items-center gap-1.5 text-[11px] text-japandi-muted cursor-pointer">
                <input type="checkbox" checked={form[`${prefix}Address`] === form.address} onChange={copyAddress} className="accent-japandi-terracotta" />
                ใช้ที่อยู่เดียวกับผู้เช่า
              </label>
            )}
          </div>
          <textarea {...bind(`${prefix}Address`)} rows={2} className={inputCls} />
        </div>
      </div>
    </div>
  )
}

export function EmergencyFields({ form, set }) {
  return (
    <div className="space-y-4">
      <EmergencyPerson form={form} set={set} prefix="emergency" index={1} hint="บิดา, มารดา, ผู้ปกครอง" />
      <EmergencyPerson form={form} set={set} prefix="emergency2" index={2} hint="บิดา, มารดา, พี่น้อง, ญาติ" />
    </div>
  )
}

export function VehicleFields({ form, set }) {
  const bind = binder(form, set)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {VEHICLES.map((v) => (
          <label key={v.id} className="cursor-pointer">
            <input type="radio" name="vehicleType" value={v.id} checked={form.vehicleType === v.id} onChange={() => set({ vehicleType: v.id })} className="peer sr-only" />
            <div className={`p-4 rounded-2xl border-2 text-center transition hover:bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-japandi-terracotta ${form.vehicleType === v.id ? 'border-japandi-terracotta bg-white' : 'border-japandi-sand'}`}>
              <v.Icon size={22} className={`mx-auto mb-1 ${v.id === 'none' ? 'text-japandi-muted' : 'text-japandi-terracotta'}`} />
              <span className="block text-xs font-bold text-japandi-oak">{v.label}</span>
            </div>
          </label>
        ))}
      </div>
      {form.vehicleType !== 'none' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ยี่ห้อรถ *" htmlFor="tenant-vehicleBrand"><input {...bind('vehicleBrand')} className={inputCls} placeholder="Honda" /></Field>
          <Field label="สีรถ *" htmlFor="tenant-vehicleColor"><input {...bind('vehicleColor')} className={inputCls} placeholder="ขาว" /></Field>
          <Field label="เลขทะเบียนรถ *" htmlFor="tenant-vehiclePlate"><input {...bind('vehiclePlate')} className={inputCls} placeholder="1กข 1234" /></Field>
          <Field label="จังหวัด *" htmlFor="tenant-vehicleProvince"><input {...bind('vehicleProvince')} className={inputCls} placeholder="ชลบุรี" /></Field>
        </div>
      )}
    </div>
  )
}

// ข้อมูลแต่ละหมวดในรูปแบบอ่านอย่างเดียว: [[หัวข้อ, ค่า], ...]
export function sectionRows(section, form) {
  const edu = EDUCATION_LEVELS.find((l) => l.id === form.educationLevel)?.label
  const vehicle = VEHICLES.find((v) => v.id === form.vehicleType)
  const age = ageFrom(form.birthDate)
  switch (section) {
    case 'personal':
      return [
        ['ชื่อ (ไทย)', `${form.prefix}${form.firstName} ${form.lastName}`.trim()],
        ['ชื่อ (อังกฤษ)', form.nameEn],
        ['เลขบัตรประชาชน', form.citizenId],
        ['วันเกิด', form.birthDate && `${thaiDate(form.birthDate)} (${age} ปี)`],
        ['ที่อยู่ตามทะเบียนบ้าน', form.address],
      ]
    case 'education':
      return form.educationLevel === 'general'
        ? [['ประเภทผู้เช่า', edu], ['สถานที่ทำงาน', form.school]]
        : [['ระดับการศึกษา', edu], ['สถานศึกษา', form.school], ['คณะ / สาขา', form.faculty], ['ชั้นปี', form.studyYear]]
    case 'contact':
      return [['มือถือ', form.mobile], ['Line ID', form.lineId], ['อีเมล', form.contactEmail]]
    case 'emergency1':
      return [['ชื่อ', form.emergencyName], ['ความสัมพันธ์', form.emergencyRelation], ['โทร', form.emergencyPhone], ['ที่อยู่', form.emergencyAddress]]
    case 'emergency2':
      return [['ชื่อ', form.emergency2Name], ['ความสัมพันธ์', form.emergency2Relation], ['โทร', form.emergency2Phone], ['ที่อยู่', form.emergency2Address]]
    case 'vehicle':
      return form.vehicleType === 'none'
        ? [['ประเภท', 'ไม่มียานพาหนะ']]
        : [['ประเภท', vehicle?.label], ['ยี่ห้อ / สี', `${form.vehicleBrand} / ${form.vehicleColor}`], ['ทะเบียน', `${form.vehiclePlate} ${form.vehicleProvince}`.trim()]]
    default:
      return []
  }
}

export function InfoRows({ rows }) {
  return (
    <dl className="space-y-1.5 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="text-japandi-muted w-28 shrink-0">{k}</dt>
          <dd className="font-medium text-japandi-oak break-words min-w-0">{v || '-'}</dd>
        </div>
      ))}
    </dl>
  )
}

// สรุปข้อมูลทั้งหมด (ขั้นตอนสุดท้ายของการสมัคร)
export function TenantSummary({ form, account }) {
  const building = BUILDINGS.find((b) => b.id === form.dormId)
  const groups = [
    ['อาคารที่สมัคร', [['อาคาร', building?.name], ['เพศ', form.gender === 'Male' ? 'ชาย' : form.gender === 'Female' ? 'หญิง' : ''], ['บัญชี', account]]],
    ['ข้อมูลส่วนตัว', sectionRows('personal', form)],
    ['การศึกษา / สถานะผู้เช่า', sectionRows('education', form)],
    ['ช่องทางการติดต่อ', sectionRows('contact', form)],
    ['ผู้ติดต่อฉุกเฉินคนที่ 1', sectionRows('emergency1', form)],
    ['ผู้ติดต่อฉุกเฉินคนที่ 2', sectionRows('emergency2', form)],
    ['ยานพาหนะ', sectionRows('vehicle', form)],
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {groups.map(([title, rows]) => (
        <div key={title} className="bg-white rounded-2xl p-4 border border-japandi-sand">
          <h5 className="text-xs font-bold text-japandi-terracotta mb-2">{title}</h5>
          <InfoRows rows={rows} />
        </div>
      ))}
    </div>
  )
}
