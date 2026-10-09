import { useCallback, useEffect, useState } from 'react'
import api, { errMsg } from '../api'
import { useAdminAuth } from '../AdminAuth'
import { Badge, ErrorBox, Modal, PageHeader, Table, fmtDate } from '../ui'

const empty = { username: '', email: '', name: '', password: '', role: 'USER' }

export default function Users() {
  const { user: me } = useAdminAuth()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(empty)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    try { setRows((await api.get('/api/admin/users')).data) } catch (e) { setError(errMsg(e)) }
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (fn) => {
    setError('')
    try { await fn(); await load() } catch (e) { setError(errMsg(e)) }
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const shown = rows.filter((u) =>
    [u.username, u.email, u.name].some((v) => (v || '').toLowerCase().includes(q.toLowerCase())))

  return (
    <div className="max-w-5xl">
      <PageHeader title="ผู้ใช้งาน" subtitle={`${rows.length} บัญชี`}>
        <button className="btn-primary text-sm" onClick={() => { setForm(empty); setAdding(true) }}>+ เพิ่มผู้ใช้</button>
      </PageHeader>
      <ErrorBox message={error} />
      <input className="field max-w-xs mb-4" placeholder="ค้นหา username / อีเมล / ชื่อ" value={q} onChange={(e) => setQ(e.target.value)} />

      <Table head={['Username', 'ชื่อ', 'อีเมล', 'สิทธิ์', 'สมัครเมื่อ', '']} empty="ไม่พบผู้ใช้">
        {shown.map((u) => (
          <tr key={u.id}>
            <td className="px-4 py-3 font-mono">{u.username}</td>
            <td className="px-4 py-3">{u.name || '—'}</td>
            <td className="px-4 py-3 text-bone/60">{u.email}</td>
            <td className="px-4 py-3">
              {u.id === me?.id ? <Badge tone="yellow">ADMIN (คุณ)</Badge> : (
                <select className="field py-1 text-xs w-auto" value={u.role} aria-label={`สิทธิ์ของ ${u.username}`}
                  onChange={(e) => run(() => api.patch(`/api/admin/users/${u.id}`, { role: e.target.value }))}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-bone/50 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
            <td className="px-4 py-3 text-right">
              {u.id !== me?.id && (
                <button className="text-room-full text-xs hover:underline"
                  onClick={() => confirm(`ลบผู้ใช้ ${u.username}?`) && run(() => api.delete(`/api/admin/users/${u.id}`))}>ลบ</button>
              )}
            </td>
          </tr>
        ))}
      </Table>

      {adding && (
        <Modal title="เพิ่มผู้ใช้" onClose={() => setAdding(false)}>
          <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/api/admin/users', form); setAdding(false) }) }}>
            <label className="field-label">Username</label>
            <input className="field mb-3" required value={form.username} onChange={set('username')} />
            <label className="field-label">อีเมล</label>
            <input type="email" className="field mb-3" required value={form.email} onChange={set('email')} />
            <label className="field-label">ชื่อ</label>
            <input className="field mb-3" value={form.name} onChange={set('name')} />
            <label className="field-label">รหัสผ่านเริ่มต้น</label>
            <input type="password" className="field mb-3" required minLength={6} value={form.password} onChange={set('password')} />
            <label className="field-label">สิทธิ์</label>
            <select className="field mb-5" value={form.role} onChange={set('role')}>
              <option value="USER">USER</option><option value="ADMIN">ADMIN</option>
            </select>
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
