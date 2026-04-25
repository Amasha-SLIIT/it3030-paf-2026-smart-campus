// FIX #5 – ResourceFormModal now supports inline={true} mode so it renders directly
// inside the admin tab without needing a modal backdrop.

import { useState, useEffect } from 'react';

const RESOURCE_TYPES    = ['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'];
const RESOURCE_STATUSES = ['ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE'];
const TYPE_LABELS = {
  LECTURE_HALL: 'Lecture Hall', LAB: 'Laboratory',
  MEETING_ROOM: 'Meeting Room', EQUIPMENT: 'Equipment',
};

const emptyForm = {
  name: '', type: 'LECTURE_HALL', capacity: '', location: '',
  building: '', floor: '', status: 'ACTIVE', description: '',
  availabilityWindows: '', imageUrl: '', maintenanceIntervalDays: '',
};

const ResourceFormModal = ({ resource, onClose, onSubmit, loading, inline = false }) => {
  const [form,   setForm]   = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const isEdit = !!resource;

  useEffect(() => {
    if (resource) {
      setForm({
        name:                    resource.name                    || '',
        type:                    resource.type                    || 'LECTURE_HALL',
        capacity:                resource.capacity                ?? '',
        location:                resource.location                || '',
        building:                resource.building                || '',
        floor:                   resource.floor                   || '',
        status:                  resource.status                  || 'ACTIVE',
        description:             resource.description             || '',
        availabilityWindows:     resource.availabilityWindows     || '',
        imageUrl:                resource.imageUrl                || '',
        maintenanceIntervalDays: resource.maintenanceIntervalDays ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [resource]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.location.trim()) e.location = 'Location is required';
    if (form.type !== 'EQUIPMENT' && !form.capacity) e.capacity = 'Capacity required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      ...form,
      capacity:                form.capacity !== ''                ? Number(form.capacity)                : undefined,
      maintenanceIntervalDays: form.maintenanceIntervalDays !== '' ? Number(form.maintenanceIntervalDays) : undefined,
    });
  };

  const formBody = (
    <div>
      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Name */}
        <div style={fg}>
          <label style={lbl}>Name *</label>
          <input style={inp(errors.name)} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Lecture Hall A2" />
          {errors.name && <Err msg={errors.name} />}
        </div>

        {/* Type */}
        <div style={fg}>
          <label style={lbl}>Type *</label>
          <select style={inp()} value={form.type} onChange={e => set('type', e.target.value)}>
            {RESOURCE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>

        {/* Status */}
        <div style={fg}>
          <label style={lbl}>Status *</label>
          <select style={inp()} value={form.status} onChange={e => set('status', e.target.value)}>
            {RESOURCE_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {/* Capacity */}
        <div style={fg}>
          <label style={lbl}>Capacity {form.type !== 'EQUIPMENT' ? '*' : '(optional)'}</label>
          <input type="number" style={inp(errors.capacity)} value={form.capacity}
            onChange={e => set('capacity', e.target.value)} min="1"
            placeholder={form.type === 'EQUIPMENT' ? 'N/A' : 'e.g. 60'} />
          {errors.capacity && <Err msg={errors.capacity} />}
        </div>

        {/* Location — full width */}
        <div style={{ ...fg, gridColumn: '1 / -1' }}>
          <label style={lbl}>Location *</label>
          <input style={inp(errors.location)} value={form.location}
            onChange={e => set('location', e.target.value)} placeholder="e.g. Block A, Room 201" />
          {errors.location && <Err msg={errors.location} />}
        </div>

        <div style={fg}>
          <label style={lbl}>Building</label>
          <input style={inp()} value={form.building} onChange={e => set('building', e.target.value)} placeholder="e.g. Science Block" />
        </div>

        <div style={fg}>
          <label style={lbl}>Floor</label>
          <input style={inp()} value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="e.g. 2nd" />
        </div>

        {/* Availability — full width */}
        <div style={{ ...fg, gridColumn: '1 / -1' }}>
          <label style={lbl}>Availability Window</label>
          <input style={inp()} value={form.availabilityWindows}
            onChange={e => set('availabilityWindows', e.target.value)}
            placeholder="e.g. MON-FRI 08:00-18:00" />
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Format: DAY-DAY HH:MM-HH:MM</span>
        </div>

        <div style={fg}>
          <label style={lbl}>Maintenance Interval (days)</label>
          <input type="number" style={inp()} value={form.maintenanceIntervalDays}
            onChange={e => set('maintenanceIntervalDays', e.target.value)} min="1" max="365" placeholder="e.g. 30" />
        </div>

        <div style={fg}>
          <label style={lbl}>Image URL</label>
          <input style={inp()} value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
        </div>

        {/* Description — full width */}
        <div style={{ ...fg, gridColumn: '1 / -1' }}>
          <label style={lbl}>Description</label>
          <textarea style={{ ...inp(), resize: 'vertical', minHeight: 80 }} value={form.description}
            onChange={e => set('description', e.target.value)} rows={3} placeholder="Describe this resource…" />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
        <button onClick={onClose} style={cancelBtn}>Cancel</button>
        <button onClick={handleSubmit} disabled={loading} style={saveBtn}>
          {loading ? 'Saving…' : isEdit ? '✅ Update Resource' : '✅ Create Resource'}
        </button>
      </div>
    </div>
  );

  // Inline mode: render form body directly (no modal backdrop)
  if (inline) return formBody;

  // Modal mode: wrap in backdrop
  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#1e3a5f' }}>{isEdit ? 'Edit Resource' : 'Create Resource'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        {formBody}
      </div>
    </div>
  );
};

function Err({ msg }) {
  return <span style={{ color: '#ef4444', fontSize: 11.5, marginTop: 2, display: 'block' }}>{msg}</span>;
}

const fg         = { display:'flex', flexDirection:'column', gap:4 };
const lbl        = { fontSize:12, fontWeight:600, color:'#374151' };
const inp        = (err) => ({ padding:'9px 12px', border:`1.5px solid ${err ? '#ef4444' : '#e0e0e0'}`, borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' });
const saveBtn    = { padding:'10px 24px', background:'#1e3a5f', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 };
const cancelBtn  = { padding:'10px 16px', background:'white', color:'#6b7280', border:'1.5px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13 };
const backdrop   = { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 };
const modal      = { background:'white', borderRadius:16, padding:32, width:'90%', maxWidth:640, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' };

export default ResourceFormModal;