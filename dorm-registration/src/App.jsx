import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ApplyPage from './pages/ApplyPage'
import RoomSelection from './pages/RoomSelection'
import Payment from './pages/Payment'
import Receipt from './pages/Receipt'
import FeedbackReview from './pages/FeedbackReview'
import MainLayout from './components/Layout/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import DormServices from './DormServices' // นำเข้า Component บริการค่าไฟและแจ้งซ่อม
import AdminRoute from './components/AdminRoute'
import AdminDashboard from './pages/Admin/AdminDashboard' // ระบบผู้จัดการหอพัก (จากโปรเจกต์ kit)
import ChatWidget from './components/chat/ChatWidget' // แชทบอท + คุยกับเจ้าหน้าที่ (ทุกหน้า)

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/apply" element={<ApplyPage />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        {/* ฟอร์มเก่า → ใช้หน้าลงทะเบียนใหม่ / จัดการข้อมูลที่หน้าหลักผู้เช่า */}
        <Route path="register" element={<Navigate to="/apply" replace />} />
        <Route path="profile" element={<Navigate to="/app" replace />} />
        <Route path="rooms" element={<RoomSelection />} />
        <Route path="payment" element={<Payment />} />
        <Route path="receipt" element={<Receipt />} />
        <Route path="review" element={<FeedbackReview />} />
        
        {/* Route เพิ่มเติมสำหรับระบบค่าไฟและการแจ้งซ่อม */}
        <Route path="services" element={<DormServices />} />
        <Route path="power" element={<DormServices />} />
        <Route path="maintenance" element={<DormServices />} />
      </Route>

      {/* ลิงก์หลังบ้านแบบเดิม → ผู้จัดการหอพักล็อกอินที่ /login แล้วใช้ /app/admin */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/admin/*" element={<Navigate to="/app/admin" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <ChatWidget />
    </>
  )
}