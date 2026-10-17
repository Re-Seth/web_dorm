import { CalendarDays } from 'lucide-react'
import { thaiDate } from './TenantFields'

const STATUS = {
  OPEN: { label: 'เปิดรับลงทะเบียน', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', countdown: 'เหลือเวลาลงทะเบียน / ยืนยันสิทธิ์' },
  UPCOMING: { label: 'ยังไม่เปิดรับลงทะเบียน', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 border-amber-200', countdown: 'เปิดรับลงทะเบียนในอีก' },
  CLOSED: { label: 'ปิดรับลงทะเบียน', dot: 'bg-red-500', pill: 'bg-red-50 text-red-700 border-red-200', countdown: null },
}

function splitTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return [
    [Math.floor(s / 86400), 'วัน'],
    [Math.floor((s % 86400) / 3600), 'ชั่วโมง'],
    [Math.floor((s % 3600) / 60), 'นาที'],
    [s % 60, 'วินาที'],
  ]
}

const dateTime = (iso) => `${thaiDate(iso)} ${new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`

// แบนเนอร์กำหนดการรับลงทะเบียน + นาฬิกานับถอยหลัง (ค่ามาจาก useRegistrationPeriod)
export default function RegistrationBanner({ reg, compact = false }) {
  const { period, status, remaining } = reg
  if (!period) {
    return (
      <div className="rounded-3xl border border-japandi-sand bg-white p-6 text-sm text-japandi-muted">
        {status === 'UNKNOWN' ? 'โหลดกำหนดการรับลงทะเบียนไม่สำเร็จ ตรวจสอบว่า backend กำลังทำงานอยู่' : 'กำลังโหลดกำหนดการรับลงทะเบียน…'}
      </div>
    )
  }
  const s = STATUS[status]

  return (
    <section
      aria-label="กำหนดการรับลงทะเบียน"
      className="relative overflow-hidden rounded-3xl bg-japandi-oak text-japandi-sand p-6 sm:p-8 shadow-xl"
    >
      <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-japandi-terracotta/25 pointer-events-none" aria-hidden="true" />
      <div className="absolute right-24 -bottom-20 w-48 h-48 rounded-full bg-japandi-wood/10 pointer-events-none" aria-hidden="true" />

      <div className={`relative flex flex-col ${compact ? 'gap-4' : 'lg:flex-row lg:items-center lg:justify-between gap-6'}`}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-japandi-wood">
              <CalendarDays size={14} /> รอบการเปิดรับลงทะเบียนประจำภาคเรียน
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">{period.term}</h2>
          <p className="text-sm text-japandi-sand/85">
            {dateTime(period.openAt)} – {dateTime(period.closeAt)}
          </p>
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${s.pill}`}>
            <span className={`w-2 h-2 rounded-full ${s.dot} ${status === 'OPEN' ? 'animate-pulse' : ''}`} />
            สถานะระบบ: {s.label}
          </span>
        </div>

        {s.countdown ? (
          <div>
            <p className="text-xs text-japandi-sand/70 mb-2">{s.countdown}</p>
            <div className="flex gap-2 sm:gap-3" role="timer" aria-live="off">
              {splitTime(remaining).map(([value, unit]) => (
                <div key={unit} className="w-16 sm:w-20 rounded-2xl bg-white/10 border border-white/10 py-3 text-center">
                  <span className="block font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">{String(value).padStart(2, '0')}</span>
                  <span className="text-[10px] sm:text-xs text-japandi-sand/70">{unit}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-japandi-sand/85 max-w-xs">
            หมดเวลารับลงทะเบียนรอบนี้แล้ว ยังแก้ไขข้อมูลติดต่อ ผู้ติดต่อฉุกเฉิน และยานพาหนะได้ตามปกติ
          </p>
        )}
      </div>
    </section>
  )
}
