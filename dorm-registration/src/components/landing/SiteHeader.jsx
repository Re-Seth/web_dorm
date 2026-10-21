import { Link } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export function Brand({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-3 group">
      <div className="w-10 h-10 rounded-full bg-japandi-terracotta text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-japandi-terracotta-dark transition shrink-0">TT</div>
      <div>
        <span className="font-display text-lg sm:text-xl font-semibold block leading-tight text-japandi-oak">
          เทาทอง <span className="text-japandi-terracotta font-light">Residence</span>
        </span>
        {!compact && <span className="text-xs text-japandi-muted tracking-wider uppercase hidden sm:block">Tao Thong Dormitory</span>}
      </div>
    </Link>
  )
}

const NAV = [
  ['#about', 'เกี่ยวกับโครงการ'],
  ['#buildings', 'อาคารและห้องพัก'],
  ['#amenities', 'สิ่งอำนวยความสะดวก'],
  ['#location', 'แผนที่ตำแหน่ง'],
]

// แถบบนของหน้าสาธารณะ (หน้าแรก / ลงทะเบียน / เข้าสู่ระบบ)
// showNav = หน้าแรก (ลิงก์เลื่อนไปแต่ละ section) / ไม่งั้นแสดงปุ่มกลับหน้าแรก
export default function SiteHeader({ showNav = false }) {
  const { isAuthenticated } = useAuth()

  return (
    <header className="sticky top-0 z-40 bg-japandi-bg/90 backdrop-blur-md border-b border-japandi-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
        <Brand />

        {showNav && (
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-japandi-oak">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="hover:text-japandi-terracotta transition">{label}</a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {!showNav && (
            <Link to="/" className="px-4 py-2.5 rounded-full text-sm font-medium text-japandi-oak hover:bg-japandi-sand/60 transition flex items-center gap-2">
              <ArrowLeft size={14} /> <span className="hidden sm:inline">กลับหน้าแรก</span>
            </Link>
          )}
          {isAuthenticated ? (
            <Link to="/app" className="px-4 py-2.5 rounded-full bg-japandi-oak text-white text-sm font-medium hover:bg-black transition flex items-center gap-2">
              <LayoutDashboard size={14} /> <span className="hidden sm:inline">หน้าหลักผู้เช่า</span>
            </Link>
          ) : (
            <>
              <a href={showNav ? '#login' : '/login'} className="px-4 py-2.5 rounded-full border border-japandi-sand bg-white text-sm font-medium text-japandi-oak hover:bg-japandi-sand/60 transition flex items-center gap-2">
                <LogIn size={14} /> <span className="hidden sm:inline">เข้าสู่ระบบ</span>
              </a>
              <Link to="/apply" className="whitespace-nowrap px-4 sm:px-5 py-2.5 rounded-full bg-japandi-terracotta text-white font-medium text-sm hover:bg-japandi-terracotta-dark shadow-md transition flex items-center gap-2">
                <UserPlus size={14} /> ลงทะเบียน
              </Link>
            </>
          )}
        </div>
      </div>
      {/* มือถือ/แท็บเล็ต: เมนูหน้าแรกเป็นแถบเลื่อนแนวนอนใต้หัวเว็บ */}
      {showNav && (
        <nav className="lg:hidden border-t border-japandi-sand overflow-x-auto" aria-label="เมนูหน้าแรก">
          <div className="flex gap-1 px-4 py-2 text-sm font-medium text-japandi-oak whitespace-nowrap">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="px-3 py-1.5 rounded-full hover:bg-japandi-sand/60 transition">{label}</a>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
