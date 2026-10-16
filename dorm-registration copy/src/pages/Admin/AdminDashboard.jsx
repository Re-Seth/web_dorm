import React, { useState, useEffect } from 'react'
import {
  Users,
  BedDouble,
  CreditCard,
  Wrench,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Building2,
  UserCheck,
  TrendingUp,
  Receipt,
  Trash2,
  ChevronRight
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { adminApi, maintenanceApi } from '../../services/api'
import socket from '../../services/socket'
import { getLastSeenId, markMaintenanceSeen } from '../../hooks/useMaintenanceAlerts'

export default function AdminDashboard() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [residents, setResidents] = useState([])
  const [payments, setPayments] = useState([])
  const [maintenanceList, setMaintenanceList] = useState([])
  const [usersList, setUsersList] = useState([])

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDormFilter, setSelectedDormFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  // รายการแจ้งซ่อมที่ id มากกว่านี้ถือว่า "ใหม่" (ยังไม่เคยเปิดดู)
  const [newSinceId, setNewSinceId] = useState(getLastSeenId)

  useEffect(() => {
    loadAllData()
  }, [])

  // เปิดแท็บตาม ?tab= (เช่น กดจากกระดิ่งแจ้งเตือน)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  // มีการแจ้งซ่อมใหม่/อัปเดต -> รีเฟรชข้อมูลแจ้งซ่อมแบบเงียบ ๆ
  useEffect(() => {
    const reloadMaintenance = async () => {
      try {
        const [ovRes, mainRes] = await Promise.all([adminApi.getOverview(), maintenanceApi.getAll()])
        setOverview(ovRes.data)
        setMaintenanceList(mainRes.data)
      } catch {
        // non-blocking
      }
    }
    socket.on('maintenance_created', reloadMaintenance)
    socket.on('maintenance_updated', reloadMaintenance)
    return () => {
      socket.off('maintenance_created', reloadMaintenance)
      socket.off('maintenance_updated', reloadMaintenance)
    }
  }, [])

  // อยู่ในแท็บแจ้งซ่อม = เห็นรายการแล้ว, ออกจากแท็บ = ล้างป้าย "ใหม่"
  useEffect(() => {
    if (activeTab === 'maintenance') {
      markMaintenanceSeen(maintenanceList)
    } else {
      setNewSinceId(getLastSeenId())
    }
  }, [activeTab, maintenanceList])

  const newMaintenanceCount = maintenanceList.filter((m) => m.id > newSinceId).length

  const showNotice = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [ovRes, resRes, payRes, mainRes, uRes] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getResidents(),
        adminApi.getPayments(),
        maintenanceApi.getAll(),
        adminApi.getUsers()
      ])
      setOverview(ovRes.data)
      setResidents(resRes.data)
      setPayments(payRes.data)
      setMaintenanceList(mainRes.data)
      setUsersList(uRes.data)
    } catch (err) {
      console.error('Failed to load admin data:', err)
      showNotice('โหลดข้อมูลไม่สำเร็จ: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle Cancel Booking
  const handleCancelBooking = async (bookingId, studentName) => {
    if (!window.confirm(`ยืนยันการยกเลิกการจองห้องพักของ "${studentName}" หรือไม่? (เตียงจะว่างทันที)`)) {
      return
    }
    setActionLoading(true)
    try {
      await adminApi.cancelBooking(bookingId)
      showNotice(`ยกเลิกการจองของ "${studentName}" สำเร็จ`)
      loadAllData()
    } catch (err) {
      showNotice('เกิดข้อผิดพลาดในการยกเลิก: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Update Payment Status
  const handleUpdatePaymentStatus = async (paymentId, newStatus) => {
    setActionLoading(true)
    try {
      await adminApi.updatePaymentStatus(paymentId, newStatus)
      showNotice(`อัปเดตสถานะการชำระเงินเป็น "${newStatus}" เรียบร้อย`)
      loadAllData()
    } catch (err) {
      showNotice('อัปเดตสถานะไม่สำเร็จ: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Update Maintenance Status
  const handleUpdateMaintenanceStatus = async (id, status) => {
    setActionLoading(true)
    try {
      await maintenanceApi.updateStatus(id, status)
      showNotice(`อัปเดตสถานะงานแจ้งซ่อมเรียบร้อย`)
      loadAllData()
    } catch (err) {
      showNotice('อัปเดตงานแจ้งซ่อมไม่สำเร็จ: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle User Role Toggle
  const handleToggleUserRole = async (userId, currentRole, username) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'
    if (!window.confirm(`ต้องการเปลี่ยนสิทธิ์ของ "${username}" เป็น "${newRole}" หรือไม่?`)) {
      return
    }
    setActionLoading(true)
    try {
      await adminApi.updateUserRole(userId, newRole)
      showNotice(`เปลี่ยนสิทธิ์ ${username} เป็น ${newRole} สำเร็จ`)
      loadAllData()
    } catch (err) {
      showNotice('เปลี่ยนสิทธิ์ไม่สำเร็จ: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Filter residents
  const filteredResidents = residents.filter((r) => {
    const matchesDorm = selectedDormFilter === 'ALL' || r.room?.dormId === selectedDormFilter
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      !searchQuery ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.username?.toLowerCase().includes(q) ||
      r.room?.code?.toLowerCase().includes(q) ||
      r.user?.profile?.phone?.includes(q)
    return matchesDorm && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        <p className="text-slate-400 text-sm">กำลังโหลดข้อมูลระบบผู้จัดการหอพัก...</p>
      </div>
    )
  }

  const stats = overview?.stats || {}
  const dormsSummary = overview?.dormsSummary || []

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-wide">ระบบผู้จัดการหอพัก (Dorm Manager)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ADMIN
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              ศูนย์ควบคุมและบริหารจัดการหอพักเทาทอง 1-4 แบบรวมศูนย์ (เชื่อมต่อ SQLite Database)
            </p>
          </div>
        </div>

        <button
          onClick={loadAllData}
          disabled={actionLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-600 rounded-xl text-sm font-medium transition-all shadow-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin text-amber-400' : ''}`} />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {/* Alert Notification */}
      {notification && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center gap-3 text-sm animate-fade-in ${
            notification.type === 'error'
              ? 'bg-red-950/80 border-red-500/40 text-red-200'
              : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">นิสิตในระบบ</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">{stats.totalStudents || 0}</div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-blue-400">จากผู้ใช้ทั้งหมด {stats.totalUsers || 0} บัญชี</span>
          </p>
        </div>

        {/* Card 2: Occupancy Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">อัตราครองเตียง</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">{stats.occupancyRate || 0}%</span>
            <span className="text-xs text-slate-400 font-mono">
              ({stats.totalBookings || 0}/{stats.totalCapacity || 720})
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.occupancyRate || 0)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 3: Total Revenue */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">รายได้รวมที่ชำระแล้ว</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            ฿{(stats.totalRevenue || 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1">ค่าลงทะเบียนหอพัก 1,999 บ./คน</p>
        </div>

        {/* Card 4: Pending Repairs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">งานแจ้งซ่อมค้าง</span>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400 font-mono">{stats.pendingMaintenance || 0}</span>
            <span className="text-xs text-slate-400">รายการรอดำเนินการ</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            กำลังซ่อม: {stats.inProgressMaintenance || 0} · เสร็จสิ้น: {stats.completedMaintenance || 0}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: '📊 ภาพรวมหอพัก', count: null },
          { id: 'residents', label: '🛏️ จัดการผู้พัก & ห้อง', count: residents.length },
          { id: 'payments', label: '💳 การชำระเงิน', count: payments.length },
          { id: 'maintenance', label: '🔧 จัดการแจ้งซ่อม', count: maintenanceList.length, alert: newMaintenanceCount },
          { id: 'users', label: '👤 จัดการสิทธิ์ผู้ใช้', count: usersList.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 rounded-t-xl text-sm font-semibold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                  activeTab === tab.id ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
            {tab.alert > 0 && activeTab !== tab.id && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                ใหม่ {tab.alert}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Dorms Breakdown */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>สถานะความจุจำแนกตามหอพัก (เทาทอง 1-4)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dormsSummary.map((d) => (
                <div
                  key={d.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-base">{d.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          d.gender === 'ชาย'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                        }`}
                      >
                        {d.gender}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      {d.floors} ชั้น · {d.totalRooms} ห้อง · ความจุ {d.capacity} เตียง
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">เข้าพักแล้ว {d.occupied} คน</span>
                      <span className="text-amber-400 font-bold font-mono">{d.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, d.percent)}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-emerald-400 text-right">ว่าง {d.available} เตียง</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Bookings */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>การจองล่าสุด</span>
                </span>
                <button
                  onClick={() => setActiveTab('residents')}
                  className="text-xs text-amber-400 hover:underline flex items-center"
                >
                  ดูทั้งหมด <ChevronRight className="w-3 h-3" />
                </button>
              </h3>

              {overview?.recentBookings?.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">ยังไม่มีประวัติการจอง</p>
              ) : (
                <div className="space-y-3">
                  {overview?.recentBookings?.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white text-sm">
                          {b.user?.name || b.user?.username} ({b.user?.username})
                        </div>
                        <p className="text-xs text-slate-400">
                          {b.room?.dorm?.name} · ห้อง {b.room?.code} (ชั้น {b.room?.floor})
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          b.payment?.status === 'PAID'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {b.payment?.status === 'PAID' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Maintenance */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-rose-400" />
                  <span>การแจ้งซ่อมล่าสุด</span>
                </span>
                <button
                  onClick={() => setActiveTab('maintenance')}
                  className="text-xs text-amber-400 hover:underline flex items-center"
                >
                  ดูทั้งหมด <ChevronRight className="w-3 h-3" />
                </button>
              </h3>

              {overview?.recentMaintenance?.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">ไม่มีรายการแจ้งซ่อม</p>
              ) : (
                <div className="space-y-3">
                  {overview?.recentMaintenance?.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white text-sm">
                          ห้อง {m.roomCode || m.roomId} - {m.title}
                        </div>
                        <p className="text-xs text-slate-400">ผู้แจ้ง: {m.user?.name || m.user?.username || 'นิสิต'}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          m.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : m.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {m.status === 'COMPLETED' ? 'เสร็จสิ้น' : m.status === 'IN_PROGRESS' ? 'กำลังซ่อม' : 'รอดำเนินการ'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RESIDENTS & BOOKINGS */}
      {activeTab === 'residents' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-amber-400" />
              <span>รายชื่อผู้พักและห้องพักที่จองแล้ว</span>
            </h2>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัส, ห้อง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Dorm Filter */}
              <select
                value={selectedDormFilter}
                onChange={(e) => setSelectedDormFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">ทุกหอพัก</option>
                <option value="tt1">หอ 1 (ชาย)</option>
                <option value="tt2">หอ 2 (หญิง)</option>
                <option value="tt3">หอ 3 (หญิง)</option>
                <option value="tt4">หอ 4 (หญิง)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">รหัสนิสิต / ชื่อ-สกุล</th>
                  <th className="px-4 py-3">หอพัก / ชั้น / ห้อง</th>
                  <th className="px-4 py-3">เบอร์โทรศัพท์</th>
                  <th className="px-4 py-3">สถานะชำระเงิน</th>
                  <th className="px-4 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      ไม่พบข้อมูลผู้เข้าพักตามเงื่อนไขที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredResidents.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white">
                          {r.user?.profile?.prefix} {r.user?.profile?.firstName} {r.user?.profile?.lastName}
                          {(!r.user?.profile?.firstName) && (r.user?.name || r.user?.username)}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          รหัส: {r.user?.username} · ปชช: {r.user?.profile?.citizenId || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-amber-300">{r.room?.dorm?.name}</span>
                        <div className="text-xs text-slate-400">
                          ห้อง <span className="font-mono font-bold text-white">{r.room?.code}</span> (ชั้น {r.room?.floor})
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-300">
                        {r.user?.profile?.phone || '-'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            r.payment?.status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {r.payment?.status === 'PAID' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() =>
                            handleCancelBooking(
                              r.id,
                              r.user?.profile?.firstName
                                ? `${r.user.profile.firstName} ${r.user.profile.lastName}`
                                : r.user?.username
                            )
                          }
                          disabled={actionLoading}
                          className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg text-xs font-medium transition-all"
                          title="ยกเลิกการจองและคืนเตียง"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                          ยกเลิกจอง
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>รายการชำระเงินค่าหอพักทั้งหมด</span>
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">เลขที่ใบเสร็จ</th>
                  <th className="px-4 py-3">ผู้ชำระเงิน</th>
                  <th className="px-4 py-3">ห้องพัก</th>
                  <th className="px-4 py-3">ยอดเงิน</th>
                  <th className="px-4 py-3">ช่องทาง</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">ปรับสถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีรายการชำระเงินในระบบ
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-amber-400">{p.receiptNo}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">
                          {p.booking?.user?.name || p.booking?.user?.username}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">({p.booking?.user?.username})</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.booking?.room?.dorm?.name} · ห้อง {p.booking?.room?.code}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        ฿{p.amount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 uppercase text-xs font-mono">{p.method || 'QR'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            p.status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {p.status !== 'PAID' && (
                          <button
                            onClick={() => handleUpdatePaymentStatus(p.id, 'PAID')}
                            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-xs"
                          >
                            อนุมัติ PAID
                          </button>
                        )}
                        {p.status === 'PAID' && (
                          <button
                            onClick={() => handleUpdatePaymentStatus(p.id, 'PENDING')}
                            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-xs"
                          >
                            ตั้งเป็น PENDING
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-rose-400" />
            <span>จัดการรายการแจ้งซ่อมบำรุงหอพัก</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maintenanceList.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-slate-500">ไม่มีรายการแจ้งซ่อม</div>
            ) : (
              maintenanceList.map((m) => (
                <div
                  key={m.id}
                  className={`bg-slate-950/70 border rounded-xl p-5 flex flex-col justify-between space-y-4 ${
                    m.id > newSinceId ? 'border-amber-500/60 shadow-lg shadow-amber-500/10' : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-base">
                        {m.id > newSinceId && (
                          <span className="mr-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white align-middle">
                            ใหม่
                          </span>
                        )}
                        ห้อง {m.roomCode || m.roomId} - {m.title}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          m.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : m.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {m.status === 'COMPLETED' ? 'เสร็จสิ้น' : m.status === 'IN_PROGRESS' ? 'กำลังซ่อม' : 'รอดำเนินการ'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed mb-2">{m.description}</p>
                    <div className="text-xs text-slate-500">
                      ผู้แจ้ง: {m.user?.name || m.user?.username || 'นิสิต'} · วันที่:{' '}
                      {new Date(m.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>

                  {/* Actions to change status */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400">เปลี่ยนสถานะ:</span>
                    <button
                      onClick={() => handleUpdateMaintenanceStatus(m.id, 'PENDING')}
                      className={`text-xs px-2.5 py-1 rounded transition-colors ${
                        m.status === 'PENDING' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      รอดำเนินการ
                    </button>
                    <button
                      onClick={() => handleUpdateMaintenanceStatus(m.id, 'IN_PROGRESS')}
                      className={`text-xs px-2.5 py-1 rounded transition-colors ${
                        m.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      กำลังซ่อม
                    </button>
                    <button
                      onClick={() => handleUpdateMaintenanceStatus(m.id, 'COMPLETED')}
                      className={`text-xs px-2.5 py-1 rounded transition-colors ${
                        m.status === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      เสร็จสิ้น
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>จัดการผู้ใช้งานและสิทธิ์การเข้าถึง (User Roles)</span>
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Username / ชื่อ</th>
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3">สิทธิ์ปัจจุบัน (Role)</th>
                  <th className="px-4 py-3">สถานะการจอง</th>
                  <th className="px-4 py-3 text-right">ปรับเปลี่ยนสิทธิ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400">{u.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{u.name || u.username}</div>
                      <div className="text-xs text-slate-400 font-mono">@{u.username}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {u.role === 'ADMIN' ? '👑 ADMIN' : 'USER'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {u.booking ? (
                        <span className="text-emerald-400">จองห้อง {u.booking.room?.code} แล้ว</span>
                      ) : (
                        <span className="text-slate-500">ยังไม่จองห้อง</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleUserRole(u.id, u.role, u.username)}
                        disabled={actionLoading}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                          u.role === 'ADMIN'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {u.role === 'ADMIN' ? 'เปลี่ยนเป็น USER' : 'ตั้งเป็น ADMIN 👑'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
