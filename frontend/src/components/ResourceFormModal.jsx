import { useState, useEffect, useRef } from 'react';
import { Upload, X } from 'lucide-react';

// ─── Field sanitisers ──────────────────────────────────────
const sanitiseName = (v) => v.replace(/[^a-zA-Z0-9-]/g, '');
const sanitiseLocation = (v) => v.replace(/[^a-zA-Z0-9,/ ]/g, '');
const sanitiseBuilding = (v) => v.replace(/[^a-zA-Z ]/g, '');
const sanitiseFloor = (v) => v.replace(/[^0-9]/g, '');
const sanitiseAvailWindow = (v) => v.replace(/[^a-zA-Z0-9: -]/g, '');

// ─── Reusable field-level error hint ──────────────────────
const FieldHint = ({ msg }) =>
  msg ? (
    <span style={{ color: 'var(--terracotta, #c05621)', fontSize: 11.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
      ⚠ {msg}
    </span>
  ) : null;

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
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef();
  
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
      setPreview(resource.imageUrl || '');
    } else {
      setForm(emptyForm);
      setPreview('');
      setImageFile(null);
    }
  }, [resource]);

  // Integrated Sanitization in the set function
  const set = (field, val) => {
    let cleanVal = val;
    
    if (field === 'name') cleanVal = sanitiseName(val);
    if (field === 'location') cleanVal = sanitiseLocation(val);
    if (field === 'building') cleanVal = sanitiseBuilding(val);
    if (field === 'floor') cleanVal = sanitiseFloor(val);
    if (field === 'availabilityWindows') cleanVal = sanitiseAvailWindow(val);

    setForm(f => ({ ...f, [field]: cleanVal }));
    // Clear error for this field as the user types
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Image must be 10MB or smaller.");
        return;
      }
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.location.trim()) e.location = 'Location is required';
    if (form.type !== 'EQUIPMENT' && !form.capacity) e.capacity = 'Capacity required';
    
    // Maintenance Interval Validation
    if (form.maintenanceIntervalDays && (form.maintenanceIntervalDays < 1 || form.maintenanceIntervalDays > 365)) {
      e.maintenanceIntervalDays = 'Interval must be between 1 and 365 days';
    }

    // Availability Window Format Validation
    if (form.availabilityWindows.trim()) {
      const availRegex = /^[A-Z]{3}-[A-Z]{3}\s\d{2}:\d{2}-\d{2}:\d{2}$/;
      if (!availRegex.test(form.availabilityWindows.trim())) {
        e.availabilityWindows = 'Use format: MON-FRI 08:00-18:00';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      ...form,
      capacity:                form.capacity !== ''                ? Number(form.capacity)                : undefined,
      maintenanceIntervalDays: form.maintenanceIntervalDays !== '' ? Number(form.maintenanceIntervalDays) : undefined,
      imageFile:               imageFile, 
    });
  };

  const formBody = (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={fg}>
          <label style={lbl}>Name *</label>
          <input style={inp(errors.name)} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Hall-A1" />
          <FieldHint msg={errors.name} />
        </div>

        <div style={fg}>
          <label style={lbl}>Type *</label>
          <select style={inp()} value={form.type} onChange={e => set('type', e.target.value)}>
            {RESOURCE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>

        <div style={fg}>
          <label style={lbl}>Status *</label>
          <select style={inp()} value={form.status} onChange={e => set('status', e.target.value)}>
            {RESOURCE_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div style={fg}>
          <label style={lbl}>Capacity {form.type !== 'EQUIPMENT' ? '*' : '(optional)'}</label>
          <input type="number" style={inp(errors.capacity)} value={form.capacity}
            onChange={e => set('capacity', e.target.value)} min="1"
            placeholder={form.type === 'EQUIPMENT' ? 'N/A' : 'e.g. 60'} />
          <FieldHint msg={errors.capacity} />
        </div>

        <div style={{ ...fg, gridColumn: '1 / -1' }}>
          <label style={lbl}>Location *</label>
          <input style={inp(errors.location)} value={form.location}
            onChange={e => set('location', e.target.value)} placeholder="e.g. Block A, Room 201" />
          <FieldHint msg={errors.location} />
        </div>

        <div style={fg}>
          <label style={lbl}>Building</label>
          <input style={inp()} value={form.building} onChange={e => set('building', e.target.value)} placeholder="e.g. Science Block" />
        </div>

        <div style={fg}>
          <label style={lbl}>Floor</label>
          <input style={inp()} value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="e.g. 2" />
        </div>

        <div style={{ ...fg, gridColumn: '1 / -1' }}>
          <label style={lbl}>Availability Window</label>
          <input style={inp(errors.availabilityWindows)} value={form.availabilityWindows}
            onChange={e => set('availabilityWindows', e.target.value)}
            placeholder="e.g. MON-FRI 08:00-18:00" />
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Format: DAY-DAY HH:MM-HH:MM</span>
          <FieldHint msg={errors.availabilityWindows} />
        </div>

        <div style={fg}>
          <label style={lbl}>Maintenance Interval (days)</label>
          <input type="number" style={inp(errors.maintenanceIntervalDays)} value={form.maintenanceIntervalDays}
            onChange={e => set('maintenanceIntervalDays', e.target.value)} min="1" max="365" placeholder="e.g. 30" />
          <FieldHint msg={errors.maintenanceIntervalDays} />
        </div>

        <div style={fg}>
          <label style={lbl}>Resource Image Upload</label>
          <div 
            onClick={() => fileInputRef.current.click()}
            style={{ 
              ...inp(), 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              cursor: 'pointer',
              background: '#f8fafc',
              borderStyle: 'dashed' 
            }}
          >
            <Upload size={14} />
            <span style={{ color: '#6b7280' }}>{imageFile ? imageFile.name : 'Choose file...'}</span>
          </div>
          <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
        </div>

        <div style={{ ...fg, gridColumn: '1 / -1' }}>
          {preview && (
            <div style={{ position: 'relative', width: 120, height: 80, marginTop: 4 }}>
              <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #e0e0e0' }} />
              <button 
                type="button"
                onClick={() => { setImageFile(null); setPreview(''); }}
                style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 2 }}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        <div style={{ ...fg, gridColumn: '1 / -1' }}>
          <label style={lbl}>Description</label>
          <textarea style={{ ...inp(), resize: 'vertical', minHeight: 80 }} value={form.description}
            onChange={e => set('description', e.target.value)} rows={3} placeholder="Describe this resource…" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
        <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        <button type="button" onClick={handleSubmit} disabled={loading} style={saveBtn}>
          {loading ? 'Saving…' : isEdit ? '✅ Update Resource' : '✅ Create Resource'}
        </button>
      </div>
    </div>
  );

  if (inline) return formBody;

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

const fg         = { display:'flex', flexDirection:'column', gap:4 };
const lbl        = { fontSize:12, fontWeight:600, color:'#374151' };
const inp        = (err) => ({ padding:'9px 12px', border:`1.5px solid ${err ? 'var(--terracotta, #ef4444)' : '#e0e0e0'}`, borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' });
const saveBtn    = { padding:'10px 24px', background:'#1e3a5f', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 };
const cancelBtn  = { padding:'10px 16px', background:'white', color:'#6b7280', border:'1.5px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13 };
const backdrop   = { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 };
const modal       = { background:'white', borderRadius:16, padding:32, width:'90%', maxWidth:640, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' };

export default ResourceFormModal;