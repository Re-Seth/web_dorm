import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookmarkCheck, LoaderCircle, LogIn, Mail, Send, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useRegistration } from '../../context/RegistrationContext'
import api, { clearToken, errMsg, setToken } from '../../studentApi'
import {
  AccountFields, BuildingFields, ContactFields, EducationFields, EmergencyFields, Field, PersonalFields,
  SectionTitle, TENANT_EMPTY, TenantSummary, VehicleFields, formToPayload, inputCls, profileToForm, validateSection,
} from './TenantFields'

export const STEPS = [
  { title: 'บัญชีผู้ใช้', sections: ['building'] },
  { title: 'ข้อมูลส่วนตัว & การศึกษา', sections: ['personal'] },
  { title: 'ช่องทางการติดต่อ', sections: ['contact'] },
  { title: 'ผู้ติดต่อฉุกเฉิน', sections: ['emergency'] },
  { title: 'ยานพาหนะ', sections: ['vehicle'] },
  { title: 'ตรวจสอบ & ยืนยัน', sections: [] },
]

function SocialButtons() {
  // ยังไม่ได้เชื่อมผู้ให้บริการ OAuth — แสดงไว้ตามแบบ แต่กดไม่ได้
  return (
    <div className="grid grid-cols-2 gap-3">
      {['Google', 'LINE'].map((name) => (
        <button key={name} type="button" disabled title="ยังไม่เปิดให้บริการ" className="px-4 py-2.5 rounded-xl border border-japandi-sand bg-white/60 text-xs font-medium text-japandi-muted cursor-not-allowed">
          เข้าสู่ระบบด้วย {name} <span className="block text-[10px]">เร็ว ๆ นี้</span>
        </button>
      ))}
    </div>
  )
}

// ฟอร์มลงทะเบียนผู้เช่า 6 ขั้น (หน้า /apply) — ยังไม่มีบัญชีจะสร้างบัญชีให้ในขั้นแรก
export default function TenantApplyForm({ preset, onDone, canSubmit = true }) {
  const { isAuthenticated, user, login } = useAuth()
  const { refresh } = useRegistration()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [accountMode, setAccountMode] = useState('signup') // signup | login
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [form, setForm] = useState(() => ({ ...TENANT_EMPTY, ...(preset || {}) }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // ล็อกอินอยู่แล้ว → ดึงข้อมูลเดิมมาใส่ (ค่าที่เลือกจากการ์ดอาคารมาก่อน)
  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    api.get('/api/profile').then(({ data }) => {
      if (!cancelled && data) setForm((f) => ({ ...f, ...profileToForm(data), ...(preset || {}) }))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.getElementById('apply-form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  function validate(s) {
    if (s === 1 && !isAuthenticated) {
      if (accountMode === 'login') return 'กรุณาเข้าสู่ระบบก่อน หรือเลือก "สมัครด้วยอีเมล"'
      const msg = validateSection('account', form)
      if (msg) return msg
    }
    for (const section of STEPS[s - 1].sections) {
      const msg = validateSection(section, form)
      if (msg) return msg
    }
    if (s === STEPS.length && !form.consent) return 'กรุณายืนยันความถูกต้องของข้อมูลก่อนส่ง'
    return ''
  }

  function signIn(data) {
    clearToken()
    setToken(data.token)
    login({ identifier: data.user.username, username: data.user.username, contact: data.user.email, name: data.user.name, role: data.user.role })
  }

  // สร้างบัญชีจริง (ใช้อีเมลเป็น username) แล้วล็อกอินต่อทันที
  async function createAccount() {
    const email = form.email.trim().toLowerCase()
    try {
      await api.post('/register', { username: email, email, password: form.password, name: `${form.firstName.trim()} ${form.lastName.trim()}` })
    } catch (e) {
      // 400 มีหลายสาเหตุ (อีเมลซ้ำ / รหัสผ่านยาวเกิน ฯลฯ) → ใช้ข้อความจาก backend
      const msg = errMsg(e)
      throw new Error(/มีบัญชีอยู่แล้ว/.test(msg) ? `${msg} กรุณาเลือก "มีบัญชีแล้ว เข้าสู่ระบบ"` : msg)
    }
    const { data } = await api.post('/login', { username: email, password: form.password })
    signIn(data)
  }

  async function handleInlineLogin() {
    setError('')
    if (!loginForm.username.trim() || !loginForm.password) return setError('กรุณากรอกอีเมลและรหัสผ่าน')
    setBusy(true)
    try {
      const username = loginForm.username.trim()
      const { data } = await api.post('/login', { username: username.includes('@') ? username.toLowerCase() : username, password: loginForm.password })
      signIn(data)
      // มีข้อมูลผู้เช่าอยู่แล้ว → ไปจัดการที่หน้าหลักผู้เช่า
      const { data: profile } = await api.get('/api/profile')
      if (profile) navigate('/app')
    } catch (e) {
      setError(e.response?.status === 401 ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    const msg = validate(step)
    setError(msg)
    if (msg) return
    if (step === 1 && !isAuthenticated) {
      setBusy(true)
      try {
        await createAccount()
      } catch (e) {
        setError(e.message)
        return
      } finally {
        setBusy(false)
      }
    }
    if (step === 1) {
      set({
        mobile: form.mobile || form.phone,
        contactEmail: form.contactEmail || form.email.trim().toLowerCase() || user?.contact || '',
      })
    }
    setStep(step + 1)
  }

  async function submit(e) {
    e.preventDefault()
    if (step < STEPS.length) return next()
    const msg = validate(step)
    setError(msg)
    if (msg) return
    setBusy(true)
    try {
      const { data: saved } = await api.put('/api/profile', formToPayload(form))
      await refresh()
      onDone?.(saved)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const loginInput = (key) => ({
    id: `inline-login-${key}`,
    value: loginForm[key],
    onChange: (e) => setLoginForm((f) => ({ ...f, [key]: e.target.value })),
  })
  const last = step === STEPS.length

  return (
    <div id="apply-form-top" className="bg-japandi-bg text-japandi-oak rounded-3xl w-full border border-japandi-sand shadow-xl overflow-hidden scroll-mt-24">
      {/* progress */}
      <div className="bg-white px-5 sm:px-8 py-4 border-b border-japandi-sand">
        <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="ขั้นตอนการลงทะเบียน">
          {STEPS.map((s, i) => {
            const n = i + 1
            const state = n < step ? 'done' : n === step ? 'active' : 'todo'
            return (
              <li key={s.title} className="flex items-center gap-1.5 sm:gap-2 flex-1 last:flex-none min-w-0">
                <span
                  aria-current={state === 'active' ? 'step' : undefined}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                    state === 'done' ? 'bg-japandi-terracotta text-white' : state === 'active' ? 'bg-japandi-oak text-white ring-4 ring-japandi-sand' : 'bg-japandi-bg border border-japandi-sand text-japandi-muted'
                  }`}
                >
                  {n}
                </span>
                {n !== STEPS.length && <span className={`h-0.5 flex-1 rounded-full ${state === 'done' ? 'bg-japandi-terracotta' : 'bg-japandi-sand'}`} />}
              </li>
            )
          })}
        </ol>
        <p className="mt-3 text-xs text-japandi-muted">
          ขั้นตอนที่ {step} จาก {STEPS.length} · <b className="text-japandi-oak">{STEPS[step - 1].title}</b>
        </p>
      </div>

      <form onSubmit={submit} noValidate className="p-5 sm:p-8 space-y-6">
        {step === 1 && (
          <>
            {isAuthenticated ? (
              <p className="p-4 rounded-2xl bg-white border border-japandi-sand text-sm">
                เข้าสู่ระบบในชื่อ <b>{user?.name || user?.identifier}</b> แล้ว ข้อมูลจะบันทึกลงบัญชีนี้
              </p>
            ) : (
              <div>
                <SectionTitle>การสร้างบัญชีผู้ใช้</SectionTitle>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-japandi-sand/60 mb-5">
                  {[['signup', 'สมัครด้วยอีเมล', UserPlus], ['login', 'มีบัญชีแล้ว เข้าสู่ระบบ', LogIn]].map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setAccountMode(id); setError('') }}
                      aria-pressed={accountMode === id}
                      className={`py-2 rounded-full text-xs sm:text-sm font-medium transition flex items-center justify-center gap-1.5 ${accountMode === id ? 'bg-white shadow text-japandi-oak' : 'text-japandi-muted hover:text-japandi-oak'}`}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
                {accountMode === 'signup' ? (
                  <AccountFields form={form} set={set} />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="อีเมล" htmlFor="inline-login-username"><input {...loginInput('username')} autoComplete="username" className={inputCls} placeholder="example@email.com" /></Field>
                      <Field label="รหัสผ่าน" htmlFor="inline-login-password"><input {...loginInput('password')} type="password" autoComplete="current-password" className={inputCls} /></Field>
                    </div>
                    <button type="button" onClick={handleInlineLogin} disabled={busy} className="w-full px-6 py-2.5 rounded-full bg-japandi-oak text-white text-sm font-medium hover:bg-black transition flex items-center justify-center gap-2 disabled:opacity-60">
                      {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Mail size={14} />} เข้าสู่ระบบด้วยอีเมล
                    </button>
                    <div className="flex items-center gap-3 text-[11px] text-japandi-muted">
                      <span className="h-px flex-1 bg-japandi-sand" /> หรือ <span className="h-px flex-1 bg-japandi-sand" />
                    </div>
                    <SocialButtons />
                  </div>
                )}
              </div>
            )}
            {(isAuthenticated || accountMode === 'signup') && (
              <div>
                <SectionTitle>เลือกเพศและอาคารหอพัก</SectionTitle>
                <BuildingFields form={form} set={set} />
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <SectionTitle>ข้อมูลประจำตัวตามเอกสารราชการ</SectionTitle>
              <PersonalFields form={form} set={set} />
            </div>
            <div>
              <SectionTitle>ข้อมูลการศึกษา / สถานะผู้เช่า</SectionTitle>
              <EducationFields form={form} set={set} />
            </div>
          </>
        )}

        {step === 3 && (
          <div>
            <SectionTitle>ช่องทางการติดต่อ</SectionTitle>
            <ContactFields form={form} set={set} />
          </div>
        )}

        {step === 4 && (
          <div>
            <SectionTitle badge="สำคัญมาก">ข้อมูลผู้ปกครอง / บุคคลติดต่อฉุกเฉิน (2 ท่าน)</SectionTitle>
            <p className="text-xs text-japandi-muted -mt-2 mb-4">ใช้ติดต่อในกรณีฉุกเฉินเพื่อความปลอดภัยของผู้พักอาศัย</p>
            <EmergencyFields form={form} set={set} />
          </div>
        )}

        {step === 5 && (
          <div>
            <SectionTitle>ข้อมูลยานพาหนะ</SectionTitle>
            <VehicleFields form={form} set={set} />
          </div>
        )}

        {last && (
          <div className="space-y-4">
            <SectionTitle>ตรวจสอบข้อมูลก่อนยืนยัน</SectionTitle>
            <TenantSummary form={form} account={user?.contact || user?.identifier} />
            <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${form.keepForNextTerm ? 'border-japandi-terracotta bg-white' : 'border-japandi-sand bg-white/60 hover:bg-white'}`}>
              <input type="checkbox" checked={form.keepForNextTerm} onChange={(e) => set({ keepForNextTerm: e.target.checked })} className="mt-1 accent-japandi-terracotta" />
              <span className="text-xs">
                <span className="flex items-center gap-1.5 font-bold text-sm"><BookmarkCheck size={15} className="text-japandi-terracotta" /> บันทึกข้อมูลชุดนี้ไว้สำหรับการลงทะเบียนในภาคเรียนใหม่</span>
                <span className="text-japandi-muted block mt-0.5">รอบถัดไประบบจะดึงข้อมูลเดิมมาใช้ ไม่ต้องกรอกใหม่ทั้งหมด เปลี่ยนใจได้ตลอดที่หน้าหลักผู้เช่า</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.consent} onChange={(e) => set({ consent: e.target.checked })} className="mt-0.5 accent-japandi-terracotta" />
              <span>ข้าพเจ้ายืนยันว่าข้อมูลข้างต้นเป็นความจริง และยินยอมให้หอพักเทาทองจัดเก็บข้อมูลเพื่อใช้ในการทำสัญญาเช่า</span>
            </label>
          </div>
        )}

        {error && <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{error}</p>}

        {!(step === 1 && !isAuthenticated && accountMode === 'login') && (
          <div className="flex items-center justify-between pt-6 border-t border-japandi-sand">
            <button
              type="button"
              onClick={() => { setError(''); setStep(step - 1) }}
              className={`px-5 py-2.5 rounded-full border border-japandi-sand bg-white text-sm hover:bg-japandi-sand/50 transition flex items-center gap-1 ${step === 1 ? 'invisible' : ''}`}
            >
              <ArrowLeft size={14} /> ย้อนกลับ
            </button>
            <button
              type="submit"
              disabled={busy || (last && !canSubmit)}
              title={last && !canSubmit ? 'อยู่นอกรอบเปิดรับลงทะเบียน' : undefined}
              className={`px-6 py-2.5 rounded-full text-white text-sm font-medium transition shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${last ? 'bg-japandi-oak hover:bg-black' : 'bg-japandi-terracotta hover:bg-japandi-terracotta-dark'}`}
            >
              {busy && <LoaderCircle size={14} className="animate-spin" />}
              {last ? <><Send size={14} /> ยืนยันการลงทะเบียน</> : step === 1 && !isAuthenticated ? <>สร้างบัญชีและไปต่อ <ArrowRight size={14} /></> : <>ถัดไป <ArrowRight size={14} /></>}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
