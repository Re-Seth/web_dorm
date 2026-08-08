import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OtpInput from '../components/OtpInput'
import { useAuth } from '../context/AuthContext'

const MODE = { LOGIN: 'login', REGISTER: 'register' }

export default function AuthPage() {
  const [mode, setMode] = useState(MODE.REGISTER)
  const [stage, setStage] = useState('credentials') // credentials | otp
  const [form, setForm] = useState({ username: '', password: '', contact: '' })
  const [otp, setOtp] = useState('')
  const [sentCode, setSentCode] = useState('')
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function sendOtp() {
    setError('')
    if (!form.username || !form.password) {
      setError('กรุณากรอก Username และ Password ให้ครบถ้วน')
      return
    }
    if (mode === MODE.REGISTER && !form.contact) {
      setError('กรุณากรอกอีเมลหรือเบอร์โทรศัพท์เพื่อรับรหัส OTP')
      return
    }
    // simulate sending a 6-digit code to email/phone
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setSentCode(code)
    setStage('otp')
    setResendIn(30)
    // demo aid only — a real backend never returns the OTP to the client
    console.info('[DEMO] OTP ที่ส่งไปยัง', form.contact || 'บัญชีของคุณ', '=', code)
  }

  function verifyOtp() {
    if (otp.length !== 6) {
      setError('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก')
      return
    }
    if (otp !== sentCode) {
      setError('รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      return
    }
    login({ identifier: form.username, contact: form.contact })
    navigate('/app')
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-charcoal-soft border-r border-charcoal-line p-12">
        <div>
          <p className="font-display text-2xl font-bold text-gold">หอพักเทาทอง</p>
          <p className="text-bone/50 text-sm mt-1">มหาวิทยาลัยบูรพา</p>
        </div>
        <div>
          <p className="font-display text-3xl font-semibold leading-snug max-w-sm">
            ลงทะเบียนหอพัก จองห้อง และชำระเงิน<span className="text-gold">ในที่เดียว</span>
          </p>
          <p className="text-bone/50 text-sm mt-4 max-w-sm">
            ตั้งแต่ยืนยันตัวตนด้วย OTP ไปจนถึงเลือกห้องพักแบบเรียลไทม์ — ครบทุกขั้นตอนของการเข้าหอ
          </p>
        </div>
        <p className="text-bone/30 text-xs">© {new Date().getFullYear()} หอพักเทาทอง</p>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {stage === 'credentials' ? (
            <>
              <div className="flex gap-1 mb-8 bg-charcoal-soft border border-charcoal-line rounded-md p-1">
                {[
                  [MODE.REGISTER, 'ลงทะเบียนใหม่'],
                  [MODE.LOGIN, 'เข้าสู่ระบบ'],
                ].map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m)
                      setError('')
                    }}
                    className={
                      'flex-1 py-2 rounded text-sm font-medium transition-colors ' +
                      (mode === m ? 'bg-gold text-charcoal' : 'text-bone/60 hover:text-bone')
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <h1 className="font-display text-xl font-semibold mb-1">
                {mode === MODE.REGISTER ? 'สร้างบัญชีนิสิต' : 'เข้าสู่ระบบ'}
              </h1>
              <p className="text-bone/50 text-sm mb-6">
                {mode === MODE.REGISTER
                  ? 'กรอกข้อมูลเพื่อสร้างบัญชีและยืนยันตัวตนด้วย OTP'
                  : 'กรอก Username และ Password ของคุณ'}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="field-label" htmlFor="username">Username</label>
                  <input
                    id="username"
                    className="field"
                    value={form.username}
                    onChange={(e) => update('username', e.target.value)}
                    placeholder="เช่น 64010001"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    className="field"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {mode === MODE.REGISTER && (
                  <div>
                    <label className="field-label" htmlFor="contact">อีเมล หรือ เบอร์โทรศัพท์ (สำหรับรับ OTP)</label>
                    <input
                      id="contact"
                      className="field"
                      value={form.contact}
                      onChange={(e) => update('contact', e.target.value)}
                      placeholder="name@buu.ac.th หรือ 08xxxxxxxx"
                    />
                  </div>
                )}
              </div>

              {error && <p className="text-room-full text-sm mt-4">{error}</p>}

              <button onClick={sendOtp} className="btn-primary w-full mt-6">
                {mode === MODE.REGISTER ? 'ส่งรหัส OTP' : 'เข้าสู่ระบบ'}
              </button>
            </>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold mb-1">ยืนยันตัวตน (OTP)</h1>
              <p className="text-bone/50 text-sm mb-6">
                กรอกรหัส 6 หลักที่ส่งไปยัง <span className="text-bone">{form.contact || 'บัญชีของคุณ'}</span>
              </p>

              <OtpInput value={otp} onChange={setOtp} />

              {/* DEMO ONLY — shows the code on screen since there is no real
                  SMS/Email provider connected yet. Remove this box once the
                  backend OTP service is wired up. */}
              <div className="mt-4 rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
                โหมดทดสอบ (ยังไม่เชื่อม API): รหัส OTP ของคุณคือ{' '}
                <span className="font-mono font-semibold">{sentCode}</span>
              </div>

              {error && <p className="text-room-full text-sm mt-4">{error}</p>}

              <button onClick={verifyOtp} className="btn-primary w-full mt-6">
                ยืนยันและเข้าสู่ระบบ
              </button>

              <div className="flex items-center justify-between mt-4 text-sm">
                <button className="text-bone/50 hover:text-bone" onClick={() => setStage('credentials')}>
                  ← กลับ
                </button>
                <button
                  disabled={resendIn > 0}
                  onClick={sendOtp}
                  className="text-gold disabled:text-bone/30 disabled:cursor-not-allowed"
                >
                  {resendIn > 0 ? `ส่งรหัสใหม่อีกครั้งใน ${resendIn}s` : 'ส่งรหัสอีกครั้ง'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
