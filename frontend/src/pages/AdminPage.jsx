import { useState, useEffect, useRef } from 'react';

// Resolve a relative image path returned by the API to a full URL
const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;          // already absolute
  const base = import.meta.env.VITE_API_URL || '';  // e.g. http://localhost:8080
  return `${base}${url}`;
};
import { resourceApi } from '../api/resourceApi';
import { useApp } from '../context/AppContext';
import SearchFilterBar from '../components/SearchFilterBar';
import ResourceCard, { StatusBadge, TypeBadge } from '../components/ResourceCard';
import ResourceDetailModal from '../components/ResourceDetailModal';

// ─── Constants ─────────────────────────────────────────────
const TABS = [
  { id: 'overview',     label: 'Overview',        icon: '📊' },
  { id: 'resources',    label: 'All Resources',    icon: '🏛️' },
  { id: 'create',       label: 'Create',           icon: '➕' },
  { id: 'status',       label: 'Update Status',    icon: '🔄' },
  { id: 'maintenance',  label: 'Maintenance',      icon: '🔧' },
];

const RESOURCE_TYPES    = ['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'];
const RESOURCE_STATUSES = ['ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE'];
const TYPE_LABELS = {
  LECTURE_HALL: 'Lecture Hall', LAB: 'Laboratory',
  MEETING_ROOM: 'Meeting Room', EQUIPMENT: 'Equipment',
};
const STATUS_LABELS = {
  ACTIVE: 'Active', UNDER_MAINTENANCE: 'Under Maintenance', OUT_OF_SERVICE: 'Out of Service',
};

// Location blocks / floors allowed
const LOCATION_BLOCKS  = ['A','B','C','D'];
const LOCATION_FLOORS  = ['1','2','3','4','5','6','7','8','9','10'];

// ─── Field sanitisers ──────────────────────────────────────
// Name: letters, digits, dash only
const sanitiseName = (v) => v.replace(/[^a-zA-Z0-9-]/g, '');

// Location: letters, digits, comma, space, slash — no other specials
const sanitiseLocation = (v) => v.replace(/[^a-zA-Z0-9,/ ]/g, '');

// Building: letters and spaces only (no numbers, no specials)
const sanitiseBuilding = (v) => v.replace(/[^a-zA-Z ]/g, '');

// Floor: digits only
const sanitiseFloor = (v) => v.replace(/[^0-9]/g, '');

// Availability window: letters, digits, colon, dash, space only
const sanitiseAvailWindow = (v) => v.replace(/[^a-zA-Z0-9: -]/g, '');

// ─── Reusable field-level error hint ──────────────────────
const FieldHint = ({ msg }) =>
  msg ? <span style={{ color: 'var(--terracotta)', fontSize: 11.5, marginTop: 2 }}>⚠ {msg}</span> : null;

// ─── Image upload button (shared) ─────────────────────────
const ImageUploadBtn = ({ resourceId, onSuccess, label = '📷 Upload Photo', initialImage = null }) => {
  const { showToast } = useApp();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initialImage);
  const hasLocalPreview = useRef(false);
  const fileRef = useRef();

  // Sync with initialImage only if no local file has been chosen yet
  // (prevents the useEffect from stomping on the blob URL the user just picked)
  useEffect(() => {
    if (!hasLocalPreview.current) {
      setPreview(initialImage);
    }
  }, [initialImage]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    console.log('[ImageUpload] file selected:', file);
    if (!file) return;

    // Reset so the same file can be re-selected if needed
    e.target.value = '';

    const localUrl = URL.createObjectURL(file);
    console.log('[ImageUpload] blob URL created, resourceId:', resourceId);
    hasLocalPreview.current = true;
    setPreview(localUrl);
    setUploading(true);
    try {
      console.log('[ImageUpload] calling uploadImage...');
      const updated = await resourceApi.uploadImage(resourceId, file);
      console.log('[ImageUpload] upload response:', JSON.stringify(updated));
      showToast('Photo uploaded!', 'success');
      if (updated?.imageUrl) {
        console.log('[ImageUpload] server imageUrl:', updated.imageUrl);
        setPreview(resolveImageUrl(updated.imageUrl));
      } else {
        console.warn('[ImageUpload] no imageUrl in response, keeping blob preview');
      }
      onSuccess && onSuccess(updated);
    } catch (err) {
      console.error('[ImageUpload] upload failed:', err);
      showToast(err.message, 'error');
      hasLocalPreview.current = false;
      setPreview(initialImage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" ref={fileRef} style={{ display: 'none' }} accept="image/*" onChange={handleUpload} />
      {preview && (
        <img src={preview} alt="Preview" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 8 }} />
      )}
      <button
        type="button"
        className="btn btn-secondary"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={() => fileRef.current.click()}
        disabled={uploading || !resourceId}
      >
        {uploading ? '⏳ Uploading…' : label}
      </button>
      {!resourceId && (
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Save the resource first to upload a photo</span>
      )}
    </div>
  );
};

// ─── Shared resource form (Create + Edit) ─────────────────
const ResourceForm = ({ resource, onSubmit, onCancel, loading, savedId, onImageSuccess }) => {
  const initForm = (r) => ({
    name:                    r?.name                    || '',
    type:                    r?.type                    || 'LECTURE_HALL',
    capacity:                r?.capacity                ?? '',
    location:                r?.location                || '',
    building:                r?.building                || '',
    floor:                   r?.floor                   || '',
    status:                  r?.status                  || 'ACTIVE',
    description:             r?.description             || '',
    availabilityWindows:     r?.availabilityWindows     || '',
    maintenanceIntervalDays: r?.maintenanceIntervalDays ?? '',
    imageUrl:                r?.imageUrl                || '',
  });

  const [form, setForm]     = useState(() => initForm(resource));
  const [errors, setErrors] = useState({});
  const [hints, setHints]   = useState({});

  useEffect(() => { setForm(initForm(resource)); setErrors({}); setHints({}); }, [resource]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Per-field change handlers with live sanitise + hint
  const handleName = (e) => {
    const raw = e.target.value, clean = sanitiseName(raw);
    if (raw !== clean) setHints(h => ({ ...h, name: 'Only letters, numbers and - allowed' }));
    else setHints(h => ({ ...h, name: '' }));
    set('name', clean);
  };

  const handleLocation = (e) => {
    const raw = e.target.value, clean = sanitiseLocation(raw);
    if (raw !== clean) setHints(h => ({ ...h, location: 'No special characters allowed' }));
    else setHints(h => ({ ...h, location: '' }));
    set('location', clean);
  };

  const handleBuilding = (e) => {
    const raw = e.target.value, clean = sanitiseBuilding(raw);
    if (raw !== clean) setHints(h => ({ ...h, building: 'Letters and spaces only' }));
    else setHints(h => ({ ...h, building: '' }));
    set('building', clean);
  };

  const handleFloor = (e) => {
    const raw = e.target.value, clean = sanitiseFloor(raw);
    if (raw !== clean) setHints(h => ({ ...h, floor: 'Numbers only' }));
    else setHints(h => ({ ...h, floor: '' }));
    set('floor', clean);
  };

  const handleAvailWindow = (e) => {
    const raw = e.target.value, clean = sanitiseAvailWindow(raw);
    if (raw !== clean) setHints(h => ({ ...h, availabilityWindows: 'No special characters allowed' }));
    else setHints(h => ({ ...h, availabilityWindows: '' }));
    set('availabilityWindows', clean);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name     = 'Name is required';
    if (!form.location.trim()) e.location = 'Location is required';
    if (form.type !== 'EQUIPMENT' && !form.capacity) e.capacity = 'Capacity is required';

    // Validate location structure
    if (form.location.trim()) {
      const blockMatch = LOCATION_BLOCKS.some(b => form.location.toUpperCase().includes(`BLOCK ${b}`));
      const floorMatch = LOCATION_FLOORS.some(f => form.location.toUpperCase().includes(`FLOOR ${f}`));
      if (!blockMatch) e.location = 'Location must include Block A/B/C/D (e.g. Block A, Floor 2)';
      else if (!floorMatch) e.location = 'Location must include a Floor 1–10 (e.g. Block A, Floor 2)';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      ...form,
      capacity:                form.capacity                !== '' ? Number(form.capacity)                : undefined,
      maintenanceIntervalDays: form.maintenanceIntervalDays !== '' ? Number(form.maintenanceIntervalDays) : undefined,
      imageUrl:                form.imageUrl || undefined,
    });
  };

  return (
    <div className="form-grid">
      {/* Name */}
      <div className="form-group">
        <label className="form-label">Name *</label>
        <input className="form-input" value={form.name} onChange={handleName}
          placeholder="e.g. Lab-A101" style={errors.name ? { borderColor: 'var(--terracotta)' } : {}} />
        <FieldHint msg={hints.name || errors.name} />
      </div>

      {/* Type */}
      <div className="form-group">
        <label className="form-label">Type *</label>
        <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
          {RESOURCE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Status */}
      <div className="form-group">
        <label className="form-label">Status *</label>
        <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
          {RESOURCE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Capacity */}
      <div className="form-group">
        <label className="form-label">Capacity {form.type !== 'EQUIPMENT' ? '*' : '(optional)'}</label>
        <input type="number" className="form-input" value={form.capacity}
          onChange={e => set('capacity', e.target.value)}
          placeholder={form.type === 'EQUIPMENT' ? 'N/A for equipment' : 'e.g. 60'} min="1"
          style={errors.capacity ? { borderColor: 'var(--terracotta)' } : {}} />
        <FieldHint msg={errors.capacity} />
      </div>

      {/* Location */}
      <div className="form-group col-span-2">
        <label className="form-label">Location * <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11.5 }}>e.g. Block A, Floor 2</span></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" style={{ flex: 1 }}
            onChange={e => {
              const block = e.target.value;
              const floorPart = form.location.match(/Floor \d+/i)?.[0] || '';
              set('location', block && floorPart ? `${block}, ${floorPart}` : block || floorPart);
            }}
            value={LOCATION_BLOCKS.map(b => `Block ${b}`).find(b => form.location.toUpperCase().startsWith(b.toUpperCase())) || ''}
          >
            <option value="">Select Block</option>
            {LOCATION_BLOCKS.map(b => <option key={b} value={`Block ${b}`}>Block {b}</option>)}
          </select>
          <select className="form-select" style={{ flex: 1 }}
            onChange={e => {
              const floor = e.target.value;
              const blockPart = form.location.match(/Block [A-D]/i)?.[0] || '';
              set('location', blockPart && floor ? `${blockPart}, ${floor}` : blockPart || floor);
            }}
            value={LOCATION_FLOORS.map(f => `Floor ${f}`).find(f => form.location.toUpperCase().includes(f.toUpperCase())) || ''}
          >
            <option value="">Select Floor</option>
            {LOCATION_FLOORS.map(f => <option key={f} value={`Floor ${f}`}>Floor {f}</option>)}
          </select>
        </div>
        {/* Show composed value */}
        {form.location && (
          <div style={{ fontSize: 12.5, color: 'var(--forest-mid)', marginTop: 4 }}>
            📍 {form.location}
          </div>
        )}
        <FieldHint msg={errors.location} />
      </div>

      {/* Building */}
      <div className="form-group">
        <label className="form-label">Building <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(letters only)</span></label>
        <input className="form-input" value={form.building} onChange={handleBuilding}
          placeholder="e.g. Science Block" />
        <FieldHint msg={hints.building} />
      </div>

      {/* Floor */}
      <div className="form-group">
        <label className="form-label">Floor <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(number only)</span></label>
        <input className="form-input" value={form.floor} onChange={handleFloor} placeholder="e.g. 3" />
        <FieldHint msg={hints.floor} />
      </div>

      {/* Availability window */}
      <div className="form-group col-span-2">
        <label className="form-label">Availability Window</label>
        <input className="form-input" value={form.availabilityWindows} onChange={handleAvailWindow}
          placeholder="e.g. MON-FRI 08:00-18:00" />
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Format: DAY-DAY HH:MM-HH:MM · No special characters</span>
        <FieldHint msg={hints.availabilityWindows} />
      </div>

      {/* Maintenance interval */}
      <div className="form-group">
        <label className="form-label">Maintenance Interval (days)</label>
        <input type="number" className="form-input" value={form.maintenanceIntervalDays}
          onChange={e => set('maintenanceIntervalDays', e.target.value)} placeholder="e.g. 30" min="1" max="365" />
      </div>

      {/* Description */}
      <div className="form-group col-span-2">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Describe this resource…" rows={3} />
      </div>

      {/* Photo upload — only shown when editing (savedId exists) */}
      <div className="form-group col-span-2">
        <label className="form-label">Resource Photo</label>
        {savedId ? (
          <ImageUploadBtn
            resourceId={savedId}
            onSuccess={(updated) => {
              if (updated?.imageUrl) {
              set('imageUrl', updated.imageUrl);   // ← keep form in sync
            }
            onImageSuccess && onImageSuccess(updated);
            }}
            initialImage={resolveImageUrl(resource?.imageUrl)}
          />
        ) : (
          <div style={{
            padding: '14px 16px',
            background: 'var(--ivory-dark)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            color: 'var(--text-muted)',
            border: '1px dashed var(--ivory-border)',
          }}>
            📷 Photo upload available after saving the resource
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="col-span-2" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--ivory-border)', marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving…' : resource ? '💾 Update Resource' : '✅ Create Resource'}
        </button>
      </div>
    </div>
  );
};

// ─── Edit Resource Modal ────────────────────────────────────
const EditResourceModal = ({ resource, onClose, onSubmit, loading, onImageSuccess }) => {
  if (!resource) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Resource</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <ResourceForm
            resource={resource}
            onSubmit={onSubmit}
            onCancel={onClose}
            loading={loading}
            savedId={resource.id}
            onImageSuccess={onImageSuccess}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Overview Tab ──────────────────────────────────────────
const OverviewTab = ({ resources, onGoTo }) => {
  const total  = resources.length;
  const active = resources.filter(r => r.status === 'ACTIVE').length;
  const maint  = resources.filter(r => r.status === 'UNDER_MAINTENANCE').length;
  const oos    = resources.filter(r => r.status === 'OUT_OF_SERVICE').length;
  const typeCount = resources.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div className="stat-grid">
        {[
          { icon: '🏛️', value: total,  label: 'Total Resources',      color: 'var(--forest)' },
          { icon: '✅', value: active, label: 'Active',               color: 'var(--forest-mid)' },
          { icon: '🔧', value: maint,  label: 'Under Maintenance',    color: 'var(--amber)' },
          { icon: '⛔', value: oos,    label: 'Out of Service',       color: 'var(--terracotta)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--forest)', marginBottom: 16 }}>By Type</h3>
          {Object.entries(typeCount).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <TypeBadge type={type} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--forest)' }}>{count}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--forest)', marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary"    onClick={() => onGoTo('create')}>➕ Create New Resource</button>
            <button className="btn btn-amber"      onClick={() => onGoTo('maintenance')}>🔧 View Maintenance Queue</button>
            <button className="btn btn-secondary"  onClick={() => onGoTo('status')}>🔄 Update Status</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── All Resources Tab ─────────────────────────────────────
const ResourcesTab = ({ resources, loading, onSearch, onEdit, onDelete, onDetail }) => (
  <div>
    <div style={{ marginBottom: 20 }}>
      <SearchFilterBar onSearch={onSearch} loading={loading} />
    </div>
    {loading && <div className="spinner" />}
    {!loading && resources.length === 0 && (
      <div className="empty-state">
        <div className="empty-state-icon">📭</div>
        <div className="empty-state-text">No resources found</div>
        <div className="empty-state-sub">Try different filters or create a new resource</div>
      </div>
    )}
    <div className="resource-grid">
      {resources.map(r => (
        <ResourceCard key={r.id} resource={r} onSelect={onDetail}
          actions={(resource) => (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary btn-sm"
                onClick={(e) => { e.stopPropagation(); onEdit(resource); }}>✏️ Edit</button>
              <button className="btn btn-danger btn-sm"
                onClick={(e) => { e.stopPropagation(); onDelete(resource); }}>🗑️ Delete</button>
            </div>
          )}
        />
      ))}
    </div>
  </div>
);

// ─── Status Update Tab ─────────────────────────────────────
// Clicking a resource opens a detail panel with status selector + save
const StatusTab = ({ resources, onStatusUpdate, loading }) => {
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);   // resource being updated
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving]     = useState(false);

  const filtered = resources.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase())
  );

  const openPanel = (r) => { setSelected(r); setNewStatus(r.status); };
  const closePanel = () => { setSelected(null); setNewStatus(''); };

  const handleSave = async () => {
    if (!selected || newStatus === selected.status) return;
    setSaving(true);
    await onStatusUpdate(selected.id, newStatus);
    // update local copy so panel reflects saved value
    setSelected(prev => ({ ...prev, status: newStatus }));
    setSaving(false);
  };

  const TYPE_ICONS = { LECTURE_HALL: '🏛️', LAB: '🔬', MEETING_ROOM: '🤝', EQUIPMENT: '🔧' };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Update Resource Status</div>
          <div className="section-sub">Click any resource to view details and change its status</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name or location…" style={{ maxWidth: 360 }} />
      </div>

      {loading && <div className="spinner" />}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Resource</th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openPanel(r)}>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td><TypeBadge type={r.type} /></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{r.location}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <button className="btn btn-secondary btn-sm"
                      onClick={e => { e.stopPropagation(); openPanel(r); }}>
                      🔄 Change Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status detail panel — modal */}
      {selected && (
        <div className="modal-backdrop" onClick={closePanel}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Update Status</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                  {selected.name}
                </p>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={closePanel} style={{ fontSize: 18 }}>✕</button>
            </div>
            <div className="modal-body">

              {/* Resource summary */}
              <div style={{ background: 'var(--ivory)', borderRadius: 'var(--radius-md)', padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 32 }}>{TYPE_ICONS[selected.type]}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--forest)' }}>{selected.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      <TypeBadge type={selected.type} />
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>📍 Location: </span>{selected.location}</div>
                  {selected.building && <div><span style={{ color: 'var(--text-muted)' }}>🏢 Building: </span>{selected.building}</div>}
                  {selected.floor    && <div><span style={{ color: 'var(--text-muted)' }}>🪜 Floor: </span>{selected.floor}</div>}
                  {selected.capacity && <div><span style={{ color: 'var(--text-muted)' }}>👥 Capacity: </span>{selected.capacity}</div>}
                  {selected.availabilityWindows && <div><span style={{ color: 'var(--text-muted)' }}>🕐 Hours: </span>{selected.availabilityWindows}</div>}
                  {selected.maintenanceIntervalDays && <div><span style={{ color: 'var(--text-muted)' }}>🔧 Maint. every: </span>{selected.maintenanceIntervalDays}d</div>}
                </div>

                {selected.description && (
                  <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5, borderTop: '1px solid var(--ivory-border)', paddingTop: 10 }}>
                    {selected.description}
                  </div>
                )}
              </div>

              {/* Status selector */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontSize: 14 }}>Select New Status</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                  {RESOURCE_STATUSES.map(s => {
                    const active = newStatus === s;
                    const colors = {
                      ACTIVE:            { bg: active ? 'var(--forest)'    : 'var(--forest-soft)',    border: 'var(--forest-mid)',  text: active ? '#fff' : 'var(--forest-mid)' },
                      UNDER_MAINTENANCE: { bg: active ? 'var(--amber)'     : 'var(--amber-pale)',     border: 'var(--amber)',       text: active ? '#fff' : 'var(--amber)' },
                      OUT_OF_SERVICE:    { bg: active ? 'var(--terracotta)': 'var(--terracotta-pale)',border: 'var(--terracotta)',  text: active ? '#fff' : 'var(--terracotta)' },
                    }[s];
                    return (
                      <button key={s}
                        onClick={() => setNewStatus(s)}
                        style={{
                          padding: '10px 18px', borderRadius: 'var(--radius-md)',
                          border: `2px solid ${colors.border}`,
                          background: colors.bg, color: colors.text,
                          fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          transition: 'all 0.15s',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {s === 'ACTIVE' ? '●' : s === 'UNDER_MAINTENANCE' ? '◆' : '✕'} {STATUS_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {newStatus !== selected.status && (
                <div style={{ background: 'var(--amber-pale)', border: '1px solid #f0d8b0', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--amber)', marginBottom: 16 }}>
                  ⚠ Changing from <strong>{STATUS_LABELS[selected.status]}</strong> → <strong>{STATUS_LABELS[newStatus]}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={closePanel}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}
                  disabled={saving || newStatus === selected.status}>
                  {saving ? 'Saving…' : '💾 Save Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Maintenance Tab ───────────────────────────────────────
const MaintenanceTab = ({ onMarkDone }) => {
  const { showToast } = useApp();
  const [resources, setResources] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [marking,   setMarking]   = useState(null);

  const fetchDue = async () => {
    setLoading(true);
    try { setResources(await resourceApi.getMaintenanceDue()); }
    catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDue(); }, []);

  const handleDone = async (id) => {
    setMarking(id);
    try {
      const updated = await resourceApi.markMaintenanceDone(id);
      setResources(prev => prev.map(r => r.id === id ? updated : r));
      showToast('Maintenance marked as done!', 'success');
      onMarkDone && onMarkDone();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setMarking(null); }
  };

  const underMaint   = resources.filter(r => r.status === 'UNDER_MAINTENANCE');
  const dueForService = resources.filter(r => r.status !== 'UNDER_MAINTENANCE');

  const renderTable = (list, btnClass, btnLabel) => (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Resource</th><th>Type</th><th>Location</th><th>Interval</th><th>Last Service</th><th>Action</th></tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 500 }}>{r.name}</td>
                <td><TypeBadge type={r.type} /></td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.location}</td>
                <td style={{ fontSize: 13 }}>{r.maintenanceIntervalDays ? `${r.maintenanceIntervalDays}d` : '—'}</td>
                <td style={{ fontSize: 13 }}>{r.lastMaintenanceDate ? new Date(r.lastMaintenanceDate).toLocaleDateString() : 'Never'}</td>
                <td>
                  <button className={`btn ${btnClass} btn-sm`} disabled={marking === r.id} onClick={() => handleDone(r.id)}>
                    {marking === r.id ? '…' : btnLabel}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Maintenance Queue</div>
          <div className="section-sub">Resources requiring attention or scheduled servicing</div>
        </div>
        <button className="btn btn-secondary" onClick={fetchDue}>↻ Refresh</button>
      </div>

      {loading && <div className="spinner" />}
      {!loading && resources.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-text">All clear! No maintenance required</div>
        </div>
      )}
      {underMaint.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--terracotta)', marginBottom: 12 }}>
            🔴 Currently Under Maintenance ({underMaint.length})
          </h3>
          {renderTable(underMaint, 'btn-primary', '✅ Mark Done')}
        </div>
      )}
      {dueForService.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--amber)', marginBottom: 12 }}>
            🟡 Due for Scheduled Service ({dueForService.length})
          </h3>
          {renderTable(dueForService, 'btn-amber', '✅ Mark Done')}
        </div>
      )}
    </div>
  );
};

// ─── Admin Page root ───────────────────────────────────────
const AdminPage = () => {
  const { showToast } = useApp();
  const [tab,           setTab]           = useState('overview');
  const [resources,     setResources]     = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [formLoading,   setFormLoading]   = useState(false);
  const [editResource,  setEditResource]  = useState(undefined); // undefined=closed, obj=editing
  const [detailResource,setDetailResource]= useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  // savedCreatedId: after a new resource is saved, we store its id so the photo upload can use it
  const [savedCreatedId, setSavedCreatedId] = useState(null);

  const fetchResources = async (filters = {}) => {
    setLoading(true);
    try { setResources(await resourceApi.getAll(filters)); }
    catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResources(); }, []);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try {
      const created = await resourceApi.create(data);
      setResources(prev => [created, ...prev]);
      setSavedCreatedId(created.id);   // enable photo upload now
      showToast('Resource created! You can now upload a photo.', 'success');
      // stay on create tab so user can upload photo
    } catch (e) { showToast(e.message, 'error'); }
    finally { setFormLoading(false); }
  };

  const handleUpdate = async (data) => {
    setFormLoading(true);
    try {
      const updated = await resourceApi.update(editResource.id, data);
      setResources(prev => prev.map(r => r.id === updated.id ? updated : r));
      setEditResource(undefined);
      showToast('Resource updated!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setFormLoading(false); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const updated = await resourceApi.updateStatus(id, status);
      setResources(prev => prev.map(r => r.id === updated.id ? updated : r));
      showToast(`Status updated to ${STATUS_LABELS[status]}`, 'success');
    } catch (e) { showToast(e.message, 'error'); throw e; }
  };

  const handleDelete = async (resource) => {
    try {
      await resourceApi.delete(resource.id);
      setResources(prev => prev.filter(r => r.id !== resource.id));
      setDeleteConfirm(null);
      showToast('Resource deleted.', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleTabChange = (id) => {
    setTab(id);
    if (id === 'create') setSavedCreatedId(null); // reset for fresh create
  };

  return (
    <div>
      {/* Admin Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: 'var(--radius-xl)', padding: '28px 36px', marginBottom: 28,
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
            🛡 ADMIN PANEL
          </div>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#fff', marginBottom: 6 }}>Resource Management</h1>
        <p style={{ opacity: 0.7, fontSize: 14 }}>Manage all campus resources, maintenance, and status</p>
      </div>

      {/* Tabs */}
      <div className="tab-list" style={{ marginBottom: 28, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && <OverviewTab resources={resources} onGoTo={handleTabChange} />}

      {/* ── All Resources ── */}
      {tab === 'resources' && (
        <div>
          <div className="section-header">
            <div>
              <div className="section-title">All Resources</div>
              <div className="section-sub">{resources.length} resources in system</div>
            </div>
            <button className="btn btn-primary" onClick={() => handleTabChange('create')}>➕ New Resource</button>
          </div>
          <ResourcesTab
            resources={resources} loading={loading} onSearch={fetchResources}
            onEdit={setEditResource}
            onDelete={setDeleteConfirm}
            onDetail={setDetailResource}
          />
        </div>
      )}

      {/* ── Create ── */}
      {tab === 'create' && (
        <div>
          <div className="section-header">
            <div>
              <div className="section-title">Create Resource</div>
              <div className="section-sub">Fill in the details for the new campus resource</div>
            </div>
          </div>
          <div className="card" style={{ padding: 28, maxWidth: 720 }}>
            {savedCreatedId ? (
              // Resource was just created — show success + photo upload
              <div>
                <div style={{ background: 'var(--forest-soft)', border: '1px solid var(--forest-light)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 24 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--forest)', marginBottom: 4 }}>✅ Resource Created!</div>
                  <p style={{ fontSize: 14, color: 'var(--forest-mid)' }}>You can now upload a photo for this resource, or go to All Resources.</p>
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontSize: 15 }}>📷 Upload Resource Photo</label>
                  <ImageUploadBtn
                    resourceId={savedCreatedId}
                    label="📷 Choose Photo to Upload"
                    onSuccess={(updated) => {
                      setResources(prev => prev.map(r => r.id === updated.id ? updated : r));
                      showToast('Photo uploaded!', 'success');
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" onClick={() => { setSavedCreatedId(null); }}>➕ Create Another</button>
                  <button className="btn btn-secondary" onClick={() => handleTabChange('resources')}>🏛️ View All Resources</button>
                </div>
              </div>
            ) : (
              <ResourceForm
                resource={null}
                onSubmit={handleCreate}
                onCancel={() => handleTabChange('resources')}
                loading={formLoading}
                savedId={null}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Status ── */}
      {tab === 'status' && (
        <StatusTab resources={resources} onStatusUpdate={handleStatusUpdate} loading={loading} />
      )}

      {/* ── Maintenance ── */}
      {tab === 'maintenance' && (
        <MaintenanceTab onMarkDone={() => fetchResources()} />
      )}

      {/* ── Edit modal (from All Resources tab) ── */}
      {editResource !== undefined && (
        <EditResourceModal
          resource={editResource}
          onClose={() => setEditResource(undefined)}
          loading={formLoading}
          onSubmit={handleUpdate}
          onImageSuccess={(updated) => {
            setResources(prev => prev.map(r => r.id === updated.id ? updated : r));
            setEditResource(updated);
          }}
        />
      )}

      {/* ── Detail modal ── */}
      {detailResource && (
        <ResourceDetailModal
          resource={detailResource}
          onClose={() => setDetailResource(null)}
          extraActions={<>
            <button className="btn btn-secondary" onClick={() => { setEditResource(detailResource); setDetailResource(null); }}>✏️ Edit</button>
            <button className="btn btn-danger"    onClick={() => { setDeleteConfirm(detailResource); setDetailResource(null); }}>🗑️ Delete</button>
          </>}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--terracotta)' }}>Delete Resource</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 15, color: 'var(--text-mid)', marginBottom: 20 }}>
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger"    onClick={() => handleDelete(deleteConfirm)}>🗑️ Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

