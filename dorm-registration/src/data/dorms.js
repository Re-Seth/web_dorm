// ผังอาคาร — ต้องตรงกับ DORMS ใน dorm-registration-backend/adminRoutes.js
// จำนวนผู้พัก/สถานะห้องจริงมาจาก backend: GET /api/rooms/availability

export const DORMS = [
  { id: 'tt1', name: 'หอพักเทาทอง 1', gender: 'ชาย', floors: 4 },
  { id: 'tt2', name: 'หอพักเทาทอง 2', gender: 'หญิง', floors: 4 },
  { id: 'tt3', name: 'หอพักเทาทอง 3', gender: 'หญิง', floors: 5 },
  { id: 'tt4', name: 'หอพักเทาทอง 4', gender: 'หญิง', floors: 5 },
]

const ROOMS_PER_FLOOR = 10
const CAPACITY = 4

// ห้องทั้งชั้นตามผัง (A101-A110) รวมกับข้อมูลจริงจาก backend
// availability: { [code]: { occupied, capacity, status } } — ห้องที่ยังไม่มีข้อมูล = กำลังโหลด (กดไม่ได้)
export function getRoomsForFloor(dormId, floor, availability = {}) {
  const dormIndex = DORMS.findIndex((d) => d.id === dormId)
  const rooms = []
  for (let i = 1; i <= ROOMS_PER_FLOOR; i++) {
    const code = `${String.fromCharCode(65 + dormIndex)}${floor}${String(i).padStart(2, '0')}`
    const live = availability[code]
    rooms.push({
      id: `${dormId}-${floor}-${i}`,
      code,
      capacity: live?.capacity ?? CAPACITY,
      occupied: live?.occupied ?? null,
      status: live ? live.status : 'LOADING',
    })
  }
  return rooms
}

// สถานะสำหรับแสดงผล: closed = ปิดปรับปรุง/ไม่เปิดจอง, loading = ยังไม่ได้ข้อมูลจาก server
export function roomStatus(room) {
  if (room.status === 'LOADING' || room.occupied == null) return 'loading'
  if (room.status !== 'AVAILABLE') return 'closed'
  if (room.occupied >= room.capacity) return 'full'
  if (room.occupied >= 2) return 'mid'
  return 'empty'
}

export const ROOM_STATUS_LABEL = {
  empty: 'ว่าง',
  mid: 'ใกล้เต็ม',
  full: 'เต็ม',
  closed: 'ปิดปรับปรุง',
  loading: 'กำลังโหลด',
}
