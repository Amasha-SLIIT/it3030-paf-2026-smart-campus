// FIX #13 – QR code was using VITE_API_URL.replace() which throws if the env var is undefined.
// Also the QR scan URL now correctly points to the frontend resource page, not the backend API.
// Added safe fallback for missing env vars.

import { useState } from 'react';
import { StatusBadge, TypeBadge } from './ResourceCard';

const QR_API = (value, size = 220) =>
  `https://api.qrserver.com/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=10`;

const QRCodeDisplay = ({ resource, onClose }) => {
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrError,  setQrError]  = useState(false);

  if (!resource) return null;

  // FIX #13: safe env var access — fall back to localhost if not set
  const frontendBase = (import.meta.env?.VITE_APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  // Link to frontend resource detail/QR scan page
  const resourceUrl = `${frontendBase}/resource?qr=${resource.qrCode}`;
  const qrSrc = QR_API(resourceUrl);

  const isLocalhost = resourceUrl.includes('localhost') || resourceUrl.includes('127.0.0.1');

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={header}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#1e3a5f' }}>Resource QR Code</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              Scan with a phone camera to view details
            </p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', textAlign: 'center' }}>
          {/* Resource info */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#1e3a5f' }}>{resource.name}</h3>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <TypeBadge   type={resource.type}     />
              <StatusBadge status={resource.status} />
            </div>
          </div>

          {/* Localhost warning */}
          {isLocalhost && (
            <div style={warnBox}>
              ⚠️ QR encodes <strong>localhost</strong> — phones on other devices can't reach it.
              Set <code>VITE_APP_BASE_URL=http://&lt;your-LAN-IP&gt;:5173</code> in your <code>.env</code> and restart.
            </div>
          )}

          {/* QR image */}
          <div style={qrBox}>
            {!qrLoaded && !qrError && (
              <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Loading QR…
              </div>
            )}
            {qrError && (
              <div style={{ width: 220, height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af' }}>
                <span style={{ fontSize: 36 }}>📵</span>
                <span style={{ fontSize: 13 }}>QR unavailable (offline?)</span>
              </div>
            )}
            <img
              src={qrSrc}
              alt={`QR – ${resource.name}`}
              style={{ width: 220, height: 220, display: qrLoaded ? 'block' : 'none', borderRadius: 4 }}
              onLoad={() => setQrLoaded(true)}
              onError={() => setQrError(true)}
            />
          </div>

          {/* UUID text for manual entry */}
          <div style={codeText}>{resource.qrCode}</div>

          {/* Location */}
          <div style={locationBox}>
            📍 {resource.location}
            {resource.building && ` · ${resource.building}`}
            {resource.floor    && `, Floor ${resource.floor}`}
            {resource.capacity && <span style={{ marginLeft: 12 }}>👥 {resource.capacity}</span>}
          </div>

          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            Point your phone camera at the QR code. It opens the resource booking page directly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;

const backdrop    = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 };
const modal       = { background:'white', borderRadius:16, width:'95%', maxWidth:460, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' };
const header      = { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'20px 24px', borderBottom:'1.5px solid #f3f4f6' };
const closeBtn    = { background:'none', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:16, color:'#6b7280' };
const warnBox     = { background:'#fff8e1', border:'1px solid #ffe082', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#7a5f00', marginBottom:16, textAlign:'left' };
const qrBox       = { display:'inline-block', padding:16, background:'#f9f9f9', borderRadius:12, border:'2px solid #e5e7eb', marginBottom:14 };
const codeText    = { fontFamily:'monospace', fontSize:11, color:'#9ca3af', background:'#f3f4f6', borderRadius:6, padding:'6px 12px', display:'inline-block', marginBottom:16, wordBreak:'break-all', maxWidth:'100%' };
const locationBox = { background:'#eff6ff', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#1e40af', marginBottom:16, textAlign:'left' };