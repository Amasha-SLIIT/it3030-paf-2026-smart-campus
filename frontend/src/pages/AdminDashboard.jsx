import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getAllUsers, updateUserRole } from '../api/userApi';
import { getTickets } from '../api/ticketApi';
import { resourceApi } from '../api/resourceApi';
import NotificationBell from '../components/NotificationBell';
import ResourceCard, { StatusBadge, TypeBadge } from '../components/ResourceCard';
import ResourceDetailModal from '../components/ResourceDetailModal';
import ResourceFormModal from '../components/ResourceFormModal';
import IncidentHeatmap from '../components/IncidentHeatmap';
import { Users, Box, Wrench, BookOpen, BarChart2 } from 'lucide-react';

const ROLES = ['USER', 'ADMIN', 'ACADEMIC_STAFF'];

const roleColors = {
  ADMIN:          { bg: '#fef2f2', color: '#dc2626' },
  ACADEMIC_STAFF: { bg: '#eff6ff', color: '#2563eb' },
  USER:           { bg: '#f0fdf4', color: '#16a34a' },
};

const ticketStatusColors = {
  OPEN:        { bg: '#ffffff', border: '#d1d5db', text: '#374151' },
  IN_PROGRESS: { bg: '#fef9c3', border: '#fde68a', text: '#92400e' },
  RESOLVED:    { bg: '#dcfce7', border: '#bbf7d0', text: '#166534' },
  CLOSED:      { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280' },
  REJECTED:    { bg: '#fee2e2', border: '#fecaca', text: '#991b1b' },
};

const MAIN_TABS = [
  { id: 'users',     label: 'Users',     icon: <Users size={18} /> },
  { id: 'tickets',   label: 'Tickets',   icon: <Wrench size={18} /> },
  { id: 'resources', label: 'Resources', icon: <Box size={18} /> },
  { id: 'bookings',  label: 'Bookings',  icon: <BookOpen size={18} /> },
  { id: 'insights',  label: 'Insights',  icon: <BarChart2 size={18} /> },
];

const RESOURCE_SUB_TABS = [
  { id: 'overview',     label: 'Overview',   icon: '📊' },
  { id: 'list',         label: 'All',        icon: '🏛️' },
  { id: 'create',       label: 'Create New', icon: '➕' },
  { id: 'status',       label: 'Status',     icon: '🔄' },
  { id: 'maintenance',  label: 'Maintenance',icon: '🔧' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { showToast }    = useApp();
  const navigate         = useNavigate();

  const [activeMainTab, setActiveMainTab] = useState('users');
  const [activeResTab,  setActiveResTab]  = useState('overview');

  const [users,     setUsers]     = useState([]);
  const [tickets,   setTickets]   = useState([]);
  const [resources, setResources] = useState([]);
  const [maintDue,  setMaintDue]  = useState([]);

  const [loading,       setLoading]       = useState(true);
  const [updating,      setUpdating]      = useState(null);
  const [search,        setSearch]        = useState('');
  const [editResource,  setEditResource]  = useState(null);   
  const [detailResource,setDetailResource]= useState(null);
  const [formLoading,   setFormLoading]   = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [uRes, tRes, rData, mData] = await Promise.all([
        getAllUsers(),
        getTickets(),
        resourceApi.getAll(),
        resourceApi.getMaintenanceDue(),
      ]);
      setUsers(uRes.data || []);
      const ticketData = tRes.data;
      setTickets(Array.isArray(ticketData) ? ticketData : ticketData?.content || []);
      setResources(Array.isArray(rData) ? rData : []);
      setMaintDue(Array.isArray(mData) ? mData : []);
    } catch (err) {
      console.error('Data load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    if (userId === user?.id) {
      showToast('You cannot change your own role', 'error');
      return;
    }
    setUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('Role updated successfully', 'success');
    } catch {
      showToast('Failed to update role', 'error');
    } finally {
      setUpdating(null);
    }
  };

  // UPDATED: CREATE RESOURCE WITH CLOUDINARY UPLOAD
  const handleResourceCreate = async (data) => {
    const { imageFile, ...resourceData } = data;
    setFormLoading(true);
    try {
      // 1. Create the base resource record
      const created = await resourceApi.create(resourceData);
      let finalResource = created;

      // 2. If a file was selected, upload it to Cloudinary via backend
      if (imageFile) {
        finalResource = await resourceApi.uploadImage(created.id, imageFile);
      }

      setResources(prev => [finalResource, ...prev]);
      showToast('Resource created successfully!', 'success');
      setActiveResTab('list'); 
    } catch (e) {
      showToast(e.message || 'Failed to create resource', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // UPDATED: UPDATE RESOURCE WITH CLOUDINARY UPLOAD
  const handleResourceUpdate = async (data) => {
    if (!editResource) return;
    const { imageFile, ...resourceData } = data;
    setFormLoading(true);
    try {
      // 1. Update text data
      const updated = await resourceApi.update(editResource.id, resourceData);
      let finalResource = updated;

      // 2. If a new image was selected, upload it
      if (imageFile) {
        finalResource = await resourceApi.uploadImage(editResource.id, imageFile);
      }

      setResources(prev => prev.map(r => r.id === finalResource.id ? finalResource : r));
      setEditResource(null);
      showToast('Resource updated successfully!', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to update resource', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleResourceDelete = async (resource) => {
    if (!window.confirm(`Delete "${resource.name}"? This cannot be undone.`)) return;
    try {
      await resourceApi.delete(resource.id);
      setResources(prev => prev.filter(r => r.id !== resource.id));
      showToast('Resource deleted', 'success');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to delete resource', 'error');
    }
  };

  const handleResourceStatus = async (id, status) => {
    try {
      const updated = await resourceApi.updateStatus(id, status);
      setResources(prev => prev.map(r => r.id === updated.id ? updated : r));
      showToast(`Status updated to ${status}`, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleMaintDone = async (id) => {
    try {
      await resourceApi.markMaintenanceDone(id);
      showToast('Maintenance marked done!', 'success');
      loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f' }}>🎓 Smart Campus</span>
          <span style={adminBadge}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/dashboard')} style={navBtn}>User View</button>
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

      <div style={{ padding: '32px 40px' }}>
        <h2 style={{ margin: '0 0 4px', color: '#1e3a5f' }}>Admin Dashboard</h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>Manage users, monitor tickets, and oversee resources.</p>

        <div style={tabContainer}>
          {MAIN_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveMainTab(t.id)}
              style={{ ...mainTabBtn,
                borderBottom: activeMainTab === t.id ? '3px solid #1e3a5f' : '3px solid transparent',
                color: activeMainTab === t.id ? '#1e3a5f' : '#6b7280',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeMainTab === 'users' && (
          <div>
            <div style={statsRow}>
              <StatCard label="Total Users"   value={users.length}                                     color="#1e3a5f" />
              <StatCard label="Admins"        value={users.filter(u => u.role === 'ADMIN').length}     color="#dc2626" />
              <StatCard label="Academic Staff"value={users.filter(u => u.role === 'ACADEMIC_STAFF').length} color="#2563eb" />
              <StatCard label="Regular Users" value={users.filter(u => u.role === 'USER').length}     color="#16a34a" />
            </div>
            <div style={tableCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>User Management</h3>
                <input placeholder="Search name or email…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ padding: '8px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, width: 280 }} />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                    {['User', 'Email', 'Current Role', 'Change Role', 'Joined'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}&size=32`}
                            alt={u.name} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: '#6b7280', fontSize: 13 }}>{u.email}</td>
                      <td style={tdStyle}>
                        <span style={{ ...roleBadge, background: roleColors[u.role]?.bg, color: roleColors[u.role]?.color }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {u.id === user?.id ? (
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>Cannot change own role</span>
                        ) : (
                          <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                            disabled={updating === u.id}
                            style={{ padding: '6px 10px', border: '1.5px solid #e0e0e0', borderRadius: 6, fontSize: 13 }}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: '#9ca3af', fontSize: 12 }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMainTab === 'tickets' && (
          <div>
            <div style={statsRow}>
              <StatCard label="Open"       value={tickets.filter(t => t.status === 'OPEN').length}        color="#dc2626" />
              <StatCard label="In Progress"value={tickets.filter(t => t.status === 'IN_PROGRESS').length} color="#d97706" />
              <StatCard label="Resolved"   value={tickets.filter(t => t.status === 'RESOLVED').length}    color="#16a34a" />
              <StatCard label="Total"      value={tickets.length}                                          color="#1e3a5f" />
            </div>
            <div style={tableCard}>
              <h3 style={{ marginBottom: 16 }}>Maintenance Queue</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                    {['ID', 'Subject', 'Category', 'Priority', 'Status', 'Action'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => {
                    const sc = ticketStatusColors[t.status] || ticketStatusColors.OPEN;
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>#{t.id}</td>
                        <td style={tdStyle}>{t.subject}</td>
                        <td style={{ ...tdStyle, fontSize: 12, color: '#6b7280' }}>
                          {t.category?.replace(/_/g, ' ')}
                        </td>
                        <td style={{ ...tdStyle, color: t.currentPriority === 'HIGH' ? '#dc2626' : '#374151', fontWeight: 600 }}>
                          {t.currentPriority}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ ...statusBadge, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                            {t.status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <button onClick={() => navigate(`/tickets/${t.id}`)} style={viewBtn}>
                            Process
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {tickets.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No tickets</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMainTab === 'resources' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {RESOURCE_SUB_TABS.map(t => (
                <button key={t.id} onClick={() => setActiveResTab(t.id)}
                  style={{
                    padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    background: activeResTab === t.id ? '#1e3a5f' : '#f1f5f9',
                    color: activeResTab === t.id ? 'white' : '#374151',
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {activeResTab === 'overview' && (
              <div style={statsRow}>
                <StatCard label="Total"       value={resources.length}                                          color="#1e3a5f" />
                <StatCard label="Active"      value={resources.filter(r => r.status === 'ACTIVE').length}      color="#16a34a" />
                <StatCard label="Maint. Due" value={maintDue.length}                                          color="#d97706" />
                <StatCard label="Out of Svc" value={resources.filter(r => r.status === 'OUT_OF_SERVICE').length} color="#dc2626" />
              </div>
            )}
            
            {activeResTab === 'create' && (
              <div style={tableCard}>
                <h3 style={{ marginBottom: 20 }}>Create New Resource</h3>
                <ResourceFormModal
                  resource={null}
                  inline={true}
                  onClose={() => setActiveResTab('overview')}
                  onSubmit={handleResourceCreate}
                  loading={formLoading}
                />
              </div>
            )}

            {activeResTab === 'list' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {resources.map(r => (
                  <ResourceCard key={r.id} resource={r} onSelect={setDetailResource}
                    actions={(res) => (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          style={{ flex: 1, padding: '6px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          onClick={e => { e.stopPropagation(); setEditResource(res); }}>
                          ✏️ Edit
                        </button>
                        
                        <button
                          style={{ flex: 1, padding: '6px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          onClick={e => { e.stopPropagation(); handleResourceDelete(res); }}>
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  />
                ))}
                {resources.length === 0 && (
                  <p style={{ color: '#9ca3af', padding: 40 }}>No resources found.</p>
                )}
              </div>
            )}

            {activeResTab === 'status' && (
              <div style={tableCard}>
                <h3 style={{ marginBottom: 16 }}>Update Resource Status</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                      {['Resource', 'Current Status', 'Quick Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={tdStyle}>{r.name}</td>
                        <td style={tdStyle}><StatusBadge status={r.status} /></td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleResourceStatus(r.id, 'ACTIVE')}
                              style={{ ...viewBtn, background: '#16a34a' }}>Active</button>
                            <button onClick={() => handleResourceStatus(r.id, 'UNDER_MAINTENANCE')}
                              style={{ ...viewBtn, background: '#d97706' }}>Maintenance</button>
                            <button onClick={() => handleResourceStatus(r.id, 'OUT_OF_SERVICE')}
                              style={{ ...viewBtn, background: '#dc2626' }}>Out of Svc</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeResTab === 'maintenance' && (
              <div style={tableCard}>
                <h3 style={{ marginBottom: 16 }}>Due for Maintenance</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                      {['Resource', 'Interval', 'Last Service', 'Action'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {maintDue.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={tdStyle}>{r.name}</td>
                        <td style={tdStyle}>{r.maintenanceIntervalDays}d</td>
                        <td style={tdStyle}>{r.lastMaintenanceDate ? new Date(r.lastMaintenanceDate).toLocaleDateString() : 'Never'}</td>
                        <td style={tdStyle}>
                          <button onClick={() => handleMaintDone(r.id)} style={viewBtn}>Mark Done</button>
                        </td>
                      </tr>
                    ))}
                    {maintDue.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#16a34a' }}>
                        ✅ No resources due for maintenance
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {activeMainTab === 'bookings' && (
        <div style={{ padding: '0 40px' }}>
          <button
            onClick={() => navigate('/admin/bookings')}
            style={{ padding: '10px 20px', background: '#1e3a5f', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Open Full Bookings Manager →
          </button>
        </div>
      )}

      {activeMainTab === 'insights' && (
        <div>
          <h3 style={{ margin: '0 0 20px', color: '#1e3a5f' }}>
            📍 Location-Based Incident Heatmap
          </h3>
          <IncidentHeatmap tickets={tickets} resources={resources} />
        </div>
      )}
      </div>
      

      {detailResource && (
        <ResourceDetailModal resource={detailResource} onClose={() => setDetailResource(null)} />
      )}
      
      {editResource && (
        <ResourceFormModal
          resource={editResource}
          onClose={() => setEditResource(null)}
          onSubmit={handleResourceUpdate}
          loading={formLoading}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flex: 1 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

const navStyle    = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 40px', background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.1)', position:'sticky', top:0, zIndex:30 };
const adminBadge  = { background:'#fef2f2', color:'#dc2626', fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:4 };
const navBtn      = { padding:'6px 14px', background:'white', color:'#1e3a5f', border:'1.5px solid #1e3a5f', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 };
const logoutBtn   = { padding:'6px 14px', background:'#1e3a5f', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:12 };
const tabContainer= { display:'flex', gap:24, borderBottom:'1px solid #e5e7eb', marginBottom:24 };
const mainTabBtn  = { background:'none', border:'none', padding:'12px 4px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 };
const statsRow    = { display:'flex', gap:16, marginBottom:24 };
const tableCard   = { background:'white', borderRadius:12, padding:24, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };
const thStyle     = { textAlign:'left', padding:'10px 16px', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' };
const tdStyle     = { padding:'13px 16px', fontSize:13, color:'#111827' };
const roleBadge   = { padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 };
const statusBadge = { padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700 };
const viewBtn     = { padding:'6px 14px', background:'#1e3a5f', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700 };