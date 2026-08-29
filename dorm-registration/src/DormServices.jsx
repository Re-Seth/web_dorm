import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000');
const API_URL = 'http://localhost:5000/api/maintenance';

export default function DormServices() {
  const [power, setPower] = useState({
    voltage: 220,
    current: 0,
    power: 0,
    energyUnits: 142.5,
    estimatedCost: 997.5,
    timestamp: '--:--:--'
  });

  const [requests, setRequests] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState(101);

  useEffect(() => {
    socket.on('power_update', (data) => {
      setPower(data);
    });

    fetchRequests();

    return () => {
      socket.off('power_update');
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(API_URL);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!title || !description) return;
    try {
      await axios.post(API_URL, { roomId, title, description });
      setTitle('');
      setDescription('');
      fetchRequests();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.patch(`${API_URL}/${id}/status`, { status });
      fetchRequests();
    } catch (err) {
      alert('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span style={{ color: '#b45309', background: '#fef3c7', padding: '4px 10px', borderRadius: 6, fontWeight: 'bold', fontSize: 13 }}>รอดำเนินการ</span>;
      case 'IN_PROGRESS':
        return <span style={{ color: '#1d4ed8', background: '#dbeafe', padding: '4px 10px', borderRadius: 6, fontWeight: 'bold', fontSize: 13 }}>กำลังซ่อมแซม</span>;
      case 'COMPLETED':
        return <span style={{ color: '#15803d', background: '#dcfce7', padding: '4px 10px', borderRadius: 6, fontWeight: 'bold', fontSize: 13 }}>ซ่อมเสร็จสิ้น</span>;
      default:
        return status;
    }
  };

  return (
    <div style={{ maxWidth: 1050, margin: '20px auto', fontFamily: 'sans-serif', color: '#1e293b' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24, fontSize: 26, fontWeight: 'bold', color: '#0f172a' }}>
        ⚡ ระบบจัดการค่าไฟ & แจ้งซ่อม (ห้อง {roomId})
      </h1>

      {/* กล่องแสดงมิเตอร์ไฟ Real-time */}
      <div style={{ background: '#0f172a', color: '#ffffff', padding: 24, borderRadius: 12, marginBottom: 24, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 'bold', color: '#f8fafc' }}>🔌 การใช้ไฟฟ้าแบบ Real-time</h2>
          <span style={{ color: '#4ade80', fontSize: 14, fontWeight: 'bold' }}>● Live ({power.timestamp})</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 16 }}>
          <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid #334155' }}>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: 14, fontWeight: '500' }}>กำลังไฟปัจจุบัน</p>
            <h3 style={{ fontSize: 24, margin: '8px 0', color: '#38bdf8', fontWeight: 'bold' }}>{power.power} W</h3>
          </div>
          <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid #334155' }}>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: 14, fontWeight: '500' }}>แรงดัน / กระแส</p>
            <h3 style={{ fontSize: 24, margin: '8px 0', color: '#f8fafc', fontWeight: 'bold' }}>{power.voltage}V / {power.current}A</h3>
          </div>
          <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid #334155' }}>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: 14, fontWeight: '500' }}>หน่วยไฟสะสม</p>
            <h3 style={{ fontSize: 24, margin: '8px 0', color: '#facc15', fontWeight: 'bold' }}>{power.energyUnits} kWh</h3>
          </div>
          <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid #334155' }}>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: 14, fontWeight: '500' }}>ประมาณการค่าไฟ</p>
            <h3 style={{ fontSize: 24, margin: '8px 0', color: '#4ade80', fontWeight: 'bold' }}>{power.estimatedCost} ฿</h3>
          </div>
        </div>
      </div>

      {/* ส่วนแจ้งซ่อม */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        
        {/* แบบฟอร์มแจ้งซ่อม */}
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: 24, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 18, fontSize: 20, color: '#0f172a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
            🛠️ แบบฟอร์มแจ้งซ่อม
          </h3>
          <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: '600', color: '#334155' }}>หมายเลขห้อง</label>
              <input
                type="number"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #94a3b8', color: '#0f172a', fontSize: 15, background: '#f8fafc', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: '600', color: '#334155' }}>อุปกรณ์ที่ชำรุด</label>
              <input
                type="text"
                placeholder="เช่น แอร์ไม่เย็น, ก๊อกน้ำรั่ว"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #94a3b8', color: '#0f172a', fontSize: 15, background: '#ffffff', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: '600', color: '#334155' }}>รายละเอียดอาการ</label>
              <textarea
                placeholder="ระบุอาการเพิ่มเติม..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #94a3b8', color: '#0f172a', fontSize: 15, background: '#ffffff', boxSizing: 'border-box' }}
                required
              />
            </div>
            <button
              type="submit"
              style={{ background: '#2563eb', color: '#ffffff', padding: '12px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 16, marginTop: 4, transition: 'background 0.2s' }}
            >
              ส่งแจ้งซ่อม
            </button>
          </form>
        </div>

        {/* รายการแจ้งซ่อม */}
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: 24, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 18, fontSize: 20, color: '#0f172a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 รายการแจ้งซ่อม
          </h3>
          {requests.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#475569', margin: 0, fontSize: 15, fontWeight: '500' }}>ยังไม่มีประวัติการแจ้งซ่อม</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 420, overflowY: 'auto' }}>
              {requests.map((item) => (
                <div key={item.id} style={{ border: '1px solid #e2e8f0', background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 'bold' }}>ห้อง {item.roomId} - {item.title}</h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <p style={{ margin: '6px 0 12px 0', color: '#334155', fontSize: 14, lineHeight: 1.5 }}>{item.description}</p>
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'IN_PROGRESS')}
                      style={{ fontSize: 12, padding: '5px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: '500' }}
                    >
                      กำลังซ่อม
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'COMPLETED')}
                      style={{ fontSize: 12, padding: '5px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: '500' }}
                    >
                      เสร็จสิ้น
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}