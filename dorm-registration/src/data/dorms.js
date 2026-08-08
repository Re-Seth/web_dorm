// Mock data — in a real deployment this comes from the backend
// (e.g. GET /api/dorms/:id/rooms) with live occupancy counts.

export const DORMS = [
  { id: 'tt1', name: 'หอพักเทาทอง 1', gender: 'ชาย', floors: 4 },
  { id: 'tt2', name: 'หอพักเทาทอง 2', gender: 'หญิง', floors: 4 },
  { id: 'tt3', name: 'หอพักเทาทอง 3', gender: 'หญิง', floors: 5 },
  { id: 'tt4', name: 'หอพักเทาทอง 4', gender: 'หญิง', floors: 5 },
]

const CAPACITY = 4 // 0/4 per journey map

// deterministic pseudo-random occupancy so the layout is stable across renders
function seededOccupancy(seed) {
  const x = Math.sin(seed) * 10000
  const frac = x - Math.floor(x)
  return Math.floor(frac * (CAPACITY + 1)) // 0..4
}

export function getRoomsForFloor(dormId, floor) {
  const dormIndex = DORMS.findIndex((d) => d.id === dormId) + 1
  const roomsPerFloor = 10
  const rooms = []
  for (let i = 1; i <= roomsPerFloor; i++) {
    const roomNumber = `${String.fromCharCode(64 + dormIndex)}${floor}${String(i).padStart(2, '0')}`
    const seed = dormIndex * 1000 + floor * 100 + i
    const occupied = seededOccupancy(seed)
    rooms.push({
      id: `${dormId}-${floor}-${i}`,
      code: roomNumber,
      capacity: CAPACITY,
      occupied,
    })
  }
  return rooms
}

export function roomStatus(occupied, capacity) {
  if (occupied >= capacity) return 'full'
  if (occupied >= 2) return 'mid'
  return 'empty'
}

export const ROOM_STATUS_LABEL = {
  empty: 'ว่าง',
  mid: 'ใกล้เต็ม',
  full: 'เต็ม',
}
