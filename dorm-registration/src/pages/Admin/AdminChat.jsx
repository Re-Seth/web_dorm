import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, CheckCircle2, MessageSquare, RotateCcw, Send } from 'lucide-react'
import { adminChatApi } from '../../services/api'
import { errMsg } from '../../studentApi'
import socket from '../../services/socket'

const QUICK_REPLIES = [
  'รับเรื่องแล้ว กำลังตรวจสอบให้นะครับ/คะ',
  'รบกวนแจ้งรายละเอียดเพิ่มเติมอีกนิดได้ไหมครับ/คะ',
  'ดำเนินการเรียบร้อยแล้ว หากมีคำถามเพิ่มเติมพิมพ์มาได้เลยครับ/ค่ะ',
]
const PAYMENT_LABEL = { PAID: 'ชำระแล้ว', UNPAID: 'ยังไม่ชำระ' }

const when = (iso) => {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return d.toLocaleString('th-TH', today ? { hour: '2-digit', minute: '2-digit' } : { dateStyle: 'short', timeStyle: 'short' })
}
const nameOf = (t) => t.user?.name || t.user?.username || 'นิสิต'

// แท็บ "แชทนิสิต" ในหน้าผู้จัดการหอพัก — รายการห้องแชทด้านซ้าย / บทสนทนาด้านขวา
export default function AdminChat({ threads, refresh }) {
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [filter, setFilter] = useState('OPEN')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const selectedRef = useRef(null)
  selectedRef.current = selectedId

  async function open(id) {
    setSelectedId(id)
    setError('')
    setReply('')
    try {
      const { data } = await adminChatApi.get(id)
      if (selectedRef.current !== id) return
      setDetail(data)
      await adminChatApi.markRead(id)
    } catch (err) {
      setError(errMsg(err))
    }
  }

  // ข้อความใหม่ในห้องที่เปิดอยู่ → แสดงต่อท้าย และถือว่าอ่านแล้ว
  useEffect(() => {
    const onMessage = ({ threadId, message, status }) => {
      if (threadId !== selectedRef.current) return
      setDetail((d) => d && {
        ...d,
        thread: { ...d.thread, status },
        messages: d.messages.some((m) => m.id === message.id) ? d.messages : [...d.messages, message],
      })
      if (message.sender === 'USER') adminChatApi.markRead(threadId).catch(() => {})
    }
    const onUpdated = ({ threadId, status }) => {
      if (threadId === selectedRef.current && status) setDetail((d) => d && { ...d, thread: { ...d.thread, status } })
    }
    socket.on('chat_message', onMessage)
    socket.on('chat_updated', onUpdated)
    return () => {
      socket.off('chat_message', onMessage)
      socket.off('chat_updated', onUpdated)
    }
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [detail?.messages?.length, selectedId])

  async function send(e) {
    e?.preventDefault()
    const body = reply.trim()
    if (!body || sending || !selectedId) return
    setSending(true)
    setError('')
    try {
      const { data } = await adminChatApi.send(selectedId, body)
      setReply('')
      setDetail((d) => d && { ...d, messages: d.messages.some((m) => m.id === data.id) ? d.messages : [...d.messages, data] })
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSending(false)
    }
  }

  async function toggleStatus() {
    const status = detail.thread.status === 'CLOSED' ? 'OPEN' : 'CLOSED'
    try {
      await adminChatApi.setStatus(selectedId, status)
      setDetail((d) => ({ ...d, thread: { ...d.thread, status } }))
      refresh()
    } catch (err) {
      setError(errMsg(err))
    }
  }

  const shown = threads.filter((t) => filter === 'ALL' || t.status === filter || t.unread > 0)
  const student = detail?.student

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden grid md:grid-cols-[300px_1fr] h-[70vh] min-h-[480px]">
      {/* รายการห้องแชท */}
      <aside className={`border-r border-slate-800 flex-col min-h-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 border-b border-slate-800 flex gap-1">
          {[['OPEN', 'กำลังดำเนินการ'], ['CLOSED', 'ปิดแล้ว'], ['ALL', 'ทั้งหมด']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex-1 text-xs py-1.5 rounded-lg ${filter === id ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70">
          {shown.length === 0 && <p className="text-center text-sm text-slate-500 py-10">ไม่มีแชทในหมวดนี้</p>}
          {shown.map((t) => (
            <button
              key={t.id}
              onClick={() => open(t.id)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-800/50 transition ${selectedId === t.id ? 'bg-slate-800/70' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-sm ${t.unread ? 'font-bold text-white' : 'text-slate-200'}`}>{nameOf(t)}</span>
                <span className="text-[11px] text-slate-500 shrink-0">{when(t.lastMessageAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="truncate text-xs text-slate-400">
                  {t.lastMessage?.sender === 'ADMIN' && 'คุณ: '}
                  {t.lastMessage?.sender === 'SYSTEM' ? '📋 ส่งเรื่องจากแชทบอท' : t.lastMessage?.body}
                </span>
                {t.unread > 0 ? (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">{t.unread}</span>
                ) : t.status === 'CLOSED' ? (
                  <span className="shrink-0 text-[10px] text-emerald-400">ปิดแล้ว</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* บทสนทนา */}
      <section className={`flex-col min-h-0 ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {!detail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
            <MessageSquare className="w-10 h-10" />
            <p className="text-sm">{selectedId ? 'กำลังโหลด...' : 'เลือกแชทจากรายการด้านซ้าย'}</p>
          </div>
        ) : (
          <>
            <header className="p-4 border-b border-slate-800 flex items-start gap-3">
              <button onClick={() => { setSelectedId(null); setDetail(null) }} className="md:hidden p-1 -ml-1 text-slate-400" aria-label="กลับไปรายการแชท">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{student?.name || 'บัญชีถูกลบ'}</p>
                {student && (
                  <p className="text-xs text-slate-400 mt-0.5 space-x-2">
                    <span>@{student.username}</span>
                    <span>· ห้อง {student.room ? `${student.room} (${PAYMENT_LABEL[student.paymentStatus] || '-'})` : 'ยังไม่จอง'}</span>
                    {student.mobile && <span>· โทร {student.mobile}</span>}
                    {student.lineId && <span>· LINE {student.lineId}</span>}
                  </p>
                )}
              </div>
              <button
                onClick={toggleStatus}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border ${
                  detail.thread.status === 'CLOSED'
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
                }`}
              >
                {detail.thread.status === 'CLOSED' ? <><RotateCcw className="w-3.5 h-3.5" /> เปิดเรื่องอีกครั้ง</> : <><CheckCircle2 className="w-3.5 h-3.5" /> ปิดเรื่อง</>}
              </button>
            </header>

            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {detail.messages.map((m) => m.sender === 'SYSTEM' ? (
                <div key={m.id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 whitespace-pre-line">
                  {m.body}
                  <p className="text-[11px] text-amber-300/70 mt-1">{when(m.createdAt)}</p>
                </div>
              ) : (
                <div key={m.id} className={`flex ${m.sender === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[75%]">
                    <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line break-words ${
                      m.sender === 'ADMIN' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                    }`}>
                      {m.body}
                    </div>
                    <p className={`text-[11px] text-slate-500 mt-0.5 ${m.sender === 'ADMIN' ? 'text-right' : ''}`}>
                      {m.sender === 'ADMIN' ? `${m.authorName} · ` : ''}{when(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={send} className="p-3 border-t border-slate-800 space-y-2">
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <div className="flex gap-1.5 overflow-x-auto">
                {QUICK_REPLIES.map((q) => (
                  <button type="button" key={q} onClick={() => setReply(q)} className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">
                    {q.length > 28 ? `${q.slice(0, 28)}…` : q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e) }}
                  rows={2}
                  maxLength={1000}
                  placeholder="พิมพ์ตอบนิสิต (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
                  className="flex-1 resize-none rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <button disabled={sending || !reply.trim()} className="h-10 px-4 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm flex items-center gap-1.5 disabled:opacity-50">
                  <Send className="w-4 h-4" /> ส่ง
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
