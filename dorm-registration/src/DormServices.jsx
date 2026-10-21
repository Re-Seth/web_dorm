import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import studentApi, { errMsg } from './studentApi';
import socket from './services/socket';
import { useAuth } from './context/AuthContext';
import { useRegistration } from './context/RegistrationContext';
import { Activity, ClipboardList, Gauge, PlugZap, Receipt, Send, Wrench, Zap } from 'lucide-react';

const STATUS_BADGE = {
  PENDING: ['รอดำเนินการ', 'bg-amber-50 text-amber-700 border-amber-200'],
  IN_PROGRESS: ['กำลังซ่อมแซม', 'bg-sky-50 text-sky-700 border-sky-200'],
  COMPLETED: ['ซ่อมเสร็จสิ้น', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
};

export default function DormServices() {
  const [power, setPower] = useState({
    voltage: 220,
    current: 0,
    power: 0,
    energyUnits: 142.5,
    estimatedCost: 997.5,
    timestamp: null
  });

  const isAdmin = useAuth().user?.role === 'ADMIN';
  const { booking } = useRegistration();
  const [requests, setRequests] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const sendingRef = useRef(false); // กันดับเบิลคลิก (state อัปเดตไม่ทันระหว่างคลิกติดกัน)
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const onPower = (data) => setPower(data);
    socket.on('power_update', onPower);
    // ผู้จัดการเปลี่ยนสถานะรายการของเรา → อัปเดตทันทีโดยไม่ต้องรีเฟรช
    socket.on('maintenance_updated', fetchRequests);
    socket.on('maintenance_created', fetchRequests);

    fetchRequests();

    return () => {
      socket.off('power_update', onPower);
      socket.off('maintenance_updated', fetchRequests);
      socket.off('maintenance_created', fetchRequests);
    };
  }, []);

  const fetchRequests = async () => {
    try {
      // backend ส่งเฉพาะรายการที่ผู้ใช้คนนี้แจ้ง (Admin เห็นทั้งหมด)
      const res = await studentApi.get('/api/maintenance');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setBusy(true);
    setFormError('');
    try {
      // ห้องที่แจ้งซ่อม = ห้องที่จองไว้ (backend ใช้ห้องจากการจองของผู้แจ้งเอง)
      await studentApi.post('/api/maintenance', { title, description });
      setTitle('');
      setDescription('');
      fetchRequests();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  };

  // เวลาจากเซิร์ฟเวอร์เป็น ISO → แสดงเป็นเวลาไทย
  const liveTime = power.timestamp
    ? new Date(power.timestamp).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })
    : '--:--:--';

  const getStatusBadge = (status) => {
    const badge = STATUS_BADGE[status];
    if (!badge) return status;
    return <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${badge[1]}`}>{badge[0]}</span>;
  };

  const meters = [
    { label: 'กำลังไฟปัจจุบัน', value: `${power.power} W`, Icon: Zap },
    { label: 'แรงดัน / กระแส', value: `${power.voltage}V / ${power.current}A`, Icon: Activity },
    { label: 'หน่วยไฟสะสม', value: `${power.energyUnits} kWh`, Icon: Gauge },
    { label: 'ประมาณการค่าไฟ', value: `${power.estimatedCost} ฿`, Icon: Receipt },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-gold">Dorm Services</span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">ค่าไฟ & แจ้งซ่อม {booking.roomCode && <span className="text-bone/50 font-normal text-lg">(ห้อง {booking.roomCode})</span>}</h1>
      </div>

      {/* มิเตอร์ไฟ Real-time */}
      <section className="relative overflow-hidden rounded-3xl bg-japandi-oak text-japandi-sand p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-japandi-terracotta/25 pointer-events-none" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2"><PlugZap size={20} className="text-japandi-wood" /> การใช้ไฟฟ้าแบบ Real-time</h2>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live ({liveTime})
          </span>
        </div>
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3">
          {meters.map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <p className="text-xs text-japandi-sand/70 flex items-center gap-1.5"><Icon size={13} /> {label}</p>
              <p className="font-display text-xl sm:text-2xl font-bold text-white mt-2 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* แบบฟอร์มแจ้งซ่อม */}
        <section className="card">
          <h3 className="font-display text-lg font-bold mb-5 flex items-center gap-2"><Wrench size={18} className="text-gold" /> แบบฟอร์มแจ้งซ่อม</h3>
          {isAdmin ? (
            <p className="text-sm text-bone/60">ผู้จัดการหอพักจัดการรายการแจ้งซ่อมได้ที่ <Link to="/app/admin?tab=maintenance" className="underline">ระบบจัดการหอพัก</Link></p>
          ) : !booking.confirmed ? (
            <div className="space-y-3">
              <p className="text-sm text-bone/60">ต้องจองห้องพักก่อนจึงจะแจ้งซ่อมได้ (ระบบใช้ห้องที่คุณจองไว้)</p>
              <Link to="/app/rooms" className="btn-primary inline-block">ไปเลือกห้องพัก →</Link>
            </div>
          ) : (
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div>
              <p className="field-label">ห้องที่แจ้งซ่อม</p>
              <p className="font-mono font-semibold">{booking.roomCode}</p>
            </div>
            <div>
              <label className="field-label" htmlFor="svc-title">อุปกรณ์ที่ชำรุด</label>
              <input id="svc-title" type="text" placeholder="เช่น แอร์ไม่เย็น, ก๊อกน้ำรั่ว" value={title} onChange={(e) => setTitle(e.target.value)} className="field" maxLength={200} required />
            </div>
            <div>
              <label className="field-label" htmlFor="svc-desc">รายละเอียดอาการ</label>
              <textarea id="svc-desc" placeholder="ระบุอาการเพิ่มเติม..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="field" maxLength={2000} required />
            </div>
            {formError && <p role="alert" className="text-sm text-room-full">{formError}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2">
              <Send size={15} /> {busy ? 'กำลังส่ง…' : 'ส่งแจ้งซ่อม'}
            </button>
          </form>
          )}
        </section>

        {/* รายการแจ้งซ่อม */}
        <section className="card">
          <h3 className="font-display text-lg font-bold mb-5 flex items-center gap-2"><ClipboardList size={18} className="text-gold" /> รายการแจ้งซ่อม</h3>
          {requests.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-charcoal-line bg-charcoal">
              <p className="text-sm text-bone/60">ยังไม่มีประวัติการแจ้งซ่อม</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {requests.map((item) => (
                <article key={item.id} className="rounded-2xl border border-charcoal-line bg-charcoal p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-bold break-words min-w-0">{item.roomCode ? `ห้อง ${item.roomCode} - ` : ''}{item.title}</h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-sm text-bone/70 leading-relaxed">{item.description}</p>
                  <p className="text-[11px] text-bone/50 mt-3">อัปเดตสถานะโดยผู้จัดการหอพัก</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
