import { useCallback, useEffect, useState } from 'react'
import { adminChatApi } from '../services/api'
import socket from '../services/socket'

// รายการห้องแชทนิสิต + จำนวนข้อความที่ยังไม่อ่าน (สำหรับผู้จัดการหอพัก) — อัปเดตเองเมื่อมีข้อความใหม่
export function useAdminChats(enabled = true) {
  const [threads, setThreads] = useState([])

  const refresh = useCallback(async () => {
    try {
      const res = await adminChatApi.list()
      setThreads(res.data)
    } catch {
      // non-blocking
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    refresh()
    socket.on('chat_message', refresh)
    socket.on('chat_updated', refresh)
    return () => {
      socket.off('chat_message', refresh)
      socket.off('chat_updated', refresh)
    }
  }, [enabled, refresh])

  const unreadThreads = threads.filter((t) => t.unread > 0).length
  return { threads, unreadThreads, refresh }
}
