import { roomStatus, ROOM_STATUS_LABEL } from '../data/dorms'

const STATUS_STYLE = {
  empty: 'bg-room-empty/20 border-room-empty text-room-empty2',
  mid: 'bg-room-mid/15 border-room-mid text-room-mid',
  full: 'bg-room-full/15 border-room-full text-room-full cursor-not-allowed',
  closed: 'bg-charcoal-line/40 border-charcoal-line text-bone/40 cursor-not-allowed',
  loading: 'bg-charcoal-line/20 border-charcoal-line text-bone/30 animate-pulse cursor-wait',
}

export default function RoomCell({ room, selected, onSelect }) {
  const status = roomStatus(room)
  // ห้องที่จองไว้อยู่แล้วกดซ้ำไม่ได้ / ห้องเต็ม ปิดปรับปรุง หรือยังโหลดไม่เสร็จก็กดไม่ได้
  const disabled = selected || ['full', 'closed', 'loading'].includes(status)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(room)}
      className={
        'relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-3 transition-transform ' +
        STATUS_STYLE[status] +
        (selected ? ' ring-2 ring-gold ring-offset-2' : disabled ? '' : ' hover:scale-[1.03]')
      }
      title={`${room.code} — ${selected ? 'ห้องที่คุณจองไว้' : ROOM_STATUS_LABEL[status]}`}
    >
      <span className="font-mono text-sm font-semibold">{room.code}</span>
      <span className="font-mono text-[11px] opacity-80">
        {status === 'closed' ? 'ปิด' : status === 'loading' ? '…' : `${room.occupied}/${room.capacity}`}
      </span>
      {selected && <span className="text-[10px] font-medium text-gold">ห้องของคุณ</span>}
    </button>
  )
}
