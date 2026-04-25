

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTickets, deleteTicket } from '../api/ticketApi';
import { Plus, Trash2, Eye, Search } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import { toast } from 'react-toastify';

const STATUS_CONFIG = {
  OPEN:        { label: 'Open',        bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
  IN_PROGRESS: { label: 'In Progress', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  RESOLVED:    { label: 'Resolved',    bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  CLOSED:      { label: 'Closed',      bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  REJECTED:    { label: 'Rejected',    bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

const PRIORITY_COLORS = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' };

export default function MyTicketsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tickets,      setTickets]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [deleting,     setDeleting]     = useState(null);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const isStaff = user?.role === 'ACADEMIC_STAFF';

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      
      const res = await getTickets();
      const data = res.data;
      setTickets(Array.isArray(data) ? data : data?.content || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
      toast.success('Ticket deleted');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Cannot delete this ticket');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = tickets.filter(t => {
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchSearch = !search
      || t.subject?.toLowerCase().includes(search.toLowerCase())
      || String(t.id).includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      
      <div style={navStyle}>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f' }}>🎓 Smart Campus</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user?.role === 'ADMIN' && (
            <button onClick={() => navigate('/admin/dashboard')} style={adminBtn}>Admin Panel</button>
          )}
          <NotificationBell />
          <img
            src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=1e3a5f&color=fff`}
            alt="avatar" style={{ borderRadius: '50%', width: 36, height: 36 }} />
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{user?.role}</div>
          </div>
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Hero banner */}
      <div style={heroBanner}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'white' }}>
              {isStaff ? '👷 Assigned Tickets' : '🔧 My Maintenance Tickets'}
            </h1>
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
              {isStaff ? 'Tasks assigned to you by admin' : 'Track the status of your submitted tickets'}
            </p>
          </div>
          {!isStaff && (
            <button onClick={() => navigate('/raise-ticket')} style={newTicketBtn}>
              <Plus size={16} /> New Ticket
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '28px auto', padding: '0 24px 48px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={searchBox}>
            <Search size={14} color="#9ca3af" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by subject or ticket ID..."
              style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', flex: 1 }} />
          </div>
          {['ALL', ...Object.keys(STATUS_CONFIG)].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ ...filterChip, ...(filterStatus === s ? activeChip : {}) }}>
              {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={statsRow}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ ...statCard, borderTop: `3px solid ${cfg.color}` }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: cfg.color }}>
                {tickets.filter(t => t.status === key).length}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{cfg.label}</div>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={emptyState}>
            <div style={spinner} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={emptyState}>
            <span style={{ fontSize: 48 }}>🔧</span>
            <p style={{ color: '#9ca3af', marginTop: 12 }}>No tickets found</p>
            {!isStaff && (
              <button onClick={() => navigate('/raise-ticket')} style={newTicketBtn}>
                Submit your first ticket
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(ticket => {
              const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
              const pc  = PRIORITY_COLORS[ticket.currentPriority] || '#6b7280';
              return (
                <div key={ticket.id} style={ticketCard}>
                  {/* Status stripe */}
                  <div style={{ width: 4, background: cfg.color, flexShrink: 0, borderRadius: '4px 0 0 4px' }} />
                  <div style={{ flex: 1, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>#{ticket.id}</span>
                          <span style={{ ...badge, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            {cfg.label}
                          </span>
                          <span style={{ ...badge, background: `${pc}15`, color: pc, border: `1px solid ${pc}40` }}>
                            {ticket.currentPriority}
                          </span>
                          {ticket.currentPriority !== ticket.requestedPriority && (
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>
                              (requested: {ticket.requestedPriority})
                            </span>
                          )}
                        </div>

                        <h3 style={{ margin: '6px 0 4px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
                          {ticket.subject}
                        </h3>

                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          {ticket.category && (
                            <span style={meta}>{ticket.category.replace(/_/g, ' ')}</span>
                          )}
                          {ticket.location && (
                            <span style={meta}>📍 {ticket.location}</span>
                          )}
                          {ticket.assignedTo && (
                            <span style={{ ...meta, color: '#2563eb' }}>
                              👷 {ticket.assignedTo.name}
                            </span>
                          )}
                          <span style={meta}>
                            🕐 {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {ticket.status === 'REJECTED' && ticket.rejectionReason && (
                          <div style={rejectedNote}>❌ {ticket.rejectionReason}</div>
                        )}
                        {ticket.status === 'CLOSED' && ticket.resolutionNotes && (
                          <div style={resolvedNote}>✅ {ticket.resolutionNotes}</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => navigate(`/tickets/${ticket.id}`)} style={iconBtn}>
                          <Eye size={14} /> View
                        </button>
                        {ticket.status === 'OPEN' && !isStaff && (
                          <button
                            onClick={() => handleDelete(ticket.id)}
                            disabled={deleting === ticket.id}
                            style={{ ...iconBtn, color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const navStyle     = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 40px', background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.1)', position:'sticky', top:0, zIndex:30 };
const heroBanner   = { background:'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)', padding:'28px 48px' };
const newTicketBtn = { display:'flex', alignItems:'center', gap:6, background:'white', color:'#1e3a5f', border:'none', borderRadius:8, padding:'9px 18px', cursor:'pointer', fontSize:13, fontWeight:700 };
const adminBtn     = { padding:'6px 14px', background:'#dc2626', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 };
const logoutBtn    = { padding:'6px 14px', background:'#1e3a5f', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:12 };
const searchBox    = { display:'flex', alignItems:'center', gap:8, background:'white', border:'1.5px solid #e0e0e0', borderRadius:8, padding:'7px 12px', flex:1, minWidth:200, maxWidth:320 };
const filterChip   = { padding:'5px 12px', borderRadius:20, border:'1.5px solid #e0e0e0', background:'white', cursor:'pointer', fontSize:11, fontWeight:600, color:'#6b7280' };
const activeChip   = { background:'#1e3a5f', color:'white', borderColor:'#1e3a5f' };
const statsRow     = { display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10, marginBottom:20 };
const statCard     = { background:'white', borderRadius:10, padding:'12px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', textAlign:'center' };
const ticketCard   = { display:'flex', background:'white', borderRadius:12, boxShadow:'0 1px 6px rgba(0,0,0,0.06)', overflow:'hidden', border:'1.5px solid #f0f0f0' };
const badge        = { padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700 };
const meta         = { fontSize:12, color:'#6b7280' };
const iconBtn      = { display:'flex', alignItems:'center', gap:4, padding:'6px 10px', border:'1.5px solid #e0e0e0', borderRadius:6, background:'white', cursor:'pointer', fontSize:12, color:'#374151' };
const emptyState   = { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:80, gap:8 };
const spinner      = { width:32, height:32, border:'3px solid #e0e0e0', borderTop:'3px solid #1e3a5f', borderRadius:'50%', animation:'spin 0.8s linear infinite' };
const rejectedNote = { marginTop:6, fontSize:11, color:'#991b1b', background:'#fef2f2', padding:'5px 8px', borderRadius:6 };
const resolvedNote = { marginTop:6, fontSize:11, color:'#166534', background:'#dcfce7', padding:'5px 8px', borderRadius:6 };