import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DORMS, getRoomsForFloor } from '../data/dorms'
import RoomCell from '../components/RoomCell'
import ConfirmModal from '../components/ConfirmModal'
import { useRegistration } from '../context/RegistrationContext'

export default function RoomSelection() {
  const [dormId, setDormId] = useState(DORMS[0].id)
  const [floor, setFloor] = useState(1)
  const [pendingRoom, setPendingRoom] = useState(null)
  const { selectRoom, confirmBooking } = useRegistration()
  const navigate = useNavigate()

  const dorm = DORMS.find((d) => d.id === dormId)
  const rooms = useMemo(() => getRoomsForFloor(dormId, floor), [dormId, floor])

  function handleDormChange(id) {
    setDormId(id)
    setFloor(1)
  }

  function handleConfirm() {
    selectRoom({ dormId, floor, roomId: pendingRoom.id })
    confirmBooking()
    setPendingRoom(null)
    navigate('/app/payment')
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">เลือกห้องพัก</h1>
      <p className="text-bone/50 mb-6">เลือกหอพัก ชั้น และห้องที่ต้องการ</p>

      {/* dorm tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      {/* floor tabs */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: dorm.floors }, (_, i) => i + 1).map((f) => (
          <button
            key={f}
            onClick={() => setFloor(f)}
            className={
              'w-10 h-10 rounded-md text-sm border font-mono transition-colors ' +
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
      <div className="flex gap-5 mb-6 text-xs text-bone/60">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-room-empty2" /> ว่าง</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-room-mid" /> ใกล้เต็ม</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-room-full" /> เต็ม</span>
      </div>

      {/* floor plan grid */}
      <div className="card">
        <p className="text-sm text-bone/50 mb-4">
          {dorm.name} · ชั้น {floor}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {rooms.map((room) => (
            <RoomCell key={room.id} room={room} selected={false} onSelect={setPendingRoom} />
          ))}
        </div>
      </div>

      <ConfirmModal
        open={!!pendingRoom}
        title={`ยืนยันการจองห้อง ${pendingRoom?.code || ''}`}
        description={`คุณต้องการจองห้อง ${pendingRoom?.code} ที่ ${dorm.name} ชั้น ${floor} ใช่หรือไม่?`}
        confirmLabel="ยืนยันการจอง"
        onConfirm={handleConfirm}
        onCancel={() => setPendingRoom(null)}
      />
    </div>
  )
}
