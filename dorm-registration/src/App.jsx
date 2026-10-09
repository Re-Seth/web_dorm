import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import RegisterWizard from './pages/RegisterDorm/RegisterWizard'
import RoomSelection from './pages/RoomSelection'
import Payment from './pages/Payment'
import Receipt from './pages/Receipt'
import FeedbackReview from './pages/FeedbackReview'
import MainLayout from './components/Layout/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import DormServices from './DormServices' // นำเข้า Component บริการค่าไฟและแจ้งซ่อม
import AdminLogin from './admin/AdminLogin'
import AdminLayout from './admin/AdminLayout'
import Overview from './admin/pages/Overview'
import AdminRooms from './admin/pages/Rooms'
import AdminBookings from './admin/pages/Bookings'
import AdminMaintenance from './admin/pages/Maintenance'
import AdminUsers from './admin/pages/Users'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthPage />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="register" element={<RegisterWizard />} />
        <Route path="rooms" element={<RoomSelection />} />
        <Route path="payment" element={<Payment />} />
        <Route path="receipt" element={<Receipt />} />
        <Route path="review" element={<FeedbackReview />} />
        
        {/* Route เพิ่มเติมสำหรับระบบค่าไฟและการแจ้งซ่อม */}
        <Route path="services" element={<DormServices />} />
        <Route path="power" element={<DormServices />} />
        <Route path="maintenance" element={<DormServices />} />
      </Route>

      {/* ระบบหลังบ้านสำหรับผู้ดูแล (ต้องล็อกอินด้วยบัญชี role = ADMIN) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Overview />} />
        <Route path="rooms" element={<AdminRooms />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="maintenance" element={<AdminMaintenance />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}