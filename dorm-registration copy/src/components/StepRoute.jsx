import { Navigate } from 'react-router-dom'
import { useStepAccess } from '../hooks/useStepAccess'

// กันการเข้าหน้าที่ยังไม่ถึงขั้นตอน (เช่น พิมพ์ URL ตรง ๆ)
export default function StepRoute({ path, children }) {
  const { syncing, lockReason, nextPath } = useStepAccess()

  if (syncing) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  if (lockReason(path)) return <Navigate to={nextPath} replace />
  return children
}
