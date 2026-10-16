import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DORMS, getRoomsForFloor } from '../data/dorms'
import RoomCell from '../components/RoomCell'
import ConfirmModal from '../components/ConfirmModal'
import { useRegistration } from '../context/RegistrationContext'
import { dormApi } from '../services/api'

export default function RoomSelection() {
  const [dormId, setDormId] = useState(DORMS[0].id)
  const [pendingRoom, setPendingRoom] = useState(null)
  const [dbRooms, setDbRooms] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { selectRoom, confirmBooking } = useRegistration()
  const navigate = useNavigate()

  const dorm = DORMS.find((d) => d.id === dormId) || DORMS[0]

  // รายการชั้นทั้งหมดของหอพักนี้ เรียงจากชั้น 1 ถึงชั้นสูงสุด
  const floorList = useMemo(() => {
    return Array.from({ length: dorm.floors }, (_, i) => i + 1)
  }, [dorm.floors])

  // ข้อมูลสำรองทุกชั้นกรณีออฟไลน์
  const fallbackRooms = useMemo(() => {
    const all = []
    for (let f = 1; f <= dorm.floors; f++) {
      all.push(...getRoomsForFloor(dormId, f))
    }
    return all
  }, [dormId, dorm.floors])

  // โหลดข้อมูลห้องพักทุกชั้นของหอพักนี้จาก SQLite Backend
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    dormApi
      .getRooms(dormId) // ไม่ระบุ floor เพื่อดึงข้อมูลห้องทุกชั้นพร้อมกัน
      .then((res) => {
        if (isMounted && res.data && res.data.length > 0) {
          setDbRooms(res.data)
        }
      })
      .catch(() => {
        if (isMounted) setDbRooms(null)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [dormId])

  const rooms = dbRooms && dbRooms.length > 0 ? dbRooms : fallbackRooms

  function handleDormChange(id) {
    setDormId(id)
  }

  async function handleConfirm() {
    if (!pendingRoom) return
    setErrorMsg('')
    try {
      selectRoom({ dormId, floor: pendingRoom.floor, roomId: pendingRoom.id })
      await confirmBooking(pendingRoom.id)
      setPendingRoom(null)
      navigate('/app/payment')
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'เกิดข้อผิดพลาดในการจองห้องพัก')
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">เลือกห้องพัก</h1>
      <p className="text-bone/50 mb-6">
        เลือกหอพัก และห้องที่ต้องการตามชั้นที่แสดงเรียงลงมา (เชื่อมต่อฐานข้อมูล SQLite Real-time)
      </p>

      {/* แท็บเลือกหอพัก */}
      <div className="flex flex-wrap gap-2 mb-4">
        {DORMS.map((d) => (
          <button
            key={d.id}
            onClick={() => handleDormChange(d.id)}
            className={
              'px-4 py-2 rounded-md text-sm border transition-colors ' +
              (d.id === dormId
                ? 'bg-gold text-charcoal border-gold font-medium'
                : 'border-charcoal-line text-bone/70 hover:border-gold/50')
            }
          >
            {d.name} <span className="opacity-60">({d.gender})</span>
          </button>
        ))}
      </div>

      {/* คำอธิบายสถานะสี */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-5 text-xs text-bone/60">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-room-empty2" /> ว่าง (0-1 คน)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-room-mid" /> ใกล้เต็ม (2-3 คน)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-room-full" /> เต็ม (4 คน)
          </span>
        </div>

        {/* ปุ่มลัดเลื่อนไปยังชั้นที่ต้องการ (Quick Jump) */}
        <div className="flex items-center gap-1.5 text-xs text-bone/50">
          <span>เลื่อนไปที่:</span>
          {floorList.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                const el = document.getElementById(`floor-${f}`)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="px-2 py-0.5 rounded border border-charcoal-line text-bone/70 hover:text-gold hover:border-gold/50 transition-colors"
            >
              ชั้น {f}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-800 text-red-200 text-sm rounded-md">
          {errorMsg}
        </div>
      )}

      {loading && (
        <div className="mb-4 text-xs text-gold flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
          กำลังอัปเดตข้อมูลสถานะห้องพักจากฐานข้อมูล...
        </div>
      )}

      {/* แสดงผังห้องพักเรียงลงมาตามชั้น (ชั้น 1 อยู่บนสุด เรียงลงมา) */}
      <div className="space-y-6">
        {floorList.map((f) => {
          const floorRooms = rooms.filter((r) => Number(r.floor) === f)
          const availableCount = floorRooms.filter((r) => (r.occupied || 0) < r.capacity).length

          return (
            <div key={f} id={`floor-${f}`} className="card scroll-mt-20">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-charcoal-line">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-md bg-gold/15 border border-gold/40 text-gold flex items-center justify-center font-mono font-bold text-sm">
                    {f}
                  </span>
                  <div>
                    <h2 className="font-display font-semibold text-base sm:text-lg text-bone">
                      {dorm.name} · ชั้น {f}
                    </h2>
                    <p className="text-xs text-bone/50">
                      {floorRooms.length > 0
                        ? `ห้อง ${floorRooms[0]?.code} – ${floorRooms[floorRooms.length - 1]?.code}`
                        : `ชั้น ${f}`}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-bone/60">
                  ว่าง {availableCount} / {floorRooms.length} ห้อง
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {floorRooms.map((room) => (
                  <RoomCell key={room.id} room={room} selected={false} onSelect={setPendingRoom} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal ยืนยันการจองห้องพัก */}
      <ConfirmModal
        open={!!pendingRoom}
        title={`ยืนยันการจองห้อง ${pendingRoom?.code || ''}`}
        description={`คุณต้องการจองห้อง ${pendingRoom?.code} ที่ ${dorm.name} ชั้น ${pendingRoom?.floor} ใช่หรือไม่?`}
        confirmLabel="ยืนยันการจอง"
        onConfirm={handleConfirm}
        onCancel={() => setPendingRoom(null)}
      />
    </div>
  )
}
