import { useState, useEffect } from 'react';

const RESOURCE_TYPES = ['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'];
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

const ResourceFormModal = ({ resource, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const isEdit = !!resource;

  useEffect(() => {
    if (resource) {
      setForm({
        name: resource.name || '',
        type: resource.type || 'LECTURE_HALL',
        capacity: resource.capacity ?? '',
        location: resource.location || '',
        building: resource.building || '',
        floor: resource.floor || '',
        status: resource.status || 'ACTIVE',
        description: resource.description || '',
        availabilityWindows: resource.availabilityWindows || '',
        imageUrl: resource.imageUrl || '',
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
    if (form.type !== 'EQUIPMENT' && !form.capacity) e.capacity = 'Capacity is required for this type';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload = {
      ...form,
      capacity: form.capacity !== '' ? Number(form.capacity) : undefined,
      maintenanceIntervalDays: form.maintenanceIntervalDays !== '' ? Number(form.maintenanceIntervalDays) : undefined,
    };
    onSubmit(payload);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Resource' : 'Create Resource'}</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Lecture Hall A2" />
              {errors.name && <span style={{ color: 'var(--terracotta)', fontSize: 12 }}>{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                {RESOURCE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status *</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {RESOURCE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Capacity {form.type !== 'EQUIPMENT' ? '*' : '(optional)'}</label>
              <input type="number" className="form-input" value={form.capacity} onChange={e => set('capacity', e.target.value)}
                placeholder={form.type === 'EQUIPMENT' ? 'N/A for equipment' : 'e.g. 60'} min="1" />
              {errors.capacity && <span style={{ color: 'var(--terracotta)', fontSize: 12 }}>{errors.capacity}</span>}
            </div>

            <div className="form-group col-span-2">
              <label className="form-label">Location *</label>
              <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Block A, Room 201" />
              {errors.location && <span style={{ color: 'var(--terracotta)', fontSize: 12 }}>{errors.location}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Building</label>
              <input className="form-input" value={form.building} onChange={e => set('building', e.target.value)} placeholder="e.g. Science Block" />
            </div>

            <div className="form-group">
              <label className="form-label">Floor</label>
              <input className="form-input" value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="e.g. 2nd" />
            </div>

            <div className="form-group col-span-2">
              <label className="form-label">Availability Window</label>
              <input className="form-input" value={form.availabilityWindows}
                onChange={e => set('availabilityWindows', e.target.value)}
                placeholder="e.g. MON-FRI 08:00-18:00" />
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Format: DAY-DAY HH:MM-HH:MM or DAY HH:MM-HH:MM</span>
            </div>

            <div className="form-group">
              <label className="form-label">Maintenance Interval (days)</label>
              <input type="number" className="form-input" value={form.maintenanceIntervalDays}
                onChange={e => set('maintenanceIntervalDays', e.target.value)} placeholder="e.g. 30" min="1" max="365" />
            </div>

            <div className="form-group">
              <label className="form-label">Image URL</label>
              <input className="form-input" value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
            </div>

            <div className="form-group col-span-2">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Describe this resource..." rows={3} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Update Resource' : 'Create Resource'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceFormModal;

