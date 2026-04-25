import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Check, CheckCheck, Trash2, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBell from '../components/NotificationBell';

const typeColors = {
  BOOKING_APPROVED: '#16a34a', BOOKING_REJECTED: '#dc2626',
  BOOKING_CANCELLED: '#f59e0b', TICKET_STATUS_CHANGED: '#2563eb',
  TICKET_COMMENT_ADDED: '#7c3aed', TICKET_ASSIGNED: '#0891b2', GENERAL: '#6b7280',
};
const typeIcons = {
  BOOKING_APPROVED: '✅', BOOKING_REJECTED: '❌', BOOKING_CANCELLED: '⚠️',
  TICKET_STATUS_CHANGED: '🔄', TICKET_COMMENT_ADDED: '💬',
  TICKET_ASSIGNED: '👤', GENERAL: '🔔',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const FILTERS = ['ALL', 'UNREAD', 'BOOKING_APPROVED', 'BOOKING_REJECTED',
  'TICKET_STATUS_CHANGED', 'TICKET_COMMENT_ADDED'];

export default function NotificationsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL');
  const { notifications, unreadCount, loading,
    handleMarkAsRead, handleMarkAllAsRead, handleDelete } = useNotifications();

  const filtered = notifications.filter(n => {
    if (filter === 'ALL') return true;
    if (filter === 'UNREAD') return !n.read;
    return n.type === filter;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <div style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f' }}>
            🎓 Smart Campus
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NotificationBell />
                  <img
          src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}`}
          alt="avatar"
          onClick={() => navigate('/profile')}
          style={{ borderRadius: '50%', width: 36, height: 36, cursor: 'pointer' }}
          title="View Profile"
        />
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button onClick={() => navigate(-1)} style={backBtn}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, color: '#1e3a5f', fontSize: 24 }}>
              🔔 Notifications
            </h2>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} style={markAllBtn}>
              <CheckCheck size={15} /> Mark all as read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={filterRow}>
          <Filter size={14} color="#6b7280" />
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...filterBtn, ...(filter === f ? activeFilter : {}) }}>
              {f === 'ALL' ? 'All' : f === 'UNREAD' ? `Unread (${unreadCount})` :
                f.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div style={listCard}>
          {loading && (
            <div style={emptyState}>
              <div style={spinnerStyle} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={emptyState}>
              <Bell size={48} color="#d1d5db" />
              <p style={{ color: '#9ca3af', marginTop: 12 }}>No notifications here</p>
            </div>
          )}
          {filtered.map((notif, i) => (
            <div key={notif.id} style={{
              ...itemStyle,
              background: notif.read ? 'white' : '#eff6ff',
              borderLeft: `4px solid ${typeColors[notif.type] || '#6b7280'}`,
              borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}>
              <span style={{ fontSize: 24 }}>{typeIcons[notif.type] || '🔔'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
                    {notif.title}
                    {!notif.read && <span style={unreadDot} />}
                  </span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{timeAgo(notif.createdAt)}</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#4b5563', lineHeight: 1.5 }}>
                  {notif.message}
                </p>
                {notif.referenceType && (
                  <span style={refBadge}>{notif.referenceType}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {!notif.read && (
                  <button onClick={() => handleMarkAsRead(notif.id)} style={actionBtn} title="Mark as read">
                    <Check size={14} />
                  </button>
                )}
                <button onClick={() => handleDelete(notif.id)}
                  style={{ ...actionBtn, color: '#ef4444' }} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
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
  padding: '6px 14px', background: '#1e3a5f', color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const backBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'none', border: 'none', color: '#6b7280',
  cursor: 'pointer', fontSize: 14, marginBottom: 8, padding: 0,
};
const markAllBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', background: '#1e3a5f', color: 'white',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
const filterRow = {
  display: 'flex', gap: 8, alignItems: 'center',
  marginBottom: 16, flexWrap: 'wrap',
};
const filterBtn = {
  padding: '6px 14px', border: '1.5px solid #e0e0e0',
  borderRadius: 20, background: 'white', cursor: 'pointer',
  fontSize: 12, fontWeight: 600, color: '#6b7280',
};
const activeFilter = {
  background: '#1e3a5f', color: 'white', borderColor: '#1e3a5f',
};
const listCard = {
  background: 'white', borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
};
const emptyState = {
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', padding: 60,
};
const spinnerStyle = {
  width: 36, height: 36, border: '3px solid #e0e0e0',
  borderTop: '3px solid #1e3a5f', borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};
const itemStyle = {
  display: 'flex', gap: 16, padding: '16px 20px', alignItems: 'flex-start',
};
const unreadDot = {
  display: 'inline-block', width: 8, height: 8,
  background: '#2563eb', borderRadius: '50%', marginLeft: 8, verticalAlign: 'middle',
};
const refBadge = {
  display: 'inline-block', marginTop: 6,
  padding: '2px 8px', background: '#f3f4f6',
  borderRadius: 4, fontSize: 11, color: '#6b7280', fontWeight: 600,
};
const actionBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: 4, borderRadius: 4, color: '#9ca3af',
  display: 'flex', alignItems: 'center',
};