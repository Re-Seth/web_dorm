import { useEffect, useState } from 'react'
import api, { errMsg } from '../api'
import { ErrorBox, PageHeader, Table, fmtDate } from '../ui'

export default function Reviews() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/admin/reviews').then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)))
  }, [])

  const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(2) : '—'

  return (
    <div className="max-w-4xl">
      <PageHeader title="รีวิวจากนิสิต" subtitle={`${rows.length} รีวิว · คะแนนเฉลี่ย ${avg} / 5`} />
      <ErrorBox message={error} />
      <Table head={['นิสิต', 'คะแนน', 'ความคิดเห็น', 'เมื่อ']} empty="ยังไม่มีรีวิว">
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-mono">{r.username}</td>
            <td className="px-4 py-3 text-gold whitespace-nowrap">{'★'.repeat(r.rating)}<span className="text-bone/20">{'★'.repeat(5 - r.rating)}</span></td>
            <td className="px-4 py-3 text-bone/70 max-w-md">{r.comment || '—'}</td>
            <td className="px-4 py-3 text-xs text-bone/50 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
