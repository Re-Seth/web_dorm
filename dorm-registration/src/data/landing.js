// ข้อมูลที่แสดงบนหน้าแรก (Landing) — id ตรงกับ DORMS ใน dorms.js และ dormId ใน backend
export const GENDER_DORMS = {
  Male: ['tt1'],
  Female: ['tt2', 'tt3', 'tt4'],
}

export const BUILDINGS = [
  {
    id: 'tt1',
    name: 'เทาทอง 1',
    gender: 'Male',
    roomTypes: ['studio'],
    price: 4200,
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80',
    description: 'บรรยากาศสงบ เหมาะแก่การเรียนและการพักผ่อน พร้อมลานกิจกรรมกีฬา',
    tags: ['Studio 24-28 ตร.ม.', 'เตียงเดี่ยว / เตียงคู่'],
    optionLabel: 'Studio',
    mapHighlight: 'ติดลานกีฬา',
    mapArea: 'ฝั่งทิศเหนือ / ใกล้ประตูทางเข้า 1',
    mapNote: 'เดินถึงมหาวิทยาลัย 3 นาที',
  },
  {
    id: 'tt2',
    name: 'เทาทอง 2',
    gender: 'Female',
    roomTypes: ['studio', 'onebed'],
    price: 4500,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
    description: 'ดีไซน์มินิมอล ระบบคีย์การ์ดลิฟต์ล็อกชั้น ใกล้โซนร้านค้าและคาเฟ่',
    tags: ['Studio & 1-Bed', 'ระเบียงส่วนตัว'],
    optionLabel: 'Studio / 1-Bed',
    mapHighlight: 'ใกล้โซนร้านอาหาร',
    mapArea: 'ฝั่งตะวันออก / ใกล้ Community Mall',
    mapNote: 'ใกล้ร้านสะดวกซื้อ',
  },
  {
    id: 'tt3',
    name: 'เทาทอง 3',
    gender: 'Female',
    roomTypes: ['onebed', 'loft'],
    price: 4800,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80',
    description: 'ห้องพักวิวสวน ร่มรื่น เงียบสงบ พร้อมพื้นที่อ่านหนังสือส่วนกลาง',
    tags: ['1-Bedroom Deluxe', 'เฟอร์นิเจอร์ครบ'],
    optionLabel: '1-Bed Deluxe',
    mapHighlight: 'โซนสวนเงียบสงบ',
    mapArea: 'ฝั่งทิศใต้ / โซนสวนธรรมชาติ',
    mapNote: 'บรรยากาศสงบร่มรื่น',
  },
  {
    id: 'tt4',
    name: 'เทาทอง 4',
    gender: 'Female',
    roomTypes: ['loft'],
    price: 5200,
    image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=600&q=80',
    description: 'อาคารใหม่ล่าสุด ตกแต่งสไตล์ Loft-Japandi พร้อมฟิตเนสในตัว',
    tags: ['Loft & Premium Studio', 'Smart TV & ตู้เย็น'],
    optionLabel: 'Loft Suite',
    mapHighlight: 'ตึกใหม่พร้อมฟิตเนส',
    mapArea: 'ฝั่งทิศตะวันตก / อาคารใหม่ล่าสุด',
    mapNote: 'มีฟิตเนสในอาคาร',
  },
]

export const ROOM_FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'studio', label: 'Studio Room' },
  { id: 'onebed', label: '1-Bedroom' },
  { id: 'loft', label: 'Loft Suite' },
]

export const GENDER_LABEL = { Male: 'หอชาย', Female: 'หอหญิง' }
