import { useCallback, useEffect, useState } from 'react'
import { maintenanceApi } from '../services/api'
import socket from '../services/socket'

const SEEN_KEY = 'taothong.maintenance.lastSeenId'
const SEEN_EVENT = 'maintenance-seen'

export function getLastSeenId() {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0
  } catch {
    return 0
  }
}

// บันทึกว่าผู้จัดการเห็นรายการแจ้งซ่อมถึง id ไหนแล้ว และแจ้ง component อื่นให้อัปเดต
export function markMaintenanceSeen(requests) {
  const maxId = requests.reduce((max, r) => Math.max(max, r.id), 0)
  if (maxId <= getLastSeenId()) return
  try {
    localStorage.setItem(SEEN_KEY, String(maxId))
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(SEEN_EVENT))
}

// ดึงรายการแจ้งซ่อม + ฟังการแจ้งซ่อมใหม่แบบ Real-time (สำหรับผู้จัดการหอพัก)
export function useMaintenanceAlerts(enabled = true) {
  const [requests, setRequests] = useState([])
  const [lastSeenId, setLastSeenId] = useState(getLastSeenId)
  const [latestIncoming, setLatestIncoming] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const res = await maintenanceApi.getAll()
      setRequests(res.data)
    } catch {
      // non-blocking
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    refresh()

    const onCreated = (req) => {
      setLatestIncoming(req)
      refresh()
    }
    const onSeen = () => setLastSeenId(getLastSeenId())

    socket.on('maintenance_created', onCreated)
    socket.on('maintenance_updated', refresh)
    window.addEventListener(SEEN_EVENT, onSeen)
    return () => {
      socket.off('maintenance_created', onCreated)
      socket.off('maintenance_updated', refresh)
      window.removeEventListener(SEEN_EVENT, onSeen)
    }
  }, [enabled, refresh])

  const unseen = requests.filter((r) => r.id > lastSeenId)

  return {
    requests,
    unseen,
    lastSeenId,
    latestIncoming,
    clearLatestIncoming: () => setLatestIncoming(null),
    markAllSeen: () => markMaintenanceSeen(requests),
    refresh
  }
}
