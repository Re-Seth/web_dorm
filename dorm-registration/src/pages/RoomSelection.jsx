import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DORMS, getRoomsForFloor } from '../data/dorms'
import RoomCell from '../components/RoomCell'
import ConfirmModal from '../components/ConfirmModal'
import { useAuth } from '../context/AuthContext'
import { useRegistration } from '../context/RegistrationContext'
import useRegistrationPeriod from '../hooks/useRegistrationPeriod'
import api, { errMsg } from '../studentApi'
import { GENDER_DORMS } from '../data/landing'

export default function RoomSelection() {
  const { loading, profile, booking, payment, refresh } = useRegistration()
  const isAdmin = useAuth().user?.role === 'ADMIN' // ผู้จัดการดูผังทุกอาคารได้ (อ่านอย่างเดียว)
  const reg = useRegistrationPeriod()
  const [dormId, setDormId] = useState(DORMS[0].id)
  const [floor, setFloor] = useState(1)
  const [pendingRoom, setPendingRoom] = useState(null)
  const [busy, setBusy] = useState(false)
  const lockRef = useRef(false)
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState({})
  const [refreshKey, setRefreshKey] = useState(0)
  const navigate = useNavigate()

  // เห็นเฉพาะอาคารตามเพศในโปรไฟล์ (ชาย → เทาทอง 1 / หญิง → เทาทอง 2-4)
  const allowedDorms = isAdmin ? DORMS : profile ? DORMS.filter((d) => GENDER_DORMS[profile.gender]?.includes(d.id)) : []
  const dorm = DORMS.find((d) => d.id === dormId)
  const rooms = useMemo(() => getRoomsForFloor(dormId, floor, availability), [dormId, floor, availability])
  const paid = payment.status === 'paid'

  // เปิดหน้ามา: ไปที่อาคาร/ชั้นของห้องที่จองไว้ ถ้ายังไม่จองไปที่อาคารในโปรไฟล์
  useEffect(() => {
    if (booking.dormId) {
      setDormId(booking.dormId)
      setFloor(booking.floor)
    } else if (profile) {
      setDormId(profile.dormId)
      setFloor(1)
    }
  }, [profile?.dormId, booking.dormId, booking.floor]) // eslint-disable-line react-hooks/exhaustive-deps

  // ดึงจำนวนผู้พักจริงของชั้นที่เลือกจาก backend
  useEffect(() => {
    if (!profile && !isAdmin) return
    let cancelled = false
    setAvailability({})
    api
      .get('/api/rooms/availability', { params: { dormId, floor } })
      .then((r) => {
        if (!cancelled) setAvailability(Object.fromEntries(r.data.map((x) => [x.code, x])))
      })
      .catch((e) => {
        if (!cancelled) setError('โหลดสถานะห้องไม่สำเร็จ: ' + errMsg(e))
      })
    return () => { cancelled = true }
  }, [dormId, floor, refreshKey, profile, isAdmin])

  async function handleConfirm() {
    if (lockRef.current) return // กันดับเบิลคลิก (state อัปเดตไม่ทันระหว่างคลิกติดกัน)
    lockRef.current = true
    setBusy(true)
    setError('')
    try {
      // backend ตรวจรอบลงทะเบียน เพศ ห้องเต็ม และการจองซ้ำให้ (ชื่อ/เบอร์ติดต่อดึงจากโปรไฟล์)
      await api.post('/api/bookings', { dormId, floor, roomCode: pendingRoom.code })
      await refresh()
      setPendingRoom(null)
      navigate('/app/payment')
    } catch (e) {
      setError(errMsg(e))
      setPendingRoom(null)
      setRefreshKey((k) => k + 1)
    } finally {
      lockRef.current = false
      setBusy(false)
    }
  }

  const header = (
    <>
      <h1 className="font-display text-2xl font-semibold mb-1">เลือกห้องพัก</h1>
      <p className="text-bone/50 mb-6">เลือกหอพัก ชั้น และห้องที่ต้องการ</p>
    </>
  )

  if (loading) return <div>{header}<p className="text-sm text-bone/50">กำลังโหลด…</p></div>

  if (!profile && !isAdmin) {
    return (
      <div className="max-w-lg">
        {header}
        <div className="card space-y-3">
          <p className="font-medium">ต้องกรอกข้อมูลผู้เช่าก่อนจึงจะเลือกห้องได้</p>
          <p className="text-sm text-bone/60">ระบบใช้เพศในข้อมูลผู้เช่าคัดกรองอาคารที่จองได้</p>
          <Link to="/apply" className="btn-primary inline-block">กรอกข้อมูลผู้เช่า →</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {header}

      {booking.confirmed && (
        <p className="text-sm bg-gold/10 border border-gold/40 rounded-xl px-3 py-2 mb-4">
          คุณจองห้อง <b className="font-mono">{booking.roomCode}</b> ไว้แล้ว
          {paid
            ? ' และชำระเงินเรียบร้อย (เปลี่ยนห้องไม่ได้)'
            : ' — เลือกห้องอื่นเพื่อเปลี่ยนห้องได้จนกว่าจะชำระเงิน'}
          {!paid && <> · <Link to="/app/payment" className="underline">ไปชำระเงิน</Link></>}
        </p>
      )}
      {!reg.isOpen && reg.status !== 'LOADING' && (
        <p className="text-sm bg-room-mid/10 border border-room-mid/40 rounded-xl px-3 py-2 mb-4">
          ขณะนี้อยู่นอกรอบเปิดรับลงทะเบียน จึงจองหรือเปลี่ยนห้องไม่ได้ (ดูผังห้องได้อย่างเดียว)
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-room-full bg-room-full/10 border border-room-full/30 rounded-xl px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* dorm tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {allowedDorms.map((d) => (
          <button
            key={d.id}
            onClick={() => { setDormId(d.id); setFloor(1) }}
            className={
              'px-4 py-2 rounded-full text-sm border transition-colors ' +
              (d.id === dormId
                ? 'bg-gold text-charcoal border-gold font-medium'
                : 'border-charcoal-line text-bone/70 hover:border-gold/50')
            }
          >
            {d.name} <span className="opacity-60">({d.gender})</span>
          </button>
        ))}
      </div>

      {/* floor tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Array.from({ length: dorm.floors }, (_, i) => i + 1).map((f) => (
          <button
            key={f}
            onClick={() => setFloor(f)}
            className={
              'w-10 h-10 rounded-full text-sm border font-mono transition-colors ' +
              (f === floor
                ? 'bg-charcoal-soft border-gold text-gold'
                : 'border-charcoal-line text-bone/60 hover:border-gold/50')
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 text-xs text-bone/60">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-room-empty2" /> ว่าง</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-room-mid" /> ใกล้เต็ม</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-room-full" /> เต็ม</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-charcoal-line" /> ปิดปรับปรุง</span>
      </div>

      {/* floor plan grid */}
      <div className="card">
        <p className="text-sm text-bone/50 mb-4">
          {dorm.name} · ชั้น {floor}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {rooms.map((room) => (
            <RoomCell
              key={room.id}
              room={room}
              selected={room.code === booking.roomCode}
              onSelect={paid || !reg.isOpen || isAdmin ? () => {} : setPendingRoom}
            />
          ))}
        </div>
      </div>

      <ConfirmModal
        open={!!pendingRoom}
        busy={busy}
        title={`${booking.confirmed ? 'ยืนยันการเปลี่ยนห้องเป็น' : 'ยืนยันการจองห้อง'} ${pendingRoom?.code || ''}`}
        description={`คุณต้องการ${booking.confirmed ? `ย้ายจากห้อง ${booking.roomCode} ไปห้อง` : 'จองห้อง'} ${pendingRoom?.code} ที่ ${dorm.name} ชั้น ${floor} ใช่หรือไม่?`}
        confirmLabel={booking.confirmed ? 'ยืนยันเปลี่ยนห้อง' : 'ยืนยันการจอง'}
        onConfirm={handleConfirm}
        onCancel={() => setPendingRoom(null)}
      />
    </div>
  )
}
