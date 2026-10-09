import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from '../api'
import { Badge, ErrorBox, PageHeader, Table, fmtDate } from '../ui'

const ST = {
  PENDING: { label: 'รอดำเนินการ', tone: 'yellow' },
  IN_PROGRESS: { label: 'กำลังซ่อมแซม', tone: 'blue' },
  COMPLETED: { label: 'ซ่อมเสร็จสิ้น', tone: 'green' },
}

export default function Maintenance() {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try { setRows((await api.get('/api/admin/maintenance')).data) } catch (e) { setError(errMsg(e)) }
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (fn) => {
    setError('')
    try { await fn(); await load() } catch (e) { setError(errMsg(e)) }
  }

  const shown = filter ? rows.filter((r) => r.status === filter) : rows

  return (
    <div className="max-w-5xl">
      <PageHeader title="รายการแจ้งซ่อม" subtitle={`${shown.length} รายการ`} />
      <ErrorBox message={error} />
      <select className="field w-auto mb-4" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="กรองสถานะ">
        <option value="">ทุกสถานะ</option>
        {Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>

      <Table head={['ห้อง', 'เรื่อง', 'รายละเอียด', 'แจ้งเมื่อ', 'สถานะ', '']} empty="ไม่มีรายการแจ้งซ่อม">
        {shown.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-3 font-mono">{m.roomId}</td>
            <td className="px-4 py-3 font-medium">{m.title}</td>
            <td className="px-4 py-3 text-bone/60 max-w-xs">{m.description}</td>
            <td className="px-4 py-3 text-xs text-bone/50 whitespace-nowrap">{fmtDate(m.createdAt)}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge tone={ST[m.status]?.tone}>{ST[m.status]?.label || m.status}</Badge>
                <select className="field py-1 text-xs w-auto" value={m.status} aria-label={`อัปเดตสถานะ ${m.title}`}
                  onChange={(e) => run(() => api.patch(`/api/admin/maintenance/${m.id}`, { status: e.target.value }))}>
                  {Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </td>
            <td className="px-4 py-3 text-right">
              <button className="text-room-full text-xs hover:underline"
                onClick={() => confirm('ลบรายการนี้?') && run(() => api.delete(`/api/admin/maintenance/${m.id}`))}>ลบ</button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
