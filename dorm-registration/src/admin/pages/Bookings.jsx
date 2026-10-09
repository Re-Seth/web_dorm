import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from '../api'
import { Badge, ErrorBox, Modal, PageHeader, Table, baht, fmtDate } from '../ui'

const BOOKING = {
  PENDING: { label: 'รอยืนยัน', tone: 'yellow' },
  CONFIRMED: { label: 'ยืนยันแล้ว', tone: 'green' },
  CANCELLED: { label: 'ยกเลิก', tone: 'gray' },
}
const empty = { roomId: '', studentName: '', studentCode: '', phone: '', parentName: '', parentPhone: '' }

export default function Bookings() {
  const [rows, setRows] = useState([])
  const [rooms, setRooms] = useState([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(empty)

  const load = useCallback(async () => {
    try {
      const r = await api.get('/api/admin/bookings', { params: filter ? { status: filter } : {} })
      setRows(r.data)
    } catch (e) { setError(errMsg(e)) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const run = async (fn) => {
    setError('')
    try { await fn(); await load() } catch (e) { setError(errMsg(e)) }
  }
  const patch = (id, body) => run(() => api.patch(`/api/admin/bookings/${id}`, body))

  async function openAdd() {
    setError('')
    try {
      const r = await api.get('/api/admin/rooms')
      setRooms(r.data.filter((x) => x.status === 'AVAILABLE' && x.occupied < x.capacity))
      setForm(empty); setAdding(true)
    } catch (e) { setError(errMsg(e)) }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="max-w-6xl">
      <PageHeader title="การจอง & การชำระเงิน" subtitle={`${rows.length} รายการ`}>
        <button className="btn-primary text-sm" onClick={openAdd}>+ เพิ่มการจอง</button>
      </PageHeader>
      <ErrorBox message={error} />

      <select className="field w-auto mb-4" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="กรองสถานะ">
        <option value="">ทุกสถานะ</option>
        {Object.entries(BOOKING).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>

      <Table head={['นิสิต', 'ห้อง', 'ติดต่อ', 'สถานะ', 'การชำระเงิน', 'วันที่จอง', '']} empty="ยังไม่มีการจอง">
        {rows.map((b) => (
          <tr key={b.id}>
            <td className="px-4 py-3">
              <p className="font-medium">{b.studentName}</p>
              <p className="text-xs text-bone/40 font-mono">{b.studentCode || '—'}</p>
            </td>
            <td className="px-4 py-3 font-mono">{b.room?.code}</td>
            <td className="px-4 py-3 text-xs text-bone/60">
              <p>{b.phone || '—'}</p>
              <p>ผู้ปกครอง: {b.parentName || '—'} {b.parentPhone}</p>
            </td>
            <td className="px-4 py-3">
              <select className="field py-1 text-xs w-auto" value={b.status} aria-label={`สถานะการจอง ${b.studentName}`}
                onChange={(e) => patch(b.id, { status: e.target.value })}>
                {Object.entries(BOOKING).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </td>
            <td className="px-4 py-3">
              {b.paymentStatus === 'PAID' ? (
                <div>
                  <Badge tone="green">ชำระแล้ว {baht(b.paymentAmount)}</Badge>
                  <p className="text-xs text-bone/40 mt-1">{b.receiptNo} · {fmtDate(b.paidAt)}</p>
                  <button className="text-xs text-room-full hover:underline mt-1"
                    onClick={() => confirm('ยกเลิกสถานะชำระเงิน?') && patch(b.id, { paymentStatus: 'UNPAID' })}>
                    ยกเลิกการชำระ
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge tone="yellow">ค้างชำระ {baht(b.paymentAmount)}</Badge>
                  <button className="text-xs text-gold hover:underline"
                    onClick={() => patch(b.id, { paymentStatus: 'PAID', paymentMethod: 'CASH' })}>
                    รับเงิน
                  </button>
                </div>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-bone/50 whitespace-nowrap">{fmtDate(b.createdAt)}</td>
            <td className="px-4 py-3 text-right">
              <button className="text-room-full text-xs hover:underline"
                onClick={() => confirm('ลบการจองนี้?') && run(() => api.delete(`/api/admin/bookings/${b.id}`))}>ลบ</button>
            </td>
          </tr>
        ))}
      </Table>

      {adding && (
        <Modal title="เพิ่มการจอง" onClose={() => setAdding(false)}>
          <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/api/admin/bookings', form); setAdding(false) }) }}>
            <label className="field-label">ห้อง (เฉพาะห้องที่ยังว่าง)</label>
            <select className="field mb-3" required value={form.roomId} onChange={set('roomId')}>
              <option value="">เลือกห้อง…</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.code} ({r.occupied}/{r.capacity})</option>)}
            </select>
            <label className="field-label">ชื่อนิสิต</label>
            <input className="field mb-3" required value={form.studentName} onChange={set('studentName')} />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label className="field-label">รหัสนิสิต</label><input className="field" value={form.studentCode} onChange={set('studentCode')} /></div>
              <div><label className="field-label">เบอร์โทร</label><input className="field" value={form.phone} onChange={set('phone')} /></div>
              <div><label className="field-label">ผู้ปกครอง</label><input className="field" value={form.parentName} onChange={set('parentName')} /></div>
              <div><label className="field-label">เบอร์ผู้ปกครอง</label><input className="field" value={form.parentPhone} onChange={set('parentPhone')} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>ยกเลิก</button>
              <button className="btn-primary">บันทึก</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
