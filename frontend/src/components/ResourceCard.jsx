// FIX #2 – ResourceCard now uses resolveImageUrl so relative paths work in both
// user view and admin view.

import { resolveImageUrl } from '../api/resourceApi';

const TYPE_ICONS = {
  LECTURE_HALL: '🏛️',
  LAB: '🔬',
  MEETING_ROOM: '🤝',
  EQUIPMENT: '🔧',
};

const TYPE_LABELS = {
  LECTURE_HALL: 'Lecture Hall',
  LAB: 'Laboratory',
  MEETING_ROOM: 'Meeting Room',
  EQUIPMENT: 'Equipment',
};

const STATUS_STYLE = {
  ACTIVE:            { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  UNDER_MAINTENANCE: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  OUT_OF_SERVICE:    { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

export function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.ACTIVE;
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export function TypeBadge({ type }) {
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
    }}>
      {TYPE_ICONS[type]} {TYPE_LABELS[type] || type}
    </span>
  );
}

const ResourceCard = ({ resource, onSelect, actions }) => {
  // FIX #2: resolve relative image URLs
  const imgSrc = resolveImageUrl(resource.imageUrl);

  return (
    <div
      onClick={() => onSelect && onSelect(resource)}
      style={{
        background: 'white', borderRadius: 14,
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        border: '1.5px solid #f0f0f0',
        overflow: 'hidden', cursor: onSelect ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; }}
    >
      {/* Image */}
      <div style={{ height: 140, background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={resource.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        {/* Fallback shown when image missing or errors */}
        <div style={{
          display: imgSrc ? 'none' : 'flex',
          width: '100%', height: '100%',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 40, background: '#f1f5f9',
        }}>
          {TYPE_ICONS[resource.type] || '🏢'}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
            {resource.name}
          </h3>
          <StatusBadge status={resource.status} />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <TypeBadge type={resource.type} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {resource.location && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>📍 {resource.location}</span>
          )}
          {resource.capacity && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>👥 Capacity: {resource.capacity}</span>
          )}
          {resource.availabilityWindows && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>🕐 {resource.availabilityWindows}</span>
          )}
        </div>

        {/* Action slot */}
        {actions && (
          <div style={{ marginTop: 'auto', paddingTop: 12 }} onClick={e => e.stopPropagation()}>
            {typeof actions === 'function' ? actions(resource) : actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceCard;