import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OtpInput from '../components/OtpInput'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'

const MODE = { LOGIN: 'login', REGISTER: 'register' }

export default function AuthPage() {
  const [mode, setMode] = useState(MODE.REGISTER)
  const [stage, setStage] = useState('credentials') // credentials | otp
  const [form, setForm] = useState({ username: '', password: '', contact: '' })
  const [otp, setOtp] = useState('')
  const [sentCode, setSentCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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

  async function sendOtp() {
    setError('')
    if (!form.username || !form.password) {
      setError('กรุณากรอก Username และ Password ให้ครบถ้วน')
      return
    }
    if (mode === MODE.REGISTER && !form.contact) {
      setError('กรุณากรอกอีเมลหรือเบอร์โทรศัพท์เพื่อรับรหัส OTP')
      return
    }

    // จำลองรหัส OTP 6 หลัก
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setSentCode(code)
    setStage('otp')
    setResendIn(30)
    console.info('[OTP Demo] รหัส OTP ส่งไปยัง', form.contact || form.username, '=', code)
  }

  async function verifyOtp() {
    if (otp.length !== 6) {
      setError('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก')
      return
    }
    if (otp !== sentCode) {
      setError('รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (mode === MODE.REGISTER) {
        const isEmail = form.contact.includes('@')
        const res = await authApi.register({
          username: form.username,
          password: form.password,
          email: isEmail ? form.contact : `${form.username}@buu.ac.th`,
          phone: !isEmail ? form.contact : '',
        })
        login(res.data.user, res.data.token)
      } else {
        const res = await authApi.login({
          username: form.username,
          password: form.password,
        })
        login(res.data.user, res.data.token)
      }
      if (res.data.user?.role === 'ADMIN') {
        navigate('/app/admin')
      } else {
        navigate('/app')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  // ทางเลือกสำหรับ Login ตรงโดยไม่ต้องรอ OTP (สะดวกในการทดสอบ)
  async function handleDirectLogin() {
    if (!form.username || !form.password) {
      setError('กรุณากรอก Username และ Password ให้ครบถ้วน')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await authApi.login({
        username: form.username,
        password: form.password,
      })
      login(res.data.user, res.data.token)
      if (res.data.user?.role === 'ADMIN') {
        navigate('/app/admin')
      } else {
        navigate('/app')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Username หรือ Password ไม่ถูกต้อง')
    } finally {
      setLoading(false)
    }
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
            เชื่อมต่อฐานข้อมูล SQLite Backend เต็มรูปแบบ ตั้งแต่ยืนยันตัวตนด้วย OTP ไปจนถึงบันทึกการจองและแจ้งซ่อม
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

              <button
                onClick={mode === MODE.LOGIN ? handleDirectLogin : sendOtp}
                disabled={loading}
                className="btn-primary w-full mt-6"
              >
                {loading
                  ? 'กำลังดำเนินการ...'
                  : mode === MODE.REGISTER
                  ? 'ส่งรหัส OTP'
                  : 'เข้าสู่ระบบ'}
              </button>

              {mode === MODE.LOGIN && (
                <>
                  <button
                    onClick={sendOtp}
                    type="button"
                    className="w-full mt-2 text-xs text-bone/50 hover:text-gold transition-colors py-1"
                  >
                    หรือเข้าสู่ระบบด้วย OTP
                  </button>

                  <div className="mt-5 pt-4 border-t border-charcoal-line">
                    <p className="text-xs text-bone/40 mb-2">บัญชีทดสอบด่วน (คลิกเพื่อกรอกอัตโนมัติ):</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setForm({ username: 'admin', password: 'admin123', contact: '' })}
                        className="p-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-left transition-colors"
                      >
                        <div className="font-bold flex items-center gap-1">
                          <span>👑 ผู้จัดการหอ</span>
                        </div>
                        <div className="text-[10px] text-amber-400/70 font-mono mt-0.5">admin / admin123</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ username: '64010001', password: '123456', contact: '' })}
                        className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-left transition-colors"
                      >
                        <div className="font-bold flex items-center gap-1">
                          <span>👤 นิสิต</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">64010001 / 123456</div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold mb-1">ยืนยันตัวตน (OTP)</h1>
              <p className="text-bone/50 text-sm mb-6">
                กรอกรหัส 6 หลักที่ส่งไปยัง <span className="text-bone">{form.contact || form.username}</span>
              </p>

              <OtpInput value={otp} onChange={setOtp} />

              <div className="mt-4 rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
                รหัส OTP จำลองสำหรับทดสอบระบบคือ:{' '}
                <span className="font-mono font-semibold">{sentCode}</span>
              </div>

              {error && <p className="text-room-full text-sm mt-4">{error}</p>}

              <button
                onClick={verifyOtp}
                disabled={loading}
                className="btn-primary w-full mt-6"
              >
                {loading ? 'กำลังตรวจสอบ...' : 'ยืนยันและเข้าสู่ระบบ'}
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
