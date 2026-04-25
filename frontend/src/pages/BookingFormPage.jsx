import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BookingForm from '../components/BookingForm';
import NotificationBell from '../components/NotificationBell';

export default function BookingFormPage() {
  const { user, logout } = useAuth(); // ← fixed: removed the broken ternary
  const navigate  = useNavigate();
  const location  = useLocation();

  const preSelected = location.state?.preSelected || null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <div style={navStyle}>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f', cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}>🎓 Smart Campus</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NotificationBell />
          <img
            src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=1e3a5f&color=fff`}
            alt="avatar" style={{ borderRadius: '50%', width: 36, height: 36 }} />
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '24px auto', padding: '0 24px' }}>
        <button onClick={() => navigate(-1)} style={backBtn}>← Back</button>
        <h2 style={{ margin: '0 0 20px', color: '#1e3a5f' }}>📅 Book a Resource</h2>
        <BookingForm
          userEmail={user?.email}
          userName={user?.name}
          userRole={user?.role}
          preSelected={preSelected}
          onSuccess={() => navigate('/dashboard')}
        />
      </div>
    </div>
  );
}

const navStyle  = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 40px', background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.1)', position:'sticky', top:0, zIndex:30 };
const logoutBtn = { padding:'6px 14px', background:'#1e3a5f', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:13 };
const backBtn   = { display:'flex', alignItems:'center', gap:6, background:'white', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, color:'#374151', marginBottom:20 };