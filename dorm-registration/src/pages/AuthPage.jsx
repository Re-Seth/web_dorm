import { BookmarkCheck, IdCard, PencilLine } from 'lucide-react'
import LoginCard from '../components/landing/LoginCard'
import SiteHeader from '../components/landing/SiteHeader'

const PERKS = [
  [IdCard, 'บัตรผู้เช่าดิจิทัลพร้อม QR Code'],
  [PencilLine, 'แก้ไขข้อมูลติดต่อและผู้ติดต่อฉุกเฉินได้ตลอดเวลา'],
  [BookmarkCheck, 'เก็บข้อมูลไว้ลงทะเบียนภาคเรียนถัดไป'],
]

// หน้าเข้าสู่ระบบผู้เช่า (สมัครใหม่ที่หน้า /apply)
export default function AuthPage() {
  return (
    <div className="theme-japandi min-h-screen bg-japandi-bg text-japandi-oak font-body flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="relative hidden lg:block">
          <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <img
              src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1000&q=80"
              alt="ห้องพักหอพักเทาทองสไตล์ Japandi"
              className="w-full h-[520px] object-cover"
            />
          </div>
          <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-japandi-sand shadow-lg space-y-2">
            {PERKS.map(([Icon, text]) => (
              <p key={text} className="flex items-center gap-2 text-sm"><Icon size={16} className="text-japandi-terracotta shrink-0" /> {text}</p>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md mx-auto space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-japandi-terracotta">Tenant Sign In</span>
            <h1 className="font-display text-3xl font-bold mt-1">ยินดีต้อนรับกลับ</h1>
            <p className="text-sm text-japandi-muted mt-2">เข้าสู่ระบบด้วยอีเมลที่ใช้ลงทะเบียน เพื่อดูและจัดการข้อมูลผู้เช่าของคุณ</p>
          </div>
          <LoginCard redirectTo="/app" />
        </div>
      </main>
    </div>
  )
}
