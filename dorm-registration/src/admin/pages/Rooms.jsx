import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from '../api'
import { Badge, ErrorBox, Modal, PageHeader, Table } from '../ui'

const STATUS = {
  AVAILABLE: { label: 'เปิดให้จอง', tone: 'green' },
  MAINTENANCE: { label: 'ปิดซ่อม', tone: 'yellow' },
  CLOSED: { label: 'ปิดใช้งาน', tone: 'red' },
}

export default function Rooms() {
  const [dorms, setDorms] = useState([])
  const [rooms, setRooms] = useState([])
  const [dormId, setDormId] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ dormId: 'tt1', floor: 1, code: '', capacity: 4 })

  const load = useCallback(async () => {
    try {
      const r = await api.get('/api/admin/rooms', { params: dormId ? { dormId } : {} })
      setRooms(r.data)
    } catch (e) { setError(errMsg(e)) }
  }, [dormId])

  useEffect(() => { api.get('/api/admin/dorms').then((r) => setDorms(r.data)) }, [])
  useEffect(() => { load() }, [load])

  const run = async (fn) => {
    setError('')
    try { await fn(); await load() } catch (e) { setError(errMsg(e)) }
  }

  const dormName = (id) => dorms.find((d) => d.id === id)?.name || id

  return (
    <div className="max-w-5xl">
      <PageHeader title="จัดการห้องพัก" subtitle={`${rooms.length} ห้อง`}>
        <button className="btn-ghost text-sm" onClick={() => run(async () => {
          const r = await api.post('/api/admin/rooms/seed'); alert(r.data.message)
        })}>สร้างห้องตามผังเดิม</button>
        <button className="btn-primary text-sm" onClick={() => setAdding(true)}>+ เพิ่มห้อง</button>
      </PageHeader>
      <ErrorBox message={error} />

      <select className="field w-auto mb-4" value={dormId} onChange={(e) => setDormId(e.target.value)} aria-label="กรองอาคาร">
        <option value="">ทุกอาคาร</option>
        {dorms.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <Table head={['รหัสห้อง', 'อาคาร', 'ชั้น', 'ผู้พัก', 'สถานะ', '']} empty="ยังไม่มีห้อง">
        {rooms.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-mono">{r.code}</td>
            <td className="px-4 py-3">{dormName(r.dormId)}</td>
            <td className="px-4 py-3">{r.floor}</td>
            <td className="px-4 py-3">
              <Badge tone={r.occupied >= r.capacity ? 'red' : r.occupied >= 2 ? 'yellow' : 'green'}>
                {r.occupied}/{r.capacity}
              </Badge>
            </td>
            <td className="px-4 py-3">
              <select className="field py-1 text-xs w-auto" value={r.status} aria-label={`สถานะห้อง ${r.code}`}
                onChange={(e) => run(() => api.patch(`/api/admin/rooms/${r.id}`, { status: e.target.value }))}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </td>
            <td className="px-4 py-3 text-right">
              <button className="text-room-full text-xs hover:underline"
                onClick={() => confirm(`ลบห้อง ${r.code}? การจองของห้องนี้จะถูกลบด้วย`) && run(() => api.delete(`/api/admin/rooms/${r.id}`))}>
                ลบ
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {adding && (
        <Modal title="เพิ่มห้องพัก" onClose={() => setAdding(false)}>
          <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/api/admin/rooms', form); setAdding(false) }) }}>
            <label className="field-label">อาคาร</label>
            <select className="field mb-3" value={form.dormId} onChange={(e) => setForm({ ...form, dormId: e.target.value })}>
              {dorms.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div><label className="field-label">รหัสห้อง</label>
                <input className="field" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><label className="field-label">ชั้น</label>
                <input type="number" min="1" className="field" required value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
              <div><label className="field-label">ความจุ</label>
                <input type="number" min="1" className="field" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>ยกเลิก</button>
              <button className="btn-primary">บันทึก</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
