import { useState, useRef, useEffect } from 'react';
import { resourceApi } from '../api/resourceApi';
import ResourceDetailModal from './ResourceDetailModal';
import AvailabilityCalendar from './AvailabilityCalendar';

const QRScanner = () => {
  const [mode, setMode] = useState('manual'); // 'manual' | 'camera'
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const lookup = async (code) => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await resourceApi.getByQrCode(code.trim());
      setResult(res);
    } catch (e) {
      setError(e.message || 'Resource not found for this QR code.');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setMode('camera');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      setError('Camera access denied. Please use manual entry.');
      setMode('manual');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setMode('manual');
  };

  useEffect(() => () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }, []);

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { stopCamera(); setMode('manual'); setResult(null); setError(null); }}
        >📝 Manual Entry</button>
        <button
          className={`btn ${mode === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={startCamera}
        >📷 Camera Scan</button>
      </div>

      {mode === 'manual' && (
        <div className="qr-area">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔲</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--forest)', marginBottom: 8 }}>
            Enter QR Code
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
            Scan the QR code on the resource and enter the code below
          </p>
          <div style={{ display: 'flex', gap: 10, maxWidth: 400, margin: '0 auto' }}>
            <input
              className="form-input"
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              placeholder="e.g. QR-LAB-001"
              onKeyDown={e => e.key === 'Enter' && lookup(qrInput)}
            />
            <button className="btn btn-primary" onClick={() => lookup(qrInput)} disabled={loading || !qrInput.trim()}>
              {loading ? '…' : 'Lookup'}
            </button>
          </div>
        </div>
      )}

      {mode === 'camera' && (
        <div style={{ textAlign: 'center' }}>
          <div className="qr-scanner-box" style={{ margin: '0 auto 16px' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="qr-scan-line" />
            <div className="qr-corner tl" /><div className="qr-corner tr" />
            <div className="qr-corner bl" /><div className="qr-corner br" />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Position the QR code within the frame. For demo, enter the code below:
          </p>
          <div style={{ display: 'flex', gap: 10, maxWidth: 360, margin: '0 auto 16px' }}>
            <input className="form-input" value={qrInput} onChange={e => setQrInput(e.target.value)}
              placeholder="QR Code value" onKeyDown={e => e.key === 'Enter' && lookup(qrInput)} />
            <button className="btn btn-primary" onClick={() => lookup(qrInput)} disabled={loading || !qrInput.trim()}>Go</button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={stopCamera}>Stop Camera</button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, padding: '14px 18px', background: 'var(--terracotta-pale)', borderRadius: 'var(--radius-md)', color: 'var(--terracotta)', fontSize: 14 }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--forest-mid)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--forest)' }}>
              Resource Found
            </span>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--forest)', marginBottom: 6 }}>{result.name}</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className={`badge ${result.status}`}>{result.status.replace('_', ' ')}</span>
                  <span className="badge type">{result.type.replace('_', ' ')}</span>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCalendar(!showCalendar)}>
                {showCalendar ? '📋 Details' : '📅 Availability'}
              </button>
            </div>

            {!showCalendar && (
              <div className="detail-grid">
                <div><div className="detail-label">Location</div><div className="detail-value">{result.location}</div></div>
                {result.building && <div><div className="detail-label">Building</div><div className="detail-value">{result.building}</div></div>}
                {result.floor && <div><div className="detail-label">Floor</div><div className="detail-value">{result.floor}</div></div>}
                {result.capacity && <div><div className="detail-label">Capacity</div><div className="detail-value">{result.capacity}</div></div>}
                {result.availabilityWindows && <div><div className="detail-label">Hours</div><div className="detail-value">{result.availabilityWindows}</div></div>}
                <div><div className="detail-label">QR Code</div><div className="detail-value" style={{ fontFamily: 'monospace', fontSize: 13 }}>{result.qrCode}</div></div>
              </div>
            )}

            {showCalendar && (
              <AvailabilityCalendar
                resourceId={result.id}
                resourceName={result.name}
                availabilityWindows={result.availabilityWindows}
                resourceStatus={result.status}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
