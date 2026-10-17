import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Camera, LoaderCircle, Trash2, UserRound } from 'lucide-react'
import { BUILDINGS, GENDER_LABEL } from '../../data/landing'
import api, { errMsg } from '../../studentApi'

const PHOTO_SIZE = 320

// ย่อ/ครอปรูปเป็นสี่เหลี่ยมจัตุรัส JPEG ก่อนส่งขึ้น server
function toSquareJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = PHOTO_SIZE
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านไฟล์รูปไม่ได้')) }
    img.src = url
  })
}

export const passNumber = (profile) => `TT${profile.dormId.slice(-1)}-${String(profile.id).padStart(5, '0')}`

// บัตรประจำตัวผู้เช่าดิจิทัล
export default function TenantPass({ profile, roomCode, term, onChange }) {
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const building = BUILDINGS.find((b) => b.id === profile.dormId)
  const passNo = passNumber(profile)
  const male = profile.gender === 'Male'

  useEffect(() => {
    // QR เก็บเฉพาะเลขบัตร (ไม่มีข้อมูลส่วนบุคคล) ให้เจ้าหน้าที่สแกนค้นหาในระบบ
    QRCode.toDataURL(`TAOTHONG-PASS:${passNo}`, { width: 240, margin: 1, color: { dark: '#3D332A', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [passNo])

  async function upload(photo) {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.patch('/api/profile/photo', { photo })
      onChange(data)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('กรุณาเลือกไฟล์รูปภาพ')
    try {
      upload(await toSquareJpeg(file))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section aria-label="บัตรประจำตัวผู้เช่าดิจิทัล" className="relative overflow-hidden rounded-3xl bg-white border border-japandi-sand shadow-xl">
      {/* แถบหัวบัตร */}
      <div className="relative bg-gradient-to-br from-japandi-terracotta to-japandi-terracotta-dark text-white px-6 pt-5 pb-14">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white text-japandi-terracotta flex items-center justify-center font-bold text-xs">TT</div>
            <div>
              <p className="text-sm font-semibold leading-tight">Tao Thong Residence</p>
              <p className="text-[10px] uppercase tracking-widest text-white/80">Digital Tenant Pass</p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-white/15 px-2 py-1 rounded-full">{passNo}</span>
        </div>
      </div>

      <div className="px-6 pb-6 -mt-10 relative">
        <div className="flex items-end gap-4">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-md bg-japandi-sand overflow-hidden flex items-center justify-center">
              {profile.photo ? (
                <img src={profile.photo} alt="รูปโปรไฟล์ผู้เช่า" className="w-full h-full object-cover" />
              ) : (
                <UserRound size={40} className="text-japandi-muted" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="เปลี่ยนรูปโปรไฟล์"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-japandi-oak text-white flex items-center justify-center shadow hover:bg-black transition"
            >
              {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} tabIndex={-1} />
          </div>
          <div className="min-w-0 pb-1">
            <p className="font-display text-lg font-bold leading-tight break-words">{profile.prefix}{profile.firstName} {profile.lastName}</p>
            <p className="text-xs text-japandi-muted break-words">{profile.nameEn}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 text-xs">
          <div className="rounded-xl bg-japandi-bg p-3">
            <p className="text-japandi-muted">อาคารที่ได้รับการจัดสรร</p>
            <p className="font-bold text-sm mt-0.5">{building?.name}</p>
            <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${male ? 'bg-blue-600' : 'bg-pink-600'}`}>
              {GENDER_LABEL[profile.gender]}{male ? ' (สำหรับผู้ชาย)' : ' (สำหรับผู้หญิง)'}
            </span>
          </div>
          <div className="rounded-xl bg-japandi-bg p-3">
            <p className="text-japandi-muted">ห้องพัก</p>
            <p className="font-bold text-sm mt-0.5">{roomCode || 'ยังไม่ได้เลือก'}</p>
            {term && <p className="text-[10px] text-japandi-muted mt-1">{term}</p>}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-dashed border-japandi-sand p-3">
          {qr ? <img src={qr} alt={`QR Code บัตรผู้เช่า ${passNo}`} className="w-24 h-24 rounded-lg" /> : <div className="w-24 h-24 rounded-lg bg-japandi-bg" />}
          <p className="text-[11px] text-japandi-muted leading-relaxed">
            แสดง QR Code นี้เพื่อสแกนเข้า-ออกอาคาร หรือติดต่อเจ้าหน้าที่หอพัก
          </p>
        </div>

        {profile.photo && (
          <button type="button" onClick={() => upload(null)} disabled={busy} className="mt-3 text-[11px] text-japandi-muted hover:text-red-600 transition flex items-center gap-1">
            <Trash2 size={12} /> ลบรูปโปรไฟล์
          </button>
        )}
        {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </section>
  )
}
