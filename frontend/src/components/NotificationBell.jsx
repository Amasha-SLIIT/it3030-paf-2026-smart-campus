import { useState } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const typeColors = {
  BOOKING_APPROVED: '#16a34a',
  BOOKING_REJECTED: '#dc2626',
  BOOKING_CANCELLED: '#f59e0b',
  TICKET_STATUS_CHANGED: '#2563eb',
  TICKET_COMMENT_ADDED: '#7c3aed',
  TICKET_ASSIGNED: '#0891b2',
  GENERAL: '#6b7280',
};

const typeIcons = {
  BOOKING_APPROVED: '✅',
  BOOKING_REJECTED: '❌',
  BOOKING_CANCELLED: '⚠️',
  TICKET_STATUS_CHANGED: '🔄',
  TICKET_COMMENT_ADDED: '💬',
  TICKET_ASSIGNED: '👤',
  GENERAL: '🔔',
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

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
  } = useNotifications();

 

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button onClick={() => setOpen(!open)} style={styles.bellBtn}>
        <Bell size={22} color="#374151" />
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div style={styles.backdrop} onClick={() => setOpen(false)} />

          <div style={styles.panel}>
            {/* Header */}
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>
                Notifications {unreadCount > 0 && <span style={styles.countBadge}>{unreadCount}</span>}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllAsRead} style={styles.iconBtn} title="Mark all as read">
                    <CheckCheck size={16} />
                  </button>
                )}
                <button onClick={() => setOpen(false)} style={styles.iconBtn}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={styles.list}>
              {loading && <div style={styles.empty}>Loading...</div>}
              {!loading && notifications.length === 0 && (
                <div style={styles.empty}>
                  <Bell size={32} color="#d1d5db" />
                  <p style={{ color: '#9ca3af', marginTop: 8 }}>No notifications yet</p>
                </div>
              )}
              {notifications.map((notif) => {
                console.log('notif:', notif);
                return(
                <div
                  key={notif.id}
                  style={{
                    ...styles.item,
                    background: notif.read ? 'white' : '#eff6ff',
                    borderLeft: `4px solid ${typeColors[notif.type] || '#6b7280'}`,
                  }}
                >
                  <div style={styles.itemTop}>
                    <span style={styles.itemIcon}>{typeIcons[notif.type] || '🔔'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={styles.itemTitle}>{notif.title}</div>
                      <div style={styles.itemMsg}>{notif.message}</div>
                      <div style={styles.itemTime}>{timeAgo(notif.createdAt)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {!notif.read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          style={styles.actionBtn}
                          title="Mark as read"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif.id)}
                        style={{ ...styles.actionBtn, color: '#ef4444' }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  bellBtn: {
    position: 'relative', background: 'none', border: 'none',
    cursor: 'pointer', padding: 8, borderRadius: 8,
    display: 'flex', alignItems: 'center',
  },
  badge: {
    position: 'absolute', top: 2, right: 2,
    background: '#ef4444', color: 'white',
    borderRadius: 10, fontSize: 10, fontWeight: 700,
    minWidth: 16, height: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 3px',
  },
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 40,
  },
  panel: {
    position: 'absolute', right: 0, top: 44,
    width: 360, maxHeight: 480,
    background: 'white', borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    zIndex: 50, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid #f3f4f6',
  },
  panelTitle: { fontWeight: 700, fontSize: 15, color: '#111827' },
  countBadge: {
    background: '#ef4444', color: 'white',
    borderRadius: 10, fontSize: 11, fontWeight: 700,
    padding: '1px 6px', marginLeft: 6,
  },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 4, borderRadius: 6, color: '#6b7280',
    display: 'flex', alignItems: 'center',
  },
  list: { overflowY: 'auto', flex: 1 },
  empty: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 40, color: '#9ca3af',
  },
  item: {
    padding: '12px 16px', borderBottom: '1px solid #f9fafb',
    transition: 'background 0.2s',
  },
  itemTop: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  itemIcon: { fontSize: 18, marginTop: 1 },
  itemTitle: { fontWeight: 600, fontSize: 13, color: '#111827' },
  itemMsg: { fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 },
  itemTime: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  actionBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 3, borderRadius: 4, color: '#6b7280',
    display: 'flex', alignItems: 'center',
  },
};