import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import { useEffect } from 'react';
import api from '../api/axiosInstance';

export default function Dashboard() {
  const { user, logout } = useAuth();

//   useEffect(() => {
//   api.get('/notifications').then(res => {
//     console.log('RAW NOTIFICATIONS:', res.data);
//   });
// }, []);

  return (
    <div>
      {/* Navbar */}
      <div style={navStyle}>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f' }}>
          🎓 Smart Campus
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NotificationBell />
          <img src={user?.picture} alt="avatar"
            style={{ borderRadius: '50%', width: 36, height: 36 }} />
          <span style={{ fontSize: 14, color: '#374151' }}>{user?.name}</span>
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 32 }}>
        <h2>Welcome back, {user?.name} 👋</h2>
        <p style={{ color: '#6b7280' }}>Role: <strong>{user?.role}</strong></p>
      </div>
    </div>
  );
}

const navStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 24px', background: 'white',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 30,
};

const logoutBtn = {
  padding: '6px 14px', background: '#1e3a5f', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};