import { useState, useEffect } from 'react';
import { resourceApi } from '../api/resourceApi';
import { StatusBadge, TypeBadge } from './ResourceCard';

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAYS_LONG  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getMonday = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const fmtDate = (d) => d.toISOString().split('T')[0];

const ResourceAvailabilityModal = ({ resource, onClose }) => {
  const [weekStart, setWeekStart] = useState(() => fmtDate(getMonday()));
  const [avData, setAvData]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // index 0-6

  useEffect(() => {
    if (!resource) return;
    setLoading(true);
    setError(null);
    setSelectedDay(null);
    resourceApi.getAvailability(resource.id, weekStart)
      .then(d => { setAvData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [resource, weekStart]);

  if (!resource) return null;

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(fmtDate(d));
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(fmtDate(d));
  };

  const today = fmtDate(new Date());

  const days = avData?.days || [];

  const daySlots = selectedDay !== null ? days[selectedDay] : null;

  const TYPE_ICONS = { LECTURE_HALL: '🏛️', LAB: '🔬', MEETING_ROOM: '🤝', EQUIPMENT: '🔧' };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 720, width: '95%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {TYPE_ICONS[resource.type]} {resource.name}
            </h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <TypeBadge type={resource.type} />
              <StatusBadge status={resource.status} />
              {resource.location && (
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', alignSelf: 'center' }}>
                  📍 {resource.location}
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>

        <div className="modal-body">
          {/* Availability window info */}
          {resource.availabilityWindows && (
            <div style={{
              background: 'var(--forest-pale)',
              border: '1px solid var(--forest-soft)',
              borderRadius: 'var(--radius-sm)',
              padding: '9px 14px',
              fontSize: 13,
              color: 'var(--forest-mid)',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              🕐 <strong>Scheduled hours:</strong> {resource.availabilityWindows}
              {resource.capacity && <span style={{ marginLeft: 8 }}>· 👥 Capacity: <strong>{resource.capacity}</strong></span>}
            </div>
          )}

          {/* Week navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button className="btn btn-secondary btn-sm" onClick={prevWeek}>← Prev Week</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--forest)' }}>
                {new Date(weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                {' – '}
                {(() => { const e = new Date(weekStart); e.setDate(e.getDate() + 6); return e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); })()}
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={nextWeek}>Next Week →</button>
          </div>

          {loading && <div className="spinner" />}
          {error && (
            <div style={{ color: 'var(--terracotta)', background: 'var(--terracotta-pale)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          {/* 7-day week grid */}
          {!loading && days.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              marginBottom: 20,
            }}>
              {days.map((day, i) => {
                const isToday   = day.date === today;
                const isSelected = selectedDay === i;
                const avail     = resource.status === 'ACTIVE' && day.available;
                const slotCount = day.slots?.length || 0;

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDay(isSelected ? null : i)}
                    style={{
                      background: isSelected
                        ? 'var(--forest)'
                        : avail
                          ? 'var(--forest-soft)'
                          : 'var(--terracotta-pale)',
                      border: isToday
                        ? '2px solid var(--forest)'
                        : `1px solid ${avail ? 'var(--forest-soft)' : '#e8c4b8'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 4px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                      transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginBottom: 3 }}>
                      {DAYS_SHORT[i]}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: isSelected ? '#fff' : isToday ? 'var(--forest)' : 'var(--text-dark)', marginBottom: 3 }}>
                      {new Date(day.date).getUTCDate()}
                    </div>
                    <div style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.85)' : avail ? 'var(--forest-mid)' : 'var(--terracotta)', fontWeight: 600 }}>
                      {resource.status !== 'ACTIVE' ? resource.status.replace('_', ' ') : avail ? `${slotCount} slots` : 'Closed'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { color: 'var(--forest-soft)', border: 'var(--forest-soft)', label: 'Available' },
              { color: 'var(--terracotta-pale)', border: '#e8c4b8', label: 'Unavailable / Closed' },
              { color: 'var(--forest)', border: 'var(--forest)', label: 'Selected', textColor: '#fff' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: l.color, border: `1px solid ${l.border}` }} />
                <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Slot detail for selected day */}
          {daySlots && (
            <div style={{
              background: '#fff',
              border: '1px solid var(--ivory-border)',
              borderRadius: 'var(--radius-md)',
              padding: 20,
              marginBottom: 4,
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--forest)', marginBottom: 12 }}>
                {DAYS_LONG[selectedDay]} – {new Date(daySlots.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>

              {!daySlots.available || resource.status !== 'ACTIVE' ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '12px 0' }}>
                  {resource.status === 'UNDER_MAINTENANCE'
                    ? '🔧 This resource is currently under maintenance.'
                    : resource.status === 'OUT_OF_SERVICE'
                      ? '⛔ This resource is out of service.'
                      : '📅 This resource is not available on this day.'}
                </div>
              ) : daySlots.slots?.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No time slots available for this day.</div>
              ) : (
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Open {daySlots.openTime} – {daySlots.closeTime} · {daySlots.slots.length} time slots
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: 8,
                  }}>
                    {daySlots.slots.map((slot, si) => (
                      <div key={si} style={{
                        background: 'var(--forest-soft)',
                        border: '1px solid var(--forest-soft)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest-mid)' }}>
                          {slot.start} – {slot.end}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--forest-light)', marginTop: 3 }}>Available</div>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: 8, width: '100%', fontSize: 11.5, padding: '5px 8px' }}
                          onClick={() => alert(`Booking for ${resource.name} on ${daySlots.date} at ${slot.start}–${slot.end} will be available soon!`)}
                        >
                          Book
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!daySlots && !loading && days.length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
              Click a day above to see available time slots
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceAvailabilityModal;
