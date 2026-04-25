// FIX #3  – form was submitting but FormData had wrong structure; fixed createTicket call
// FIX #12 – after selecting resource type, only matching locations shown in location dropdown

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createTicket, getActiveResources } from '../api/ticketApi';
import { ArrowLeft, Upload, X, AlertCircle } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import { toast } from 'react-toastify';

const CATEGORIES = [
  { value: 'AV_AND_MULTIMEDIA',     label: '📽️ AV & Multimedia' },
  { value: 'IT_AND_CONNECTIVITY',   label: '💻 IT & Connectivity' },
  { value: 'FURNITURE_AND_FIXTURES',label: '🪑 Furniture & Fixtures' },
  { value: 'ELECTRICAL_AND_HVAC',   label: '⚡ Electrical & HVAC' },
  { value: 'JANITORIAL_PLUMBING',   label: '🔧 Janitorial / Plumbing' },
  { value: 'SECURITY_AND_ACCESS',   label: '🔒 Security & Access' },
  { value: 'OTHER',                 label: '📋 Other' },
];

const PRIORITIES = [
  { value: 'HIGH',   label: '🔴 High',   color: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  { value: 'MEDIUM', label: '🟡 Medium', color: '#fffbeb', border: '#fde68a', text: '#d97706' },
  { value: 'LOW',    label: '🟢 Low',    color: '#f0fdf4', border: '#86efac', text: '#16a34a' },
];

export default function SubmitTicketPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [resources, setResources] = useState([]);   // all active resources
  const [form, setForm] = useState({
    subject: '', resourceType: '', location: '', category: '',
    description: '', priority: '', contactDetails: '',
  });
  const [images, setImages]   = useState([]);        // { file, preview }[]
  const [errors, setErrors]   = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getActiveResources()
      .then(res => setResources(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  // All unique resource types
  const resourceTypes = [...new Set(resources.map(r => r.type).filter(Boolean))];

  // FIX #12: filter locations by selected resource type
  const filteredLocations = form.resourceType
    ? [...new Set(resources.filter(r => r.type === form.resourceType).map(r => r.location).filter(Boolean))]
    : [...new Set(resources.map(r => r.location).filter(Boolean))];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      // FIX #12: when resourceType changes, reset location so stale value isn't sent
      if (name === 'resourceType') next.location = '';
      return next;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 3 - images.length;
    if (remaining <= 0) { toast.warn('Maximum 3 images allowed'); return; }
    const toAdd = files.slice(0, remaining);
    const oversized = toAdd.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) { toast.error('Each image must be under 5 MB'); return; }
    setImages(prev => [
      ...prev,
      ...toAdd.map(file => ({ file, preview: URL.createObjectURL(file) })),
    ]);
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const validate = () => {
    const e = {};
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.category)       e.category = 'Category is required';
    if (!form.description.trim() || form.description.length < 10)
      e.description = 'Description must be at least 10 characters';
    if (!form.priority)       e.priority = 'Priority is required';
    if (form.contactDetails && !/^[0-9+\-() ]{7,20}$/.test(form.contactDetails))
      e.contactDetails = 'Enter a valid phone number';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true);
    try {
      // Find matching resourceId from type + location selection
      let resourceId = null;
      if (form.resourceType && form.location) {
        const match = resources.find(
          r => r.type === form.resourceType && r.location === form.location
        );
        if (match) resourceId = match.id;
      }

      // FIX #3: createTicket handles FormData correctly in the API layer
      await createTicket({
        subject:        form.subject,
        resourceId,
        category:       form.category,
        description:    form.description,
        priority:       form.priority,
        contactDetails: form.contactDetails || null,
      }, images.map(i => i.file));

      toast.success('Ticket submitted successfully!');
      navigate('/tickets');
    } catch (err) {
      console.error('Ticket submit error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <div style={navStyle}>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f' }}>🎓 Smart Campus</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NotificationBell />
          <img
            src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=1e3a5f&color=fff`}
            alt="avatar" style={{ borderRadius: '50%', width: 36, height: 36 }} />
          <button onClick={logout} style={logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Hero */}
      <div style={heroBanner}>
        <button onClick={() => navigate(-1)} style={backBtn}><ArrowLeft size={16} /> Back</button>
        <h1 style={{ margin: '12px 0 4px', fontSize: 26, fontWeight: 700, color: 'white' }}>
          🔧 Submit Maintenance Ticket
        </h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
          Report an issue and our team will take care of it.
        </p>
      </div>

      <div style={{ maxWidth: 760, margin: '32px auto', padding: '0 24px 48px' }}>
        <div style={formCard}>

          <Field label="Ticket Subject *" error={errors.subject}>
            <input name="subject" value={form.subject} onChange={handleChange}
              placeholder="e.g. Projector not working in Room A101"
              style={{ ...inputStyle, borderColor: errors.subject ? '#ef4444' : '#e0e0e0' }} />
          </Field>

          {/* FIX #12 – Resource Type then filtered Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Resource Type (optional)">
              <select name="resourceType" value={form.resourceType} onChange={handleChange} style={inputStyle}>
                <option value="">-- All types --</option>
                {resourceTypes.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </Field>
            <Field label="Location (optional)">
              <select name="location" value={form.location} onChange={handleChange} style={inputStyle}>
                <option value="">-- Select location --</option>
                {filteredLocations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {form.resourceType && filteredLocations.length === 0 && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
                  No active locations for this resource type
                </p>
              )}
            </Field>
          </div>

          <Field label="Issue Category *" error={errors.category}>
            <select name="category" value={form.category} onChange={handleChange}
              style={{ ...inputStyle, borderColor: errors.category ? '#ef4444' : '#e0e0e0' }}>
              <option value="">-- Select category --</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>

          <Field label="Issue Description *" error={errors.description}>
            <textarea name="description" value={form.description} onChange={handleChange}
              rows={5} placeholder="Describe the issue in detail..."
              style={{ ...inputStyle, resize: 'vertical', borderColor: errors.description ? '#ef4444' : '#e0e0e0' }} />
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{form.description.length} / 2000</span>
          </Field>

          <Field label="Requested Priority *" error={errors.priority}>
            <div style={{ display: 'flex', gap: 12 }}>
              {PRIORITIES.map(p => (
                <label key={p.value} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${form.priority === p.value ? p.text : '#e0e0e0'}`,
                  background: form.priority === p.value ? p.color : 'white',
                  fontWeight: form.priority === p.value ? 700 : 400,
                  color: form.priority === p.value ? p.text : '#6b7280',
                  fontSize: 14, transition: 'all 0.15s',
                }}>
                  <input type="radio" name="priority" value={p.value}
                    checked={form.priority === p.value} onChange={handleChange}
                    style={{ display: 'none' }} />
                  {p.label}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Preferred Contact Number" error={errors.contactDetails}>
            <input name="contactDetails" value={form.contactDetails} onChange={handleChange}
              placeholder="e.g. +94 71 234 5678" type="tel"
              style={{ ...inputStyle, borderColor: errors.contactDetails ? '#ef4444' : '#e0e0e0' }} />
          </Field>

          <Field label="Evidence Photos (up to 3, max 5 MB each)">
            <div style={uploadZone}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleImageAdd({ target: { files: e.dataTransfer.files, value: '' } }); }}>
              <Upload size={24} color="#9ca3af" />
              <p style={{ margin: '8px 0 4px', color: '#6b7280', fontSize: 14 }}>
                Drag & drop photos here, or <span style={{ color: '#2563eb' }}>browse</span>
              </p>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>
                {images.length}/3 images selected
              </p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple
                style={{ display: 'none' }} onChange={handleImageAdd} />
            </div>
            {images.length > 0 && (
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                {images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img src={img.preview} alt={`preview-${idx}`}
                      style={{ width: 100, height: 100, objectFit: 'cover',
                        borderRadius: 10, border: '2px solid #e0e0e0' }} />
                    <button onClick={() => removeImage(idx)} style={removeImgBtn}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <div style={noteBox}>
            <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
              <strong>Note:</strong> Your priority is a "Requested Priority." Admin or assigned staff may adjust it.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => navigate(-1)} style={cancelBtn}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} style={submitBtn}>
              {submitting ? 'Submitting...' : '📤 Submit Ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  );
}

const navStyle = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 40px', background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.1)', position:'sticky', top:0, zIndex:30 };
const heroBanner = { background:'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)', padding:'32px 64px' };
const backBtn = { display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:13 };
const formCard = { background:'white', borderRadius:16, padding:32, boxShadow:'0 2px 12px rgba(0,0,0,0.08)' };
const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:8, border:'1.5px solid #e0e0e0', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' };
const uploadZone = { border:'2px dashed #cbd5e1', borderRadius:12, padding:'28px 20px', textAlign:'center', cursor:'pointer', background:'#f8fafc' };
const removeImgBtn = { position:'absolute', top:-6, right:-6, background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:22, height:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' };
const noteBox = { display:'flex', gap:10, alignItems:'flex-start', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'12px 16px', marginBottom:20 };
const submitBtn = { padding:'10px 28px', background:'#1e3a5f', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 };
const cancelBtn = { padding:'10px 20px', background:'white', color:'#6b7280', border:'1.5px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:14 };
const logoutBtn = { padding:'6px 14px', background:'#1e3a5f', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:13 };