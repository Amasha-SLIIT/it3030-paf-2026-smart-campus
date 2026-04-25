import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Navbar */}
      <div style={navStyle}>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f' }}>
          🎓 Smart Campus
        </span>
      </div>

      {/* Hero */}
      <div style={heroStyle}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: 'white' }}>
          Smart Campus Operations Hub
        </h1>
        <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
          Manage facility bookings, report maintenance issues, and stay updated.
        </p>
      </div>

      {/* Role selection */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <h2 style={{ textAlign: 'center', color: '#1e3a5f', marginBottom: 8, fontSize: 22 }}>
          Who are you?
        </h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 36, fontSize: 15 }}>
          Select your role to continue
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          
          {/* Student */}
          <div style={roleCard} onClick={() => navigate('/student')}>
            <div style={iconBox('#eff6ff')}>🎒</div>
            <h3 style={roleTitle}>Student</h3>
            <p style={roleDesc}>Book lecture halls, labs, and meeting rooms for your academic activities.</p>
            <button style={roleBtn('#2563eb')}>Continue as Student →</button>
          </div>

          {/* Academic Staff */}
          <div style={roleCard} onClick={() => navigate('/staff')}>
            <div style={iconBox('#f0fdf4')}>👩‍🏫</div>
            <h3 style={roleTitle}>Academic Staff</h3>
            <p style={roleDesc}>Reserve resources for lectures, research sessions, and faculty meetings.</p>
            <button style={roleBtn('#16a34a')}>Continue as Staff →</button>
          </div>

          {/* Admin */}
          <div style={roleCard} onClick={() => navigate('/admin')}>
            <div style={iconBox('#fef2f2')}>🔧</div>
            <h3 style={roleTitle}>Admin</h3>
            <p style={roleDesc}>Review and manage all booking requests, approve or reject submissions.</p>
            <button style={roleBtn('#dc2626')}>Continue as Admin →</button>
          </div>

        </div>
      </div>
    </div>
  );
}

const navStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 40px', background: 'white',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 30,
};
const heroStyle = {
  background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)',
  padding: '56px 64px',
};
const roleCard = {
  background: 'white', borderRadius: 16, padding: '32px 24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1.5px solid #e5e7eb',
  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
  textAlign: 'center', transition: 'transform 0.15s, box-shadow 0.15s',
};
const roleTitle = { margin: '16px 0 8px', fontSize: 18, color: '#111827', fontWeight: 700 };
const roleDesc = { margin: '0 0 24px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 };
const iconBox = (bg) => ({
  width: 64, height: 64, borderRadius: 16, background: bg,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
});
const roleBtn = (bg) => ({
  padding: '10px 20px', background: bg, color: 'white',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  width: '100%',
});