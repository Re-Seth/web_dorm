import { useEffect, useState, useRef } from 'react'
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
  const floors = Array.from({ length: dorm.floors }, (_, i) => i + 1)
  const paid = payment.status === 'paid'

  // เปิดหน้ามา: ไปที่อาคารของห้องที่จองไว้ ถ้ายังไม่จองไปที่อาคารในโปรไฟล์
  useEffect(() => {
    if (booking.dormId) setDormId(booking.dormId)
    else if (profile) setDormId(profile.dormId)
  }, [profile?.dormId, booking.dormId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ดึงจำนวนผู้พักจริงของทุกชั้นในอาคารจาก backend (รหัสห้องไม่ซ้ำกันข้ามชั้น จึงรวมเป็น map เดียว)
  useEffect(() => {
    if (!profile && !isAdmin) return
    let cancelled = false
    setAvailability({})
    Promise.all(floors.map((floor) => api.get('/api/rooms/availability', { params: { dormId, floor } })))
      .then((results) => {
        if (!cancelled) setAvailability(Object.fromEntries(results.flatMap((r) => r.data).map((x) => [x.code, x])))
      })
      .catch((e) => {
        if (!cancelled) setError('โหลดสถานะห้องไม่สำเร็จ: ' + errMsg(e))
      })
    return () => { cancelled = true }
  }, [dormId, refreshKey, profile, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirm() {
    if (lockRef.current) return // กันดับเบิลคลิก (state อัปเดตไม่ทันระหว่างคลิกติดกัน)
    lockRef.current = true
    setBusy(true)
    setError('')
    try {
      // backend ตรวจรอบลงทะเบียน เพศ ห้องเต็ม และการจองซ้ำให้ (ชื่อ/เบอร์ติดต่อดึงจากโปรไฟล์)
      await api.post('/api/bookings', { dormId, floor: pendingRoom.floor, roomCode: pendingRoom.code })
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
      <p className="text-bone/50 mb-6">เลือกหอพัก แล้วเลือกห้องที่ต้องการจากผังทุกชั้น</p>
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
            onClick={() => setDormId(d.id)}
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

      {/* legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 text-xs text-bone/60">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-room-empty2" /> ว่าง</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-room-mid" /> ใกล้เต็ม</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-room-full" /> เต็ม</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-charcoal-line" /> ปิดปรับปรุง</span>
      </div>

      {/* ผังห้องทุกชั้น เรียงจากชั้น 1 ลงมา */}
      <div className="space-y-4">
        {floors.map((floor) => {
          const mine = booking.dormId === dormId && booking.floor === floor
          return (
            <section key={floor} className="card" aria-label={`ชั้น ${floor}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 rounded-full border border-gold text-gold font-mono text-sm flex items-center justify-center shrink-0">{floor}</span>
                <p className="text-sm text-bone/60">{dorm.name} · ชั้น {floor}</p>
                {mine && <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold/15 text-gold font-medium">ห้องของคุณอยู่ชั้นนี้</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {getRoomsForFloor(dormId, floor, availability).map((room) => (
                  <RoomCell
                    key={room.id}
                    room={room}
                    selected={room.code === booking.roomCode}
                    onSelect={paid || !reg.isOpen || isAdmin ? () => {} : (r) => setPendingRoom({ ...r, floor })}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <ConfirmModal
        open={!!pendingRoom}
        busy={busy}
        title={`${booking.confirmed ? 'ยืนยันการเปลี่ยนห้องเป็น' : 'ยืนยันการจองห้อง'} ${pendingRoom?.code || ''}`}
        description={`คุณต้องการ${booking.confirmed ? `ย้ายจากห้อง ${booking.roomCode} ไปห้อง` : 'จองห้อง'} ${pendingRoom?.code} ที่ ${dorm.name} ชั้น ${pendingRoom?.floor} ใช่หรือไม่?`}
        confirmLabel={booking.confirmed ? 'ยืนยันเปลี่ยนห้อง' : 'ยืนยันการจอง'}
        onConfirm={handleConfirm}
        onCancel={() => setPendingRoom(null)}
      />
    </div>
  )
}
