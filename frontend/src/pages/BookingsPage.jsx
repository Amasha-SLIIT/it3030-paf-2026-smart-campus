import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BookingForm from '../components/BookingForm';
import MyBookings from '../components/MyBookings';

export default function BookingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('my');
  const [preSelected, setPreSelected] = useState(null);

  useEffect(() => {
    const resourceId = searchParams.get('resourceId');
    const resourceName = searchParams.get('resourceName');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    if (resourceId && start) {
      setPreSelected({
        resource: { id: Number(resourceId), name: resourceName },
        slot: { start, end }
      });
      setActiveTab('new');
    }
  }, [searchParams]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      <div style={navStyle}>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f', cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}>
          🎓 Smart Campus
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=1e3a5f&color=fff`}
              alt="avatar"
              style={{ borderRadius: '50%', width: 36, height: 36 }}
            />
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={heroBanner}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'white' }}>
          📅 Booking Management
        </h1>
        <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
          {user?.role === 'ACADEMIC_STAFF'
            ? 'Reserve lecture halls, labs, meeting rooms and equipment'
            : 'Book labs and meeting rooms for your activities'}
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <div style={tabBar}>
          <button style={activeTab === 'my' ? activeTabStyle : inactiveTabStyle}
            onClick={() => setActiveTab('my')}>
            My Bookings
          </button>
          <button style={activeTab === 'new' ? activeTabStyle : inactiveTabStyle}
            onClick={() => { setPreSelected(null); setActiveTab('new'); }}>
            + New Booking
          </button>
        </div>

        {activeTab === 'my' && <MyBookings userEmail={user?.email} />}
        {activeTab === 'new' && (
          <BookingForm
            userEmail={user?.email}
            userName={user?.name}
            userRole={user?.role}
            preSelected={preSelected}
            onSuccess={() => setActiveTab('my')}
          />
        )}
      </div>
    </div>
  );
}

const navStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 40px', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 30 };
const heroBanner = { background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)', padding: '32px 64px' };
const tabBar = { display: 'flex', gap: 4, marginBottom: 24, background: 'white', borderRadius: 10, padding: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', width: 'fit-content' };
const activeTabStyle = { padding: '8px 20px', border: 'none', background: '#1e3a5f', color: 'white', fontSize: 14, fontWeight: 600, borderRadius: 7, cursor: 'pointer' };
const inactiveTabStyle = { padding: '8px 20px', border: 'none', background: 'none', color: '#6b7280', fontSize: 14, fontWeight: 600, borderRadius: 7, cursor: 'pointer' };
const logoutBtn = { padding: '6px 14px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };