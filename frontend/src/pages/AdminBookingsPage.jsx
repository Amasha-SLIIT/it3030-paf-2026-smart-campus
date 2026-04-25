
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';           
import { toast } from 'react-toastify';           

const STATUS_COLORS = {
  PENDING: '#f59e0b', APPROVED: '#16a34a', REJECTED: '#ef4444', CANCELLED: '#6b7280',
};

export default function AdminBookingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = filter
        ? await api.get('/bookings', { params: { status: filter } })
        : await api.get('/bookings');
      setBookings(res.data);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [filter]);

  const handleDecision = async (id, approved) => {
    let reason = '';
    if (!approved) {
      reason = window.prompt('Enter rejection reason:');
      if (!reason) return;
    }
    try {
      const res = await api.patch(`/bookings/${id}/decision`, { approved, reason });
      setBookings(bookings.map(b => b.id === id ? res.data : b));
      toast.success(approved ? '✅ Booking approved!' : '❌ Booking rejected');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const handleCancel = async (id, bookingUserEmail) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      const res = await api.delete(`/bookings/${id}`, { params: { userEmail: bookingUserEmail } });
      setBookings(bookings.map(b => b.id === id ? res.data : b));
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const stats = [
    { label: 'Total',    value: bookings.length,                                          color: '#1e3a5f' },
    { label: 'Pending',  value: bookings.filter(b => b.status === 'PENDING').length,   color: '#f59e0b' },
    { label: 'Approved', value: bookings.filter(b => b.status === 'APPROVED').length,  color: '#16a34a' },
    { label: 'Rejected', value: bookings.filter(b => b.status === 'REJECTED').length,  color: '#ef4444' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f', cursor: 'pointer' }}
            onClick={() => navigate('/admin/dashboard')}>
            🎓 Smart Campus
          </span>
          <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11,
            fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/admin/dashboard')} style={outlineBtn}>← Admin Dashboard</button>
          <img src={user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=1e3a5f&color=fff`}
            alt="avatar" style={{ borderRadius: '50%', width: 36, height: 36 }} />
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)', padding: '32px 64px' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'white' }}>🔧 Bookings — Admin View</h1>
        <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
          Review and manage all booking requests
        </p>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(s => (
            <button key={s || 'ALL'} onClick={() => setFilter(s)} style={{
              padding: '7px 16px', border: 'none', borderRadius: 7, cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: filter === s ? '#1e3a5f' : 'white',
              color: filter === s ? 'white' : '#6b7280',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {s || 'ALL'}
            </button>
          ))}
        </div>

        {loading && <div style={emptyState}>Loading...</div>}
        {!loading && bookings.length === 0 && <div style={emptyState}>📭 No bookings found.</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bookings.map(b => (
            <div key={b.id} style={{ background: 'white', borderRadius: 12, padding: '18px 22px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1.5px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: 16, color: '#111827' }}>{b.resourceName}</strong>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  color: 'white', background: STATUS_COLORS[b.status] }}>
                  {b.status}
                </span>
              </div>
              <p style={pStyle}>👤 {b.userName} ({b.userEmail})</p>
              <p style={pStyle}>📅 {new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}</p>
              <p style={pStyle}>📝 {b.purpose}</p>
              {b.expectedAttendees && <p style={pStyle}>👥 {b.expectedAttendees} attendees</p>}
              {b.adminReason && <p style={{ ...pStyle, fontStyle: 'italic', color: '#9ca3af' }}>Note: {b.adminReason}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                {b.status === 'PENDING' && (
                  <>
                    <button style={approveBtn} onClick={() => handleDecision(b.id, true)}>✓ Approve</button>
                    <button style={rejectBtnStyle} onClick={() => handleDecision(b.id, false)}>✗ Reject</button>
                  </>
                )}
                {b.status === 'APPROVED' && (
                  <button style={rejectBtnStyle} onClick={() => handleCancel(b.id, b.userEmail)}>Cancel Booking</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const navStyle     = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 40px', background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.1)', position:'sticky', top:0, zIndex:30 };
const pStyle       = { margin:'4px 0', fontSize:14, color:'#4b5563', textAlign:'left' };
const emptyState   = { textAlign:'center', color:'#9ca3af', padding:40, background:'white', borderRadius:12, fontSize:15 };
const approveBtn   = { padding:'8px 18px', background:'#16a34a', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 };
const rejectBtnStyle = { padding:'8px 18px', background:'#dc2626', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 };
const outlineBtn   = { padding:'6px 14px', background:'white', color:'#1e3a5f', border:'1.5px solid #1e3a5f', borderRadius:6, cursor:'pointer', fontSize:13 };
const logoutBtn    = { padding:'6px 14px', background:'#1e3a5f', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:13 };