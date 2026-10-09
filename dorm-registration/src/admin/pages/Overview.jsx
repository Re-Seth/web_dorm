import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errMsg } from '../api'
import { ErrorBox, PageHeader, baht } from '../ui'

function Stat({ label, value, sub, to }) {
  const body = (
    <div className="card h-full hover:border-gold/50 transition-colors">
      <p className="text-xs text-bone/50 mb-2">{label}</p>
      <p className="font-display text-3xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-bone/40 mt-1">{sub}</p>}
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

export default function Overview() {
  const [s, setS] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/admin/stats').then((r) => setS(r.data)).catch((e) => setError(errMsg(e)))
  }, [])

  return (
    <div className="max-w-5xl">
      <PageHeader title="ภาพรวมหอพัก" subtitle="สถิติรวมทุกอาคาร" />
      <ErrorBox message={error} />
      {s && s.rooms.total === 0 && (
        <div className="card mb-6 border-gold/40">
          ยังไม่มีห้องในระบบ — ไปที่ <Link className="text-gold underline" to="/admin/rooms">ห้องพัก</Link> แล้วกด “สร้างห้องตามผังเดิม”
        </div>
      )}
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="อัตราการเข้าพัก" value={`${s.beds.rate}%`} sub={`${s.beds.occupied}/${s.beds.capacity} เตียง`} to="/admin/rooms" />
          <Stat label="ห้องทั้งหมด" value={s.rooms.total} sub={`เต็ม ${s.rooms.full} · ปิดซ่อม ${s.rooms.maintenance}`} to="/admin/rooms" />
          <Stat label="รอยืนยันการจอง" value={s.bookings.pending} sub={`ค้างชำระ ${s.bookings.unpaid} รายการ`} to="/admin/bookings" />
          <Stat label="รายได้ (ชำระแล้ว)" value={baht(s.revenue)} to="/admin/bookings" />
          <Stat label="แจ้งซ่อมรอดำเนินการ" value={s.maintenance.pending} sub={`กำลังซ่อม ${s.maintenance.inProgress} · เสร็จ ${s.maintenance.completed}`} to="/admin/maintenance" />
          <Stat label="นิสิตที่ลงทะเบียน" value={s.users} to="/admin/users" />
        </div>
      )}
    </div>
  )
}
