import { roomStatus, ROOM_STATUS_LABEL } from '../data/dorms'

const STATUS_STYLE = {
  empty: 'bg-room-empty/20 border-room-empty text-room-empty2',
  mid: 'bg-room-mid/15 border-room-mid text-room-mid',
  full: 'bg-room-full/15 border-room-full text-room-full cursor-not-allowed',
}

export default function RoomCell({ room, selected, onSelect }) {
  const status = roomStatus(room.occupied, room.capacity)
  const disabled = status === 'full'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(room)}
      className={
        'relative flex flex-col items-center justify-center gap-1 rounded-md border-2 py-3 transition-transform ' +
        STATUS_STYLE[status] +
        (selected ? ' ring-2 ring-gold scale-[1.03]' : ' hover:scale-[1.03]')
      }
      title={`${room.code} — ${ROOM_STATUS_LABEL[status]}`}
    >
      <span className="font-mono text-sm font-semibold">{room.code}</span>
      <span className="font-mono text-[11px] opacity-80">
        {room.occupied}/{room.capacity}
      </span>
    </button>
  )
}
