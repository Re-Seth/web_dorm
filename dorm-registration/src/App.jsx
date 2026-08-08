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
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
