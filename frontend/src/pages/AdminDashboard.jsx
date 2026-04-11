import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAllUsers, updateUserRole } from '../api/userApi';
import NotificationBell from '../components/NotificationBell';

const ROLES = ['USER', 'ADMIN', 'ACADEMIC_STAFF'];

const roleColors = {
  ADMIN: { bg: '#fef2f2', color: '#dc2626' },
  ACADEMIC_STAFF: { bg: '#eff6ff', color: '#2563eb' },
  USER: { bg: '#f0fdf4', color: '#16a34a' },
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    getAllUsers()
      .then(res => setUsers(res.data))
      .catch(err => console.error('Failed to load users', err))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
      setMessage('Role updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <div style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f' }}>
            🎓 Smart Campus
          </span>
          <span style={adminBadge}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/dashboard')} style={navBtn}>
            User View
          </button>
          <NotificationBell />
          <img src={user?.picture || 'https://ui-avatars.com/api/?name=' + user?.name}
            alt="avatar" style={{ borderRadius: '50%', width: 36, height: 36 }} />
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '32px 40px' }}>
        {/* Header */}
        <h2 style={{ margin: '0 0 4px', color: '#1e3a5f' }}>Admin Dashboard</h2>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>
          Manage users and system roles
        </p>

        {/* Stats row */}
        <div style={statsRow}>
          {[
            { label: 'Total Users', value: users.length, color: '#1e3a5f' },
            { label: 'Admins', value: users.filter(u => u.role === 'ADMIN').length, color: '#dc2626' },
            { label: 'Academic Staff', value: users.filter(u => u.role === 'ACADEMIC_STAFF').length, color: '#2563eb' },
            { label: 'Regular Users', value: users.filter(u => u.role === 'USER').length, color: '#16a34a' },
          ].map(stat => (
            <div key={stat.label} style={statCard}>
              <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* User management table */}
        <div style={tableCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#1e3a5f' }}>User Management</h3>
            <input
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={searchInput}
            />
          </div>

          {message && (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', color: '#16a34a',
              borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              ✅ {message}
            </div>
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading users...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  {['User', 'Email', 'Current Role', 'Change Role', 'Joined'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}&size=32`}
                          alt={u.name}
                          style={{ width: 32, height: 32, borderRadius: '50%' }}
                        />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280', fontSize: 13 }}>{u.email}</td>
                    <td style={tdStyle}>
                      <span style={{
                        ...roleBadge,
                        background: roleColors[u.role]?.bg || '#f3f4f6',
                        color: roleColors[u.role]?.color || '#374151',
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {u.id === user?.id ? (
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>Cannot change own role</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          disabled={updating === u.id}
                          style={selectStyle}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#9ca3af', fontSize: 12 }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    No users found
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const navStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 40px', background: 'white',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 30,
};
const adminBadge = {
  background: '#fef2f2', color: '#dc2626', fontSize: 11,
  fontWeight: 700, padding: '2px 8px', borderRadius: 4,
};
const navBtn = {
  padding: '6px 14px', background: 'white', color: '#1e3a5f',
  border: '1.5px solid #1e3a5f', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const logoutBtn = {
  padding: '6px 14px', background: '#1e3a5f', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const statsRow = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 16, marginBottom: 32,
};
const statCard = {
  background: 'white', borderRadius: 12, padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};
const tableCard = {
  background: 'white', borderRadius: 12, padding: 24,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};
const searchInput = {
  padding: '8px 14px', border: '1.5px solid #e0e0e0',
  borderRadius: 8, fontSize: 14, width: 280, outline: 'none',
};
const thStyle = {
  textAlign: 'left', padding: '10px 16px',
  fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase',
};
const tdStyle = { padding: '12px 16px', fontSize: 14, color: '#111827' };
const roleBadge = {
  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
};
const selectStyle = {
  padding: '6px 10px', border: '1.5px solid #e0e0e0',
  borderRadius: 6, fontSize: 13, cursor: 'pointer', background: 'white',
};