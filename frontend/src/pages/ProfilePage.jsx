import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, Mail, Shield, Trash2, LogOut } from 'lucide-react';
import api from '../api/axiosInstance';
import NotificationBell from '../components/NotificationBell';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      logout();
    } catch (err) {
      alert('Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  const roleColors = {
    ADMIN: { bg: '#fef2f2', color: '#dc2626' },
    ACADEMIC_STAFF: { bg: '#eff6ff', color: '#2563eb' },
    USER: { bg: '#f0fdf4', color: '#16a34a' },
  };

  const roleInfo = roleColors[user?.role] || roleColors.USER;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Navbar */}
      <div style={navStyle}>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f' }}>
          🎓 Smart Campus
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NotificationBell />
          <button onClick={logout} style={logoutBtn}>
            <LogOut size={14} style={{ marginRight: 6 }} />
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>

        {/* Back button */}
        <button onClick={() => navigate(-1)} style={backBtn}>
          <ArrowLeft size={15} /> Back
        </button>

        <h2 style={{ margin: '12px 0 24px', color: '#1e3a5f' }}>My Profile</h2>

        {/* Profile card */}
        <div style={sectionCard}>
          <div style={profileHeader}>
            <img
              src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}`}
              alt="avatar"
              onClick={() => navigate('/profile')}
              style={{ borderRadius: '50%', width: 36, height: 36, cursor: 'pointer' }}
              title="View Profile"
            />
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 20, color: '#111827' }}>
                {user?.name}
              </h3>
              <span style={{
                ...roleBadge,
                background: roleInfo.bg,
                color: roleInfo.color,
              }}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Account details */}
        <div style={sectionCard}>
          <h4 style={sectionTitle}>Account Details</h4>

          <div style={detailRow}>
            <div style={detailIcon}><User size={16} color="#6b7280" /></div>
            <div>
              <div style={detailLabel}>Full Name</div>
              <div style={detailValue}>{user?.name}</div>
            </div>
          </div>

          <div style={dividerLine} />

          <div style={detailRow}>
            <div style={detailIcon}><Mail size={16} color="#6b7280" /></div>
            <div>
              <div style={detailLabel}>Email Address</div>
              <div style={detailValue}>{user?.email}</div>
            </div>
          </div>

          <div style={dividerLine} />

          <div style={detailRow}>
            <div style={detailIcon}><Shield size={16} color="#6b7280" /></div>
            <div>
              <div style={detailLabel}>Role</div>
              <div style={detailValue}>{user?.role}</div>
            </div>
          </div>
        </div>

        {/* Login method */}
        <div style={sectionCard}>
          <h4 style={sectionTitle}>Login Method</h4>
          <div style={detailRow}>
            <div style={detailIcon}>
              {user?.googleId ? (
                <img
                  src="https://developers.google.com/identity/images/g-logo.png"
                  alt="Google" style={{ width: 16 }} />
              ) : (
                <Mail size={16} color="#6b7280" />
              )}
            </div>
            <div>
              <div style={detailLabel}>Signed in with</div>
              <div style={detailValue}>
                {user?.picture && !user?.password
                  ? 'Google Account'
                  : 'Email & Password'}
              </div>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ ...sectionCard, border: '1.5px solid #fecaca' }}>
          <h4 style={{ ...sectionTitle, color: '#dc2626' }}>
            <Trash2 size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Danger Zone
          </h4>
          <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
            Permanently delete your account and all your data including
            notifications and bookings. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={deleteOutlineBtn}>
              Delete My Account
            </button>
          ) : (
            <div style={confirmBox}>
              <p style={{ margin: '0 0 6px', fontWeight: 700,
                color: '#dc2626', fontSize: 14 }}>
                ⚠️ Are you absolutely sure?
              </p>
              <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 13 }}>
                This will permanently delete your account. You cannot undo this.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={confirmDeleteBtn}>
                  {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={cancelBtn}>
                  Cancel
                </button>
              </div>
            </div>
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
const logoutBtn = {
  display: 'flex', alignItems: 'center',
  padding: '6px 14px', background: '#1e3a5f', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const backBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'none', border: 'none', color: '#6b7280',
  cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 4,
};
const profileHeader = {
  display: 'flex', alignItems: 'center', gap: 20,
};
const avatarStyle = {
  width: 72, height: 72, borderRadius: '50%',
  border: '3px solid #e5e7eb',
};
const roleBadge = {
  display: 'inline-block', padding: '3px 12px',
  borderRadius: 20, fontSize: 12, fontWeight: 700,
};
const sectionCard = {
  background: 'white', borderRadius: 12, padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16,
};
const sectionTitle = {
  margin: '0 0 16px', fontSize: 14, fontWeight: 700,
  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em',
};
const detailRow = {
  display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0',
};
const detailIcon = {
  width: 32, height: 32, borderRadius: 8, background: '#f8fafc',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};
const detailLabel = { fontSize: 12, color: '#9ca3af', marginBottom: 2 };
const detailValue = { fontSize: 14, color: '#111827', fontWeight: 500 };
const dividerLine = { height: 1, background: '#f3f4f6', margin: '4px 0' };
const confirmBox = {
  background: '#fef2f2', borderRadius: 8, padding: 16,
};
const deleteOutlineBtn = {
  padding: '8px 18px', background: 'white', color: '#dc2626',
  border: '1.5px solid #dc2626', borderRadius: 8,
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
const confirmDeleteBtn = {
  padding: '8px 18px', background: '#dc2626', color: 'white',
  border: 'none', borderRadius: 8, cursor: 'pointer',
  fontSize: 13, fontWeight: 600,
};
const cancelBtn = {
  padding: '8px 18px', background: 'white', color: '#374151',
  border: '1.5px solid #e0e0e0', borderRadius: 8,
  cursor: 'pointer', fontSize: 13,
};