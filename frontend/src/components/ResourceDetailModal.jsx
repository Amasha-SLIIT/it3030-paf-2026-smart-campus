import { StatusBadge, TypeBadge } from './ResourceCard';

const DetailRow = ({ label, value }) =>
  value != null && value !== '' ? (
    <div>
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  ) : null;

const ResourceDetailModal = ({ resource, onClose, extraActions }) => {
  if (!resource) return null;
  const imgSrc = resource.imageUrl ? `http://localhost:8080${resource.imageUrl}` : null;

  const fmt = (dt) => dt ? new Date(dt).toLocaleString() : '—';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{resource.name}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <TypeBadge type={resource.type} />
              <StatusBadge status={resource.status} />
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          {imgSrc ? (
            <img src={imgSrc} alt={resource.name}
              style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 20 }} />
          ) : (
            <div className="img-placeholder" style={{ marginBottom: 20 }}>
              <span className="img-placeholder-icon">📷</span>
              <span>No image uploaded</span>
            </div>
          )}

          <div className="detail-grid" style={{ marginBottom: 16 }}>
            <DetailRow label="Location" value={resource.location} />
            <DetailRow label="Building" value={resource.building} />
            <DetailRow label="Floor" value={resource.floor} />
            <DetailRow label="Capacity" value={resource.capacity} />
            <DetailRow label="Availability" value={resource.availabilityWindows} />
            <DetailRow label="QR Code" value={resource.qrCode} />
            <DetailRow label="Usage Count" value={resource.usageCount} />
            <DetailRow label="Maintenance Interval" value={resource.maintenanceIntervalDays ? `Every ${resource.maintenanceIntervalDays} days` : null} />
            <DetailRow label="Last Maintenance" value={fmt(resource.lastMaintenanceDate)} />
            <DetailRow label="Created" value={fmt(resource.createdAt)} />
            <DetailRow label="Updated" value={fmt(resource.updatedAt)} />
          </div>

          {resource.description && (
            <div style={{ marginBottom: 16 }}>
              <div className="detail-label" style={{ marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>{resource.description}</div>
            </div>
          )}

          {extraActions && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid var(--ivory-border)' }}>
              {extraActions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceDetailModal;