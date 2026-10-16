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
import AdminRoute from './components/AdminRoute'
import StepRoute from './components/StepRoute'
import AdminDashboard from './pages/Admin/AdminDashboard'
import DormServices from './DormServices' // นำเข้า Component บริการค่าไฟและแจ้งซ่อม

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
        <Route index element={<StepRoute path="/app"><Dashboard /></StepRoute>} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="register" element={<RegisterWizard />} />
        <Route path="rooms" element={<StepRoute path="/app/rooms"><RoomSelection /></StepRoute>} />
        <Route path="payment" element={<StepRoute path="/app/payment"><Payment /></StepRoute>} />
        <Route path="receipt" element={<StepRoute path="/app/receipt"><Receipt /></StepRoute>} />
        <Route path="review" element={<StepRoute path="/app/review"><FeedbackReview /></StepRoute>} />
        
        {/* Route เพิ่มเติมสำหรับระบบค่าไฟและการแจ้งซ่อม */}
        <Route path="services" element={<StepRoute path="/app/services"><DormServices /></StepRoute>} />
        <Route path="power" element={<StepRoute path="/app/services"><DormServices /></StepRoute>} />
        <Route path="maintenance" element={<StepRoute path="/app/services"><DormServices /></StepRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}