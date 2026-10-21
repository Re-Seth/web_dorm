import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import { useAuth } from '../../context/AuthContext'
import { useRegistration } from '../../context/RegistrationContext'

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { refresh } = useRegistration()
  const { pathname } = useLocation()
  const { user } = useAuth()

  // เปลี่ยนหน้า → ปิดเมนูมือถือ และโหลดสถานะการจอง/ชำระเงินล่าสุดจาก server (แอดมินอาจเปลี่ยนสถานะไปแล้ว)
  useEffect(() => {
    setMenuOpen(false)
    if (user?.role !== 'ADMIN') refresh()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // ผู้จัดการหอพักใช้หน้าตาแบบโปรเจกต์ kit (โทนเข้ม)
  if (user?.role === 'ADMIN') {
    return (
      <div className="flex h-screen w-screen overflow-hidden">
        <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopbar onMenu={() => setMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="theme-japandi flex h-screen w-screen overflow-hidden font-body">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
