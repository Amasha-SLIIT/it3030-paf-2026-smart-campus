// src/pages/ResourceScanPage.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resourceApi } from '../api/resourceApi';
import { StatusBadge, TypeBadge } from '../components/ResourceCard';
import ResourceAvailabilityModal from '../components/ResourceAvailabilityModal';

export default function ResourceScanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qrCode = searchParams.get('qr');

  const [resource, setResource] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [showAvail, setShowAvail] = useState(false);

  useEffect(() => {
    if (!qrCode) {
      setError('No QR code found in URL.');
      setLoading(false);
      return;
    }
    resourceApi.getByQrCode(qrCode)
      .then(data => setResource(data))
      .catch(() => setError('Resource not found for this QR code.'))
      .finally(() => setLoading(false));
  }, [qrCode]);

  if (loading) return (
    <div style={centered}>
      <div style={spinner} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#6b7280', marginTop: 16 }}>Looking up resource…</p>
    </div>
  );

  if (error) return (
    <div style={centered}>
      <span style={{ fontSize: 48 }}>❌</span>
      <p style={{ color: '#dc2626', marginTop: 12 }}>{error}</p>
      <button onClick={() => navigate('/dashboard')} style={backBtn}>← Go to Dashboard</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <button onClick={() => navigate('/dashboard')} style={backBtn}>← Dashboard</button>

      <div style={card}>
        {/* Header */}
        <div style={cardHeader}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'white' }}>
            {resource.name}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            Scanned via QR Code
          </p>
        </div>

        <div style={{ padding: 24 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <TypeBadge type={resource.type} />
            <StatusBadge status={resource.status} />
          </div>

          {/* Image */}
          {resource.imageUrl && (
            <img src={resource.imageUrl} alt={resource.name}
              style={{ width: '100%', maxHeight: 220, objectFit: 'cover',
                borderRadius: 10, marginBottom: 20, border: '1px solid #e5e7eb' }} />
          )}

          {/* Details grid */}
          <div style={detailGrid}>
            <Detail label="📍 Location"    value={resource.location} />
            <Detail label="🏛️ Building"    value={resource.building} />
            <Detail label="🔢 Floor"        value={resource.floor} />
            <Detail label="👥 Capacity"     value={resource.capacity} />
            <Detail label="🕐 Available"    value={resource.availabilityWindows} />
            <Detail label="📊 Status"       value={resource.status?.replace(/_/g, ' ')} />
          </div>

          {resource.description && (
            <div style={{ marginTop: 16, padding: 14, background: '#f8fafc',
              borderRadius: 8, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
              {resource.description}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <button onClick={() => setShowAvail(true)} style={primaryBtn}>
              📅 Check Availability
            </button>
            <button onClick={() => navigate('/booking', {
              state: { preSelected: { resource } }
            })} style={secondaryBtn}>
              📋 Book This Resource
            </button>
          </div>
        </div>
      </div>

      {showAvail && (
        <ResourceAvailabilityModal
          resource={resource}
          onClose={() => setShowAvail(false)}
        />
      )}
    </div>
  );
}

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const centered    = { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 };
const spinner     = { width:36, height:36, border:'3px solid #e0e0e0', borderTop:'3px solid #1e3a5f', borderRadius:'50%', animation:'spin 0.8s linear infinite' };
const card        = { background:'white', borderRadius:16, boxShadow:'0 4px 20px rgba(0,0,0,0.1)', maxWidth:600, margin:'16px auto', overflow:'hidden' };
const cardHeader  = { background:'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)', padding:'24px' };
const detailGrid  = { display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16 };
const backBtn     = { display:'inline-flex', alignItems:'center', gap:6, background:'white', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, color:'#374151', marginBottom:16 };
const primaryBtn  = { padding:'10px 20px', background:'#1e3a5f', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 };
const secondaryBtn = { padding:'10px 20px', background:'white', color:'#1e3a5f', border:'1.5px solid #1e3a5f', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 };