import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { resourceApi } from '../api/resourceApi'; 
import { useApp } from '../context/AppContext'; 
import SearchFilterBar from '../components/SearchFilterBar'; 
import ResourceCard from '../components/ResourceCard'; 
import ResourceAvailabilityModal from '../components/ResourceAvailabilityModal'; 
import QRCodeDisplay from '../components/QRCodeDisplay'; 
import NotificationBell from '../components/NotificationBell';
import { Bell, Calendar, Wrench, BookOpen, ChevronRight, ClipboardList } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { showToast } = useApp(); 
  const navigate = useNavigate();

 
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availResource, setAvailResource] = useState(null);
  const [qrResource, setQrResource] = useState(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  
  const fetchResources = async (filters = {}) => {
    setLoading(true);
    try {
      const data = await resourceApi.getAll(filters);
      setResources(data);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchResources(); 
  }, []);

  const quickLinks = [
    { icon: <Calendar size={22} color="#2563eb" />, label: 'My Bookings', desc: 'View and manage your room & equipment bookings', color: '#eff6ff', border: '#bfdbfe', route: '/bookings' },
    { icon: <Wrench size={22} color="#d97706" />, label: 'Raise a Ticket', desc: 'Report faults and technical issues', color: '#fffbeb', border: '#fde68a', route: '/raise-ticket' },
    { icon: <ClipboardList size={22} color="#16a34a" />, label: user?.role === 'ACADEMIC_STAFF' ? 'Tickets' : 'My Tickets', desc: user?.role === 'ACADEMIC_STAFF' ? 'Manage tasks assigned to you' : 'Track progress of your reports', color: '#f0fdf4', border: '#bbf7d0', route: '/tickets' },
    { icon: <Bell size={22} color="#7c3aed" />, label: 'Notifications', desc: 'View all your alerts and updates', color: '#f5f3ff', border: '#ddd6fe', route: '/notifications' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      
      <div style={navStyle}>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f' }}>🎓 Smart Campus</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user?.role === 'ADMIN' && <button onClick={() => navigate('/admin/dashboard')} style={adminBtn}>Admin Panel</button>}
          <NotificationBell />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=1e3a5f&color=fff`} alt="avatar" style={{ borderRadius: '50%', width: 36, height: 36 }} />
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={heroBanner}>
        <div style={{ maxWidth: 700 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'white' }}>{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>Welcome to the Smart Campus Operations Hub.</p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#374151', fontSize: 16, fontWeight: 600 }}>Quick Access</h3>
        <div style={gridStyle}>
          {quickLinks.map((item) => (
            <div key={item.label} onClick={() => item.route && navigate(item.route)} style={{ ...cardStyle, background: item.color, border: `1.5px solid ${item.border}`, cursor: item.route ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={iconBox}>{item.icon}</div>
                {item.route && <ChevronRight size={16} color="#9ca3af" />}
              </div>
              <h4 style={{ margin: '12px 0 4px', fontSize: 15, color: '#111827' }}>{item.label}</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        
        <div style={{ marginTop: 40, marginBottom: 40 }}>
          <h3 style={{ margin: '0 0 16px', color: '#374151', fontSize: 16, fontWeight: 600 }}>Campus Resources</h3>
          <div style={{ marginBottom: 24 }}>
             <SearchFilterBar onSearch={fetchResources} loading={loading} />
          </div>
          {loading ? <div className="spinner" /> : (
            <div className="resource-grid">
              {resources.map(r => (
                <ResourceCard key={r.id} resource={r} onSelect={setAvailResource}
                  actions={(resource) => (
                    <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setAvailResource(resource)}>📅 Availability</button>
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setQrResource(resource)}>🔲 QR Code</button>
                    </div>
                  )}
                />
              ))}
            </div>
          )}
        </div>

        
        <div style={infoRow}>
          <div style={infoCard}>
            <h4 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: 15 }}>📋 How it works</h4>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#4b5563', fontSize: 13, lineHeight: 2 }}>
              <li>Browse available resources and make a booking request</li>
              <li>Admin reviews and approves or rejects your request</li>
              <li>Report maintenance issues with photo evidence</li>
            </ul>
          </div>
          <div style={infoCard}>
             <h4 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: 15 }}>🏫 Campus Overview</h4>
             <p style={{ fontSize: 13, color: '#6b7280' }}>Use the resource grid above to find specific labs or equipment.</p>
          </div>
        </div>
      </div>

      {availResource && <ResourceAvailabilityModal resource={availResource} onClose={() => setAvailResource(null)} />}
      {qrResource && <QRCodeDisplay resource={qrResource} onClose={() => setQrResource(null)} />}
    </div>
  );
}


const navStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 40px', background: 'white',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 30,
};
const heroBanner = {
  background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)',
  padding: '40px 64px', marginBottom: 0,
};
const gridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 16, marginBottom: 32,
};
const cardStyle = {
  borderRadius: 12, padding: '20px', transition: 'transform 0.15s, box-shadow 0.15s',
};
const iconBox = {
  width: 44, height: 44, borderRadius: 10, background: 'white',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};
const infoRow = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
};
const infoCard = {
  background: 'white', borderRadius: 12, padding: 24,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};
const adminBtn = {
  padding: '6px 14px', background: '#dc2626', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
const logoutBtn = {
  padding: '6px 14px', background: '#1e3a5f', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};