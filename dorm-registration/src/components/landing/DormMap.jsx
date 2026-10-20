import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { GENDER_LABEL, MAP_IS_SAMPLE } from '../../data/landing'

const PIN_COLOR = { Male: '#2563eb', Female: '#db2777' }

// หมุดแบบ HTML (ไม่ใช้รูปหมุดเริ่มต้นของ Leaflet ที่ต้องตั้ง path รูปเพิ่มเมื่อ build ด้วย Vite)
const pinIcon = (b, active) =>
  L.divIcon({
    className: '',
    html: `<div class="dorm-pin${active ? ' is-active' : ''}" style="--pin:${PIN_COLOR[b.gender]}">
      <svg viewBox="0 0 24 32" width="28" height="36" aria-hidden="true">
        <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0z" fill="var(--pin)" stroke="#fff" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="4.5" fill="#fff"/>
      </svg>
      <span class="dorm-pin-label">${b.name}</span>
    </div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34],
  })

const popupHtml = (b) => `
  <div class="dorm-popup">
    <strong style="color:${PIN_COLOR[b.gender]}">${b.name} (${GENDER_LABEL[b.gender]})</strong>
    <p>${b.mapArea}</p>
    <p>📍 ${b.mapNote}</p>
  </div>`

// แผนที่ OpenStreetMap พร้อมหมุดของแต่ละตึก — กดหมุดหรือกดรายการด้านข้างเพื่อเลือกตึก
export default function DormMap({ buildings, activeId, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const map = L.map(containerRef.current, { scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    markersRef.current = Object.fromEntries(
      buildings.map((b) => [
        b.id,
        L.marker(b.coords, { icon: pinIcon(b, false), title: b.name, riseOnHover: true })
          .addTo(map)
          .bindPopup(popupHtml(b))
          .on('click', () => onSelectRef.current?.(b.id)),
      ]),
    )
    map.fitBounds(L.latLngBounds(buildings.map((b) => b.coords)), { padding: [60, 60] })
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [buildings])

  // เลือกตึก: ไฮไลต์หมุด เลื่อนแผนที่ไปหา และเปิดรายละเอียด
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    buildings.forEach((b) => markersRef.current[b.id]?.setIcon(pinIcon(b, b.id === activeId)))
    const marker = markersRef.current[activeId]
    if (marker) {
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 17), { duration: 0.6 })
      marker.openPopup()
    }
  }, [activeId, buildings])

  return (
    <div className="relative isolate w-full h-96 sm:h-[28rem] rounded-3xl overflow-hidden border border-japandi-sand shadow-inner bg-[#E5E3DF]">
      <div ref={containerRef} className="absolute inset-0" role="region" aria-label="แผนที่ตำแหน่งตึกหอพัก" />
      {MAP_IS_SAMPLE && (
        <span className="absolute top-3 right-3 z-[1000] px-2.5 py-1 rounded-full bg-white/90 border border-japandi-sand text-[11px] font-medium text-japandi-muted shadow-sm pointer-events-none">
          พิกัดตัวอย่าง
        </span>
      )}
    </div>
  )
}
