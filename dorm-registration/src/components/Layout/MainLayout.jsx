import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import { useAuth } from '../../context/AuthContext'
import { useRegistration } from '../../context/RegistrationContext'
import api from '../../studentApi'

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { infoCompleted, updatePerson, markInfoCompleted } = useRegistration()
  const { pathname } = useLocation()
  const { user } = useAuth()

  useEffect(() => setMenuOpen(false), [pathname])

  // ข้อมูลผู้เช่าอยู่ใน backend → ซิงก์สถานะ "กรอกข้อมูลแล้ว" ให้ขั้นตอนเลือกห้อง/ชำระเงิน (เช่น ล็อกอินจากเครื่องใหม่)
  useEffect(() => {
    if (infoCompleted) return
    api.get('/api/profile').then(({ data }) => {
      if (!data) return
      updatePerson('student', { prefix: data.prefix, firstName: data.firstName, lastName: data.lastName, citizenId: data.citizenId, phone: data.mobile })
      markInfoCompleted()
    }).catch(() => {})
  }, [infoCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

  // ผู้จัดการหอพักใช้หน้าตาแบบโปรเจกต์ kit (โทนเข้ม)
  if (user?.role === 'ADMIN') {
    return (
      <div className="flex h-screen w-screen overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopbar />
          <main className="flex-1 overflow-y-auto p-6 sm:p-8">
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
