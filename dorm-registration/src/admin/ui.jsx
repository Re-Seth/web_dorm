import { useEffect } from 'react'

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-bone/50 text-sm mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

const TONES = {
  green: 'bg-room-empty/20 text-room-empty2',
  yellow: 'bg-room-mid/20 text-room-mid',
  red: 'bg-room-full/20 text-room-full',
  gray: 'bg-bone/10 text-bone/60',
  blue: 'bg-sky-500/15 text-sky-300',
}

export function Badge({ tone = 'gray', children }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  )
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className="card w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display font-medium text-lg mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Table({ head, children, empty }) {
  const rows = Array.isArray(children) ? children.flat().filter(Boolean) : children
  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-bone/50 border-b border-charcoal-line">
            {head.map((h) => <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal-line">{children}</tbody>
      </table>
      {(!rows || rows.length === 0) && <p className="text-center text-bone/40 py-10">{empty || 'ไม่มีข้อมูล'}</p>}
    </div>
  )
}

export function ErrorBox({ message }) {
  if (!message) return null
  return <p role="alert" className="text-sm text-room-full bg-room-full/10 border border-room-full/30 rounded-md px-3 py-2 mb-4">{message}</p>
}

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
export const baht = (n) => Number(n || 0).toLocaleString('th-TH') + ' ฿'
