import { useState, useEffect } from 'react';
import { resourceApi } from '../api/resourceApi';
import { useApp } from '../context/AppContext';
import SearchFilterBar from '../components/SearchFilterBar';
import ResourceCard from '../components/ResourceCard';
import ResourceAvailabilityModal from '../components/ResourceAvailabilityModal';
import QRCodeDisplay from '../components/QRCodeDisplay';

const UserPage = () => {
  const { showToast } = useApp();
  const [resources, setResources]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [availResource, setAvailResource] = useState(null); // opens availability modal
  const [qrResource, setQrResource]       = useState(null); // opens QR modal

  const fetchResources = async (filters = {}) => {
    setLoading(true);
    try {
      const data = await resourceApi.getAll(filters);
      setResources(data);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResources(); }, []);

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--forest) 0%, var(--forest-mid) 60%, var(--forest-light) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px 36px',
        marginBottom: 28,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', right: 40, bottom: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, marginBottom: 8, color: '#fff' }}>
          Campus Resources
        </h1>
        <p style={{ fontSize: 15, opacity: 0.85, maxWidth: 500 }}>
          Find lecture rooms, labs, and equipment across campus. Check availability to book resources. Scan QR code to view details on the go.
        </p>
      </div>

      {/* Search + Filter */}
      <div style={{ marginBottom: 24 }}>
        <SearchFilterBar onSearch={fetchResources} loading={loading} />
      </div>

      {/* Results count */}
      {!loading && resources.length > 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Showing {resources.length} resource{resources.length !== 1 ? 's' : ''}
        </div>
      )}

      {loading && <div className="spinner" />}

      {!loading && resources.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">No resources found</div>
          <div className="empty-state-sub">Try adjusting your search filters</div>
        </div>
      )}

      {/* Resource cards */}
      {!loading && (
        <div className="resource-grid">
          {resources.map(r => (
            <ResourceCard
              key={r.id}
              resource={r}
              onSelect={setAvailResource}
              actions={(resource) => (
                <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setAvailResource(resource)}
                  >
                    📅 Availability
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setQrResource(resource)}
                  >
                    🔲 QR Code
                  </button>
                </div>
              )}
            />
          ))}
        </div>
      )}

      {/* Availability Modal */}
      {availResource && (
        <ResourceAvailabilityModal
          resource={availResource}
          onClose={() => setAvailResource(null)}
        />
      )}

      {/* QR Code Modal */}
      {qrResource && (
        <QRCodeDisplay
          resource={qrResource}
          onClose={() => setQrResource(null)}
        />
      )}
    </div>
  );
};

export default UserPage;
