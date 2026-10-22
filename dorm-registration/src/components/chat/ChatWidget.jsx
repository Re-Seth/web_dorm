import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Headset, MessageCircle, Send, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api, { errMsg } from '../../studentApi'
import { chatApi } from '../../services/api'
import socket from '../../services/socket'
import { CHATBOT_IS_SAMPLE, FAQS, matchFaq } from '../../data/chatbot'

const GREETING = {
  id: 'greet',
  from: 'bot',
  text: 'สวัสดีครับ 👋 ผู้ช่วยหอพักเทาทองยินดีให้บริการ\nเลือกหัวข้อด้านล่าง หรือพิมพ์คำถามได้เลย',
}

const timeOf = (iso) => new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

let nextId = 1
const botId = () => `b${nextId++}`

// เวลาที่บอท "กำลังพิมพ์" ก่อนตอบ — ข้อความยาวพิมพ์นานขึ้นนิดหน่อย (0.7–1.6 วินาที)
const typingDelay = (text = '') => Math.min(1600, 700 + text.length * 4)

function TypingBubble() {
  return (
    <div className="flex justify-start animate-rise-in" aria-label="ผู้ช่วยกำลังพิมพ์">
      <div className="bg-white border border-japandi-sand rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="w-2 h-2 rounded-full bg-japandi-muted animate-typing-dot" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  )
}

// ปุ่มแชทลอยมุมขวาล่าง: แชทบอทตอบคำถามที่พบบ่อย (ทุกคนใช้ได้) + คุยกับเจ้าหน้าที่ (ต้องเข้าสู่ระบบ)
// ผู้จัดการหอพักตอบแชทที่แท็บ "แชทนิสิต" ในหน้า Admin จึงไม่แสดงปุ่มนี้
export default function ChatWidget() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const loggedIn = isAuthenticated && !!user
  const hidden = user?.role === 'ADMIN'

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('bot')
  const [period, setPeriod] = useState(null)

  // แชทบอท
  const [botMessages, setBotMessages] = useState([GREETING])
  const [topics, setTopics] = useState([])
  const [lastUnmatched, setLastUnmatched] = useState('')
  const [handoffDraft, setHandoffDraft] = useState(null) // null = ไม่ได้เปิดฟอร์มส่งเรื่อง
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const typingTimer = useRef(null)
  useEffect(() => () => clearTimeout(typingTimer.current), [])

  // เจ้าหน้าที่
  const [thread, setThread] = useState(null)
  const [staffMessages, setStaffMessages] = useState([])
  const [unread, setUnread] = useState(0)
  const [staffInput, setStaffInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const listRef = useRef(null)
  const viewingStaff = useRef(false)
  viewingStaff.current = open && tab === 'staff'
  const threadRef = useRef(null)
  threadRef.current = thread

  // รอบลงทะเบียน/ค่าลงทะเบียนจริงจาก server (โหลดเมื่อเปิดแชทครั้งแรก)
  useEffect(() => {
    if (!open || period) return
    api.get('/api/registration-period').then(({ data }) => setPeriod(data)).catch(() => {})
  }, [open, period])

  // ห้องแชทกับเจ้าหน้าที่ของผู้ใช้ที่เข้าสู่ระบบ
  async function loadThread() {
    try {
      const { data } = await chatApi.getMine()
      setThread(data.thread)
      setStaffMessages(data.messages)
      setUnread(data.unread)
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    if (!loggedIn || hidden) {
      setThread(null)
      setStaffMessages([])
      setUnread(0)
      return
    }
    loadThread()
    const onMessage = ({ message, status }) => {
      // ห้องแชทเพิ่งถูกสร้าง (ส่งเรื่องจากอีกแท็บ) → โหลดใหม่ทั้งห้อง
      if (!threadRef.current) loadThread()
      else {
        setThread((t) => (t ? { ...t, status } : t))
        setStaffMessages((list) => (list.some((m) => m.id === message.id) ? list : [...list, message]))
      }
      if (message.sender === 'ADMIN') {
        if (viewingStaff.current) chatApi.markRead().catch(() => {})
        else setUnread((n) => n + 1)
      }
    }
    const onUpdated = ({ status }) => status && setThread((t) => (t ? { ...t, status } : t))
    socket.on('chat_message', onMessage)
    socket.on('chat_updated', onUpdated)
    return () => {
      socket.off('chat_message', onMessage)
      socket.off('chat_updated', onUpdated)
    }
  }, [loggedIn, hidden]) // eslint-disable-line react-hooks/exhaustive-deps

  // เปิดแท็บเจ้าหน้าที่ = อ่านแล้ว
  useEffect(() => {
    if (open && tab === 'staff' && loggedIn && unread > 0) {
      setUnread(0)
      chatApi.markRead().catch(() => {})
    }
  }, [open, tab, loggedIn, unread])

  // เลื่อนลงข้อความล่าสุด
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [botMessages, staffMessages, tab, open, handoffDraft, typing])

  if (hidden) return null

  const ctx = { period, fee: period?.fee, loggedIn }

  function answer(faq) {
    setTopics((t) => (t.includes(faq.title) ? t : [...t, faq.title]))
    const { text, actions = [] } = faq.answer(ctx)
    return { id: botId(), from: 'bot', text, actions, sample: CHATBOT_IS_SAMPLE && faq.sample }
  }

  // แสดงข้อความผู้ใช้ทันที แล้วบอททำท่ากำลังพิมพ์ก่อนตอบ
  function converse(userText, reply) {
    setBotMessages((m) => (userText ? [...m, { id: botId(), from: 'user', text: userText }] : m))
    setTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      setTyping(false)
      setBotMessages((m) => [...m, reply])
    }, typingDelay(reply.text))
  }

  function askTopic(faq) {
    if (typing) return
    setHandoffDraft(null)
    converse(faq.title, answer(faq))
  }

  function askText(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || typing) return
    setInput('')
    const faq = matchFaq(text)
    const reply = faq
      ? answer(faq)
      : {
          id: botId(),
          from: 'bot',
          text: 'ขออภัย ผู้ช่วยยังไม่มีคำตอบสำหรับคำถามนี้ 🙏\nเลือกหัวข้อด้านล่าง หรือส่งคำถามนี้ให้เจ้าหน้าที่ตอบได้เลย',
          actions: [{ label: 'ส่งคำถามนี้ให้เจ้าหน้าที่', handoff: text }],
        }
    if (!faq) setLastUnmatched(text)
    converse(text, reply)
  }

  function go(to) {
    const [path, hash] = to.split('#')
    navigate(path || '/')
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 300)
  }

  function startHandoff(prefill = '') {
    if (!loggedIn) {
      if (typing) return
      converse(null, {
        id: botId(),
        from: 'bot',
        text: 'กรุณาเข้าสู่ระบบก่อน เจ้าหน้าที่จะได้รู้ว่าเป็นใครและตอบกลับในแชทนี้ได้ 🔐',
        actions: [{ label: 'เข้าสู่ระบบ', to: '/login' }, { label: 'สมัครเข้าพัก', to: '/apply' }],
      })
      return
    }
    setTab('bot')
    setError('')
    setHandoffDraft(prefill || lastUnmatched)
  }

  function onAction(action) {
    if (action.to) go(action.to)
    else if ('handoff' in action) startHandoff(action.handoff)
  }

  async function submitHandoff(e) {
    e.preventDefault()
    const question = (handoffDraft || '').trim()
    if (!question || sending) return
    setSending(true)
    setError('')
    try {
      await chatApi.handoff(question, topics)
      await loadThread()
      setHandoffDraft(null)
      setLastUnmatched('')
      setBotMessages((m) => [...m, { id: botId(), from: 'bot', text: 'ส่งเรื่องให้เจ้าหน้าที่แล้ว ✅ คุยต่อได้ที่แท็บ "เจ้าหน้าที่"' }])
      setTab('staff')
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSending(false)
    }
  }

  async function sendStaff(e) {
    e.preventDefault()
    const body = staffInput.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      const { data } = await chatApi.send(body)
      setStaffInput('')
      setThread((t) => (t ? { ...t, status: 'OPEN' } : t))
      setStaffMessages((list) => (list.some((m) => m.id === data.id) ? list : [...list, data]))
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {open && (
        <div
          className="animate-rise-in fixed z-[60] bottom-20 right-4 w-[calc(100vw-2rem)] sm:w-[380px] h-[min(600px,calc(100dvh-7rem))] flex flex-col bg-japandi-bg text-japandi-oak font-body rounded-2xl shadow-2xl border border-japandi-sand overflow-hidden"
          role="dialog"
          aria-label="แชทช่วยเหลือ"
        >
          {/* หัวแชท + แท็บ */}
          <div className="bg-japandi-oak text-white px-4 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">ผู้ช่วยหอพักเทาทอง</p>
                <p className="text-[11px] text-japandi-wood">ตอบคำถามทันที · ส่งต่อเจ้าหน้าที่ได้</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="ปิดแชท">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-1 mt-3">
              {[
                { id: 'bot', label: 'ถามผู้ช่วย', Icon: Bot },
                { id: 'staff', label: 'เจ้าหน้าที่', Icon: Headset, badge: unread },
              ].map(({ id, label, Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-t-lg transition ${
                    tab === id ? 'bg-japandi-bg text-japandi-oak font-semibold' : 'text-japandi-wood hover:text-white'
                  }`}
                >
                  <Icon size={15} /> {label}
                  {badge > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-japandi-terracotta text-white text-[11px] font-bold leading-[18px]">{badge}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* ข้อความ */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {tab === 'bot' && botMessages.map((m) => (
              <div key={m.id} className={`flex animate-rise-in ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line ${
                  m.from === 'user' ? 'bg-japandi-terracotta text-white rounded-br-sm' : 'bg-white border border-japandi-sand rounded-bl-sm'
                }`}>
                  {m.text}
                  {m.sample && <p className="mt-2 text-[11px] text-japandi-muted">* ข้อมูลตัวอย่าง อาจไม่ตรงกับปัจจุบัน</p>}
                  {m.actions?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {m.actions.map((a) => (
                        <button key={a.label} onClick={() => onAction(a)} className="text-xs px-3 py-1.5 rounded-full bg-japandi-sand text-japandi-oak hover:bg-japandi-wood/50 font-medium">
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {tab === 'bot' && typing && <TypingBubble />}

            {tab === 'staff' && !loggedIn && (
              <div className="text-center text-sm text-japandi-muted py-8 space-y-3">
                <p>เข้าสู่ระบบเพื่อคุยกับเจ้าหน้าที่</p>
                <button onClick={() => go('/login')} className="px-4 py-2 rounded-full bg-japandi-terracotta text-white text-sm">เข้าสู่ระบบ</button>
              </div>
            )}
            {tab === 'staff' && loggedIn && !thread && (
              <div className="text-center text-sm text-japandi-muted py-8 space-y-3">
                <p>ยังไม่ได้ติดต่อเจ้าหน้าที่<br />ส่งเรื่องแล้วระบบจะสรุปให้เจ้าหน้าที่ทราบทันที</p>
                <button onClick={() => startHandoff()} className="px-4 py-2 rounded-full bg-japandi-terracotta text-white text-sm">เริ่มส่งเรื่อง</button>
              </div>
            )}
            {tab === 'staff' && loggedIn && thread && staffMessages.map((m) => (
              m.sender === 'SYSTEM' ? (
                <div key={m.id} className="animate-rise-in mx-2 rounded-xl border border-dashed border-japandi-wood bg-japandi-sand/50 px-3 py-2 text-xs whitespace-pre-line text-japandi-oak">
                  {m.body}
                  <p className="mt-1 text-[10px] text-japandi-muted">ส่งให้เจ้าหน้าที่เมื่อ {timeOf(m.createdAt)}</p>
                </div>
              ) : (
                <div key={m.id} className={`flex animate-rise-in ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%]">
                    {m.sender === 'ADMIN' && <p className="text-[11px] text-japandi-muted mb-0.5 ml-1">👩‍💼 {m.authorName}</p>}
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line break-words ${
                      m.sender === 'USER' ? 'bg-japandi-terracotta text-white rounded-br-sm' : 'bg-white border border-japandi-sand rounded-bl-sm'
                    }`}>
                      {m.body}
                    </div>
                    <p className={`text-[10px] text-japandi-muted mt-0.5 ${m.sender === 'USER' ? 'text-right mr-1' : 'ml-1'}`}>{timeOf(m.createdAt)}</p>
                  </div>
                </div>
              )
            ))}
            {tab === 'staff' && thread?.status === 'CLOSED' && (
              <p className="text-center text-xs text-japandi-muted">เจ้าหน้าที่ปิดเรื่องนี้แล้ว — ส่งข้อความใหม่เพื่อเปิดเรื่องอีกครั้ง</p>
            )}
          </div>

          {/* ส่วนล่าง: หัวข้อด่วน + ช่องพิมพ์ / ฟอร์มส่งเรื่อง */}
          <div className="border-t border-japandi-sand bg-white p-3 space-y-2">
            {error && <p className="text-xs text-red-600">{error}</p>}

            {tab === 'bot' && handoffDraft !== null && (
              <form onSubmit={submitHandoff} className="space-y-2">
                <p className="text-xs font-semibold">ส่งเรื่องให้เจ้าหน้าที่</p>
                <textarea
                  autoFocus
                  value={handoffDraft}
                  onChange={(e) => setHandoffDraft(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="พิมพ์เรื่องที่อยากสอบถาม เช่น ขอย้ายห้อง, สอบถามค่าไฟ"
                  className="w-full text-sm rounded-xl border border-japandi-sand px-3 py-2 focus:outline-none focus:ring-2 focus:ring-japandi-terracotta/30"
                />
                {topics.length > 0 && <p className="text-[11px] text-japandi-muted">แนบสรุป: หัวข้อที่ดูแล้ว — {topics.join(', ')}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setHandoffDraft(null)} className="text-sm px-3 py-1.5 rounded-full text-japandi-muted hover:bg-japandi-sand">ยกเลิก</button>
                  <button disabled={sending || !handoffDraft.trim()} className="text-sm px-4 py-1.5 rounded-full bg-japandi-terracotta text-white disabled:opacity-50">
                    {sending ? 'กำลังส่ง...' : 'ส่งเรื่อง'}
                  </button>
                </div>
              </form>
            )}

            {tab === 'bot' && handoffDraft === null && (
              <>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {FAQS.map((f) => (
                    <button key={f.id} onClick={() => askTopic(f)} disabled={typing} className="shrink-0 disabled:opacity-50 text-xs px-3 py-1.5 rounded-full border border-japandi-sand hover:border-japandi-terracotta hover:text-japandi-terracotta">
                      {f.title}
                    </button>
                  ))}
                </div>
                <form onSubmit={askText} className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={300}
                    placeholder="พิมพ์คำถาม เช่น เดินทางมายังไง"
                    className="flex-1 text-sm rounded-full border border-japandi-sand px-4 py-2 focus:outline-none focus:ring-2 focus:ring-japandi-terracotta/30"
                  />
                  <button disabled={typing} className="w-9 h-9 shrink-0 rounded-full bg-japandi-terracotta text-white flex items-center justify-center disabled:opacity-50" aria-label="ส่งคำถาม">
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}

            {tab === 'staff' && loggedIn && thread && (
              <form onSubmit={sendStaff} className="flex gap-2 items-end">
                <textarea
                  value={staffInput}
                  onChange={(e) => setStaffInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) sendStaff(e) }}
                  rows={1}
                  maxLength={1000}
                  placeholder="พิมพ์ข้อความถึงเจ้าหน้าที่"
                  className="flex-1 resize-none text-sm rounded-2xl border border-japandi-sand px-4 py-2 focus:outline-none focus:ring-2 focus:ring-japandi-terracotta/30"
                />
                <button disabled={sending || !staffInput.trim()} className="w-9 h-9 shrink-0 rounded-full bg-japandi-terracotta text-white flex items-center justify-center disabled:opacity-50" aria-label="ส่งข้อความ">
                  <Send size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-[60] bottom-4 right-4 w-14 h-14 rounded-full bg-japandi-terracotta hover:bg-japandi-terracotta-dark text-white shadow-xl flex items-center justify-center transition"
        aria-label={open ? 'ปิดแชทช่วยเหลือ' : 'เปิดแชทช่วยเหลือ'}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
            {unread}
          </span>
        )}
      </button>
    </>
  )
}
