import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BedDouble, Check, ClipboardPen, CreditCard, LoaderCircle, Star } from 'lucide-react'
import ProfileManager from '../components/tenant/ProfileManager'
import RegistrationBanner from '../components/tenant/RegistrationBanner'
import TenantPass from '../components/tenant/TenantPass'
import { useAuth } from '../context/AuthContext'
import { useRegistration } from '../context/RegistrationContext'
import useRegistrationPeriod from '../hooks/useRegistrationPeriod'
import api, { errMsg } from '../studentApi'

export default function Dashboard() {
  const { user } = useAuth()
  const { booking, payment, review } = useRegistration()
  const reg = useRegistrationPeriod()
  const [profile, setProfile] = useState(undefined) // undefined = กำลังโหลด, null = ยังไม่กรอก
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([api.get('/api/profile'), api.get('/api/bookings/me').catch(() => ({ data: null }))])
      .then(([p, b]) => {
        if (cancelled) return
        setProfile(p.data)
        setRoomCode(b.data?.room?.code || '')
      })
      .catch((e) => {
        if (cancelled) return
        setProfile(null)
        setError(errMsg(e))
      })
    return () => { cancelled = true }
  }, [])

  const steps = [
    { label: 'กรอกข้อมูลผู้เช่า', done: !!profile, to: '/apply', Icon: ClipboardPen },
    { label: 'เลือกห้องพัก', done: booking.confirmed || !!roomCode, to: '/app/rooms', Icon: BedDouble },
    { label: 'ชำระเงิน', done: payment.status === 'paid', to: '/app/payment', Icon: CreditCard },
    { label: 'รีวิว', done: review.submitted, to: '/app/review', Icon: Star },
  ]
  const nextStep = steps.find((s) => !s.done)
  const doneCount = steps.filter((s) => s.done).length
  const displayName = profile ? `${profile.prefix}${profile.firstName}` : user?.name || user?.identifier

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-bone/60">สวัสดี,</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold break-words">{displayName}</h1>
      </div>

      {/* ส่วนที่ 1: กำหนดการรับลงทะเบียน */}
      <RegistrationBanner reg={reg} />

      {error && <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</p>}

      {profile === undefined ? (
        <div className="card flex items-center gap-3 text-sm text-bone/60"><LoaderCircle size={16} className="animate-spin" /> กำลังโหลดข้อมูลผู้เช่า…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* ส่วนที่ 3: บัตรผู้เช่าดิจิทัล */}
            <div className="lg:col-span-2">
              {profile ? (
                <TenantPass profile={profile} roomCode={roomCode} term={reg.period?.term} onChange={setProfile} />
              ) : (
                <div className="rounded-3xl border-2 border-dashed border-charcoal-line bg-charcoal-soft p-8 text-center space-y-3">
                  <p className="font-display font-bold text-lg">ยังไม่มีบัตรผู้เช่า</p>
                  <p className="text-sm text-bone/60">กรอกข้อมูลผู้เช่าให้ครบเพื่อรับบัตรประจำตัวผู้เช่าดิจิทัลและ QR Code</p>
                  <Link to="/apply" className="btn-primary inline-flex items-center gap-2">กรอกข้อมูลผู้เช่า <ArrowRight size={14} /></Link>
                </div>
              )}
            </div>

            {/* ความคืบหน้าการลงทะเบียน */}
            <section aria-labelledby="progress-title" className="lg:col-span-3 card space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 id="progress-title" className="font-display text-lg font-bold">ความคืบหน้าการเข้าพัก</h2>
                <span className="text-xs text-bone/60">{doneCount}/{steps.length} ขั้นตอน</span>
              </div>
              <div className="h-2 rounded-full bg-charcoal-line overflow-hidden">
                <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
              </div>
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {steps.map(({ label, done, to, Icon }, i) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition ${done ? 'border-room-empty2/40 bg-room-empty2/10' : nextStep?.label === label ? 'border-gold bg-gold/5 hover:bg-gold/10' : 'border-charcoal-line hover:border-gold/50'}`}
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-room-empty2 text-white' : 'bg-charcoal text-gold'}`}>
                        {done ? <Check size={16} /> : <Icon size={16} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] text-bone/50">ขั้นที่ {i + 1}</span>
                        <span className="block text-sm font-medium">{label}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              {nextStep && (
                <Link to={nextStep.to} className="btn-primary inline-flex items-center gap-2">
                  ไปยังขั้นถัดไป: {nextStep.label} <ArrowRight size={14} />
                </Link>
              )}
            </section>
          </div>

          {/* ส่วนที่ 2: การจัดการข้อมูลส่วนตัว */}
          {profile && <ProfileManager profile={profile} registrationOpen={reg.isOpen} onChange={setProfile} />}
        </>
      )}
    </div>
  )
}
