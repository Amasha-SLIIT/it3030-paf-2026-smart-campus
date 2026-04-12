import { useState } from 'react';

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

export const StatusBadge = ({ status }) => {
  const labels = { ACTIVE: 'Active', UNDER_MAINTENANCE: 'Maintenance', OUT_OF_SERVICE: 'Out of Service' };
  const dots   = { ACTIVE: '●', UNDER_MAINTENANCE: '◆', OUT_OF_SERVICE: '✕' };
  return (
    <span className={`badge ${status}`}>
      {dots[status]} {labels[status]}
    </span>
  );
};

export const TypeBadge = ({ type }) => (
  <span className="badge type">{TYPE_ICONS[type]} {TYPE_LABELS[type] || type}</span>
);

const ResourceCard = ({ resource, onSelect, actions }) => {
  const imgSrc = resource.imageUrl
    ? `http://localhost:8080${resource.imageUrl}`
    : null;

  return (
    <div className="resource-card" onClick={() => onSelect && onSelect(resource)}>
      <div className="resource-card-img">
        {imgSrc
          ? <img src={imgSrc} alt={resource.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 40 }}>{TYPE_ICONS[resource.type] || '📦'}</span>
        }
      </div>
      <div className="resource-card-body">
        <div className="resource-card-name">{resource.name}</div>
        <div className="resource-card-meta">
          <TypeBadge type={resource.type} />
          <StatusBadge status={resource.status} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
          📍 {resource.location}
          {resource.building && ` · ${resource.building}`}
          {resource.floor && `, Floor ${resource.floor}`}
        </div>
        {resource.capacity && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            👥 Capacity: {resource.capacity}
          </div>
        )}
        {resource.description && (
          <div style={{
            fontSize: 12.5,
            color: 'var(--text-muted)',
            marginTop: 6,
            marginBottom: 4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
          }}>
            {resource.description}
          </div>
        )}
        {actions && (
          <div className="resource-card-footer" onClick={e => e.stopPropagation()}>
            {actions(resource)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceCard;
